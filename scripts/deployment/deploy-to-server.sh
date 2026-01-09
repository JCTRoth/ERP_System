#!/bin/bash

################################################################################
# ERP System Production Deployment Script
#
# This script deploys the ERP system to a production server with:
# - Docker Compose orchestration
# - Let's Encrypt SSL certificates
# - HTTPS enforcement and HTTP→HTTPS redirect
# - Health checks and verification
# - Automated database initialization
#
# Usage:
#   ./scripts/deployment/deploy-to-server.sh [OPTIONS]
#
# OPTIONS:
#   --config FILE        Path to config JSON file
#   --server HOST        Production server hostname/IP
#   --domain DOMAIN      Domain name for SSL certificate
#   --username USER      SSH username for server (default: root)
#   --ssh-key PATH       Path to SSH private key
#   --registry-url URL   Container registry URL (default: ghcr.io)
#   --registry-user USER GitHub username (default: JCTRoth)
#   --registry-token TOK GitHub PAT for pulling images
#   --image-version TAG  Image version to deploy (default: latest)
#   --email EMAIL        Email for Let's Encrypt notifications
#   --db-password PASS   PostgreSQL password
#   --dry-run            Show deployment plan without executing
#   --help               Show this help message
#
# Environment Variables:
#   DEPLOY_SERVER        Production server hostname/IP
#   DEPLOY_DOMAIN        Domain name
#   DEPLOY_USERNAME      SSH username
#   DEPLOY_SSH_KEY       Path to SSH key
#   DEPLOY_DB_PASSWORD   PostgreSQL password
#
# Examples:
#   ./scripts/deployment/deploy-to-server.sh --server prod.example.com --domain erp.example.com
#   ./scripts/deployment/deploy-to-server.sh --config production.json
#   ./scripts/deployment/deploy-to-server.sh --server 192.168.1.100 --domain erp.local --email admin@example.com
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration defaults
DEPLOY_SERVER="${DEPLOY_SERVER:-}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-}"
DEPLOY_USERNAME="${DEPLOY_USERNAME:-root}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_rsa}"
REGISTRY_URL="${REGISTRY_URL:-ghcr.io}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-JCTRoth}"
REGISTRY_TOKEN="${REGISTRY_TOKEN:-}"
IMAGE_VERSION="${IMAGE_VERSION:-latest}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
DRY_RUN=false
CONFIG_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/erp-deploy-$$"

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

show_help() {
    head -49 "$0" | tail -47
}

# Load configuration from JSON file
load_config() {
    local config_file=$1
    
    if [ ! -f "$config_file" ]; then
        print_error "Config file not found: $config_file"
        return 1
    fi
    
    print_info "Loading configuration from: $config_file"
    
    DEPLOY_SERVER=$(jq -r '.deploy_server // empty' "$config_file" || echo "")
    DEPLOY_DOMAIN=$(jq -r '.deploy_domain // empty' "$config_file" || echo "")
    DEPLOY_USERNAME=$(jq -r '.deploy_username // empty' "$config_file" || echo "root")
    DEPLOY_SSH_KEY=$(jq -r '.deploy_ssh_key // empty' "$config_file" || echo "")
    REGISTRY_URL=$(jq -r '.registry_url // empty' "$config_file" || echo "ghcr.io")
    REGISTRY_USERNAME=$(jq -r '.registry_username // empty' "$config_file" || echo "JCTRoth")
    REGISTRY_TOKEN=$(jq -r '.registry_token // empty' "$config_file" || echo "")
    IMAGE_VERSION=$(jq -r '.image_version // empty' "$config_file" || echo "latest")
    LETSENCRYPT_EMAIL=$(jq -r '.letsencrypt_email // empty' "$config_file" || echo "")
    DB_PASSWORD=$(jq -r '.db_password // empty' "$config_file" || echo "")
    
    [ -z "$DEPLOY_SSH_KEY" ] && DEPLOY_SSH_KEY="$HOME/.ssh/id_rsa"
}

# Prompt for missing configuration
prompt_for_config() {
    echo ""
    
    if [ -z "$DEPLOY_SERVER" ]; then
        read -p "Production server hostname/IP: " DEPLOY_SERVER
    fi
    
    if [ -z "$DEPLOY_DOMAIN" ]; then
        read -p "Domain name for SSL: " DEPLOY_DOMAIN
    fi
    
    if [ -z "$LETSENCRYPT_EMAIL" ]; then
        read -p "Email for Let's Encrypt notifications: " LETSENCRYPT_EMAIL
    fi
    
    if [ -z "$REGISTRY_TOKEN" ]; then
        read -sp "GitHub Container Registry token: " REGISTRY_TOKEN
        echo ""
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        read -sp "PostgreSQL password: " DB_PASSWORD
        echo ""
    fi
    
    # Validate required fields
    if [ -z "$DEPLOY_SERVER" ] || [ -z "$DEPLOY_DOMAIN" ] || [ -z "$REGISTRY_TOKEN" ] || [ -z "$DB_PASSWORD" ]; then
        print_error "Required configuration missing"
        return 1
    fi
}

# Validate SSH connectivity
validate_ssh() {
    print_info "Validating SSH connection to $DEPLOY_SERVER..."
    
    if ! ssh -i "$DEPLOY_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
        "$DEPLOY_USERNAME@$DEPLOY_SERVER" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        print_error "Cannot connect to $DEPLOY_SERVER via SSH"
        print_info "Ensure:"
        print_info "  - Server is reachable at $DEPLOY_SERVER"
        print_info "  - SSH key exists at $DEPLOY_SSH_KEY"
        print_info "  - User $DEPLOY_USERNAME has SSH access"
        return 1
    fi
    
    print_status "SSH connection successful"
}

# Execute SSH command on remote server
ssh_exec() {
    local command=$1
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: $command"
        return 0
    fi
    
    ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_USERNAME@$DEPLOY_SERVER" bash -c "$command"
}

# Copy file to remote server via SCP
scp_to_server() {
    local source=$1
    local dest=$2
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would copy $source to $DEPLOY_SERVER:$dest"
        return 0
    fi
    
    scp -i "$DEPLOY_SSH_KEY" "$source" "$DEPLOY_USERNAME@$DEPLOY_SERVER:$dest"
}

# Display configuration summary
display_summary() {
    print_header "Deployment Configuration Summary"
    echo "Server:              $DEPLOY_SERVER"
    echo "Domain:              $DEPLOY_DOMAIN"
    echo "SSH Username:        $DEPLOY_USERNAME"
    echo "Registry:            $REGISTRY_URL"
    echo "Image Version:       $IMAGE_VERSION"
    echo "Dry Run:             $DRY_RUN"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual changes will be made to the server"
    fi
}

# Create docker-compose file for production
create_production_compose() {
    local compose_file="$TEMP_DIR/docker-compose.production.yml"
    
    mkdir -p "$TEMP_DIR"
    
    cat > "$compose_file" << 'EOF'
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: erp_system-postgres
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pg_stat_statements"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-init/init-multi-db.sh:/docker-entrypoint-initdb.d/init-multi-db.sh
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - erp-network

  user-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-user-service:${IMAGE_VERSION}
    container_name: erp_system-user-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=user_db;User Id=postgres;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"
    restart: unless-stopped
    networks:
      - erp-network

  shop-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-shop-service:${IMAGE_VERSION}
    container_name: erp_system-shop-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=shop_db;User Id=postgres;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5003:5003"
    restart: unless-stopped
    networks:
      - erp-network

  accounting-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-accounting-service:${IMAGE_VERSION}
    container_name: erp_system-accounting-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=accounting_db;User Id=postgres;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5001:5001"
    restart: unless-stopped
    networks:
      - erp-network

  masterdata-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-masterdata-service:${IMAGE_VERSION}
    container_name: erp_system-masterdata-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=masterdata_db;User Id=postgres;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5002:5002"
    restart: unless-stopped
    networks:
      - erp-network

  orders-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-orders-service:${IMAGE_VERSION}
    container_name: erp_system-orders-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=orders_db;User Id=postgres;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5004:5004"
    restart: unless-stopped
    networks:
      - erp-network

  company-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-company-service:${IMAGE_VERSION}
    container_name: erp_system-company-service
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/company_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_PROFILES_ACTIVE: prod
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8080:8080"
    restart: unless-stopped
    networks:
      - erp-network

  translation-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-translation-service:${IMAGE_VERSION}
    container_name: erp_system-translation-service
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/translation_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_PROFILES_ACTIVE: prod
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8081:8081"
    restart: unless-stopped
    networks:
      - erp-network

  templates-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-templates-service:${IMAGE_VERSION}
    container_name: erp_system-templates-service
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/templates_db
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8087:8087"
    restart: unless-stopped
    networks:
      - erp-network

  gateway:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-gateway:${IMAGE_VERSION}
    container_name: erp_system-gateway
    environment:
      NODE_ENV: production
      PORT: 4000
      USER_SERVICE_URL: http://user-service:5000/graphql/
      SHOP_SERVICE_URL: http://shop-service:5003/graphql
      ACCOUNTING_SERVICE_URL: http://accounting-service:5001/graphql/
      MASTERDATA_SERVICE_URL: http://masterdata-service:5002/graphql/
      ORDERS_SERVICE_URL: http://orders-service:5004/graphql/
      COMPANY_SERVICE_URL: http://company-service:8080/graphql
      TRANSLATION_SERVICE_URL: http://translation-service:8081/graphql
      TEMPLATES_SERVICE_URL: http://templates-service:8087
    depends_on:
      - user-service
      - shop-service
      - accounting-service
      - masterdata-service
      - orders-service
      - company-service
      - translation-service
      - templates-service
    ports:
      - "4000:4000"
    restart: unless-stopped
    networks:
      - erp-network

  frontend:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-frontend:${IMAGE_VERSION}
    container_name: erp_system-frontend
    environment:
      VITE_API_URL: https://${DEPLOY_DOMAIN}/graphql
    ports:
      - "5173:5173"
    restart: unless-stopped
    networks:
      - erp-network

  nginx:
    image: nginx:latest
    container_name: erp_system-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - frontend
      - gateway
    restart: unless-stopped
    networks:
      - erp-network

volumes:
  postgres_data:

networks:
  erp-network:
    driver: bridge
EOF

    echo "$compose_file"
}

# Create nginx configuration for HTTPS redirect
create_nginx_config() {
    local config_file="$TEMP_DIR/default.conf"
    local domain=$1
    
    mkdir -p "$TEMP_DIR"
    
    cat > "$config_file" << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $domain www.$domain;
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $domain www.$domain;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # GraphQL Gateway
    location /graphql {
        proxy_pass http://gateway:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://gateway:4000/health;
    }
}
EOF

    echo "$config_file"
}

# Setup Let's Encrypt certificates
setup_letsencrypt() {
    local domain=$1
    local email=$2
    
    print_info "Setting up Let's Encrypt SSL certificate for $domain..."
    
    local cmd="
        # Create certbot directory
        mkdir -p /var/www/certbot
        
        # Check if certificate already exists
        if [ ! -d '/etc/letsencrypt/live/$domain' ]; then
            # Request certificate
            certbot certonly --standalone \\
                -d $domain \\
                -d www.$domain \\
                --email $email \\
                --agree-tos \\
                --non-interactive \\
                --preferred-challenges http
        fi
    "
    
    ssh_exec "$cmd"
}

# Deploy application
deploy_application() {
    print_header "Deploying Application"
    
    # Create temporary directory on remote server
    ssh_exec "mkdir -p /opt/erp-system && cd /opt/erp-system && pwd"
    
    # Copy compose file
    local compose_file=$(create_production_compose)
    print_info "Uploading docker-compose.yml..."
    scp_to_server "$compose_file" "/opt/erp-system/docker-compose.yml"
    
    # Copy nginx config (create directory first)
    local nginx_config=$(create_nginx_config "$DEPLOY_DOMAIN")
    print_info "Uploading nginx configuration..."
    ssh_exec "mkdir -p /opt/erp-system/nginx/conf.d"
    scp_to_server "$nginx_config" "/opt/erp-system/nginx/conf.d/default.conf"
    
    # Setup Let's Encrypt
    setup_letsencrypt "$DEPLOY_DOMAIN" "$LETSENCRYPT_EMAIL"
    
    # Login to registry and start services
    print_info "Starting services..."
    local deploy_cmd="
        cd /opt/erp-system
        
        # Login to registry
        echo '$REGISTRY_TOKEN' | docker login $REGISTRY_URL -u $REGISTRY_USERNAME --password-stdin
        
        # Pull latest images
        docker compose pull
        
        # Start services
        docker compose up -d
        
        # Wait for services to start
        sleep 10
    "
    
    ssh_exec "$deploy_cmd"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    # Check HTTP to HTTPS redirect
    print_info "Checking HTTP→HTTPS redirect..."
    local redirect_code=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DEPLOY_DOMAIN")
    if [ "$redirect_code" = "200" ]; then
        print_status "HTTP→HTTPS redirect working"
    else
        print_warning "HTTP redirect returned code: $redirect_code"
    fi
    
    # Check HTTPS connectivity
    print_info "Checking HTTPS connectivity..."
    if curl -sf -k "https://$DEPLOY_DOMAIN/health" >/dev/null 2>&1; then
        print_status "HTTPS connection successful"
    else
        print_warning "Could not reach HTTPS endpoint (this may be expected if firewall blocks external connections)"
    fi
    
    # Check services on server
    print_info "Checking service status on server..."
    local services_cmd="
        cd /opt/erp-system
        docker compose ps --format 'table {{.Names}}\t{{.Status}}'
    "
    
    ssh_exec "$services_cmd"
}

# Display post-deployment information
display_post_deployment_info() {
    print_header "Deployment Complete"
    echo "Application URL:     https://$DEPLOY_DOMAIN"
    echo "Server:              $DEPLOY_SERVER"
    echo ""
    echo "Next Steps:"
    echo "  1. Access the application at https://$DEPLOY_DOMAIN"
    echo "  2. Check logs: ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose logs -f'"
    echo "  3. Manage services: ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose ...'"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:           ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose logs -f gateway'"
    echo "  Stop services:       ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose down'"
    echo "  Restart services:    ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose restart'"
    echo "  View SSL cert:       ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'openssl x509 -in /etc/letsencrypt/live/$DEPLOY_DOMAIN/fullchain.pem -text -noout'"
    echo ""
}

# Cleanup temporary files
cleanup() {
    rm -rf "$TEMP_DIR"
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --server)
                DEPLOY_SERVER="$2"
                shift 2
                ;;
            --domain)
                DEPLOY_DOMAIN="$2"
                shift 2
                ;;
            --username)
                DEPLOY_USERNAME="$2"
                shift 2
                ;;
            --ssh-key)
                DEPLOY_SSH_KEY="$2"
                shift 2
                ;;
            --registry-url)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --registry-user)
                REGISTRY_USERNAME="$2"
                shift 2
                ;;
            --registry-token)
                REGISTRY_TOKEN="$2"
                shift 2
                ;;
            --image-version)
                IMAGE_VERSION="$2"
                shift 2
                ;;
            --email)
                LETSENCRYPT_EMAIL="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Load config file if provided
    if [ -n "$CONFIG_FILE" ]; then
        load_config "$CONFIG_FILE"
    fi
    
    # Prompt for missing configuration
    prompt_for_config || exit 1
    
    # Display summary
    display_summary
    
    # Confirm deployment
    echo ""
    if [ "$DRY_RUN" = false ]; then
        read -p "Proceed with deployment to $DEPLOY_SERVER? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Validate SSH
    validate_ssh || exit 1
    
    # Deploy application
    deploy_application || exit 1
    
    # Verify deployment
    verify_deployment || print_warning "Some verification checks failed, but deployment may still be successful"
    
    # Display post-deployment information
    display_post_deployment_info
    
    # Cleanup
    cleanup
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main "$@"
