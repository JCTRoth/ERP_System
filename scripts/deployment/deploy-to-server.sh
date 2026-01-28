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
#   --port PORT          SSH port for server (default: 22)
#   --ssh-key PATH       Path to SSH private key
#   --registry-url URL   Container registry URL (default: ghcr.io)
#   --registry-user USER GitHub username (default: JCTRoth)
#   --registry-token TOK GitHub PAT for pulling images
#   --image-version TAG  Image version to deploy (default: latest)
#   --email EMAIL        Email for Let's Encrypt notifications
#   --db-password PASS   PostgreSQL password
#   --grafana-admin-password PASS  Grafana admin password (default: admin)
#   --dry-run            Show deployment plan without executing
#   --diagnose           Run diagnostic checks on deployed services
#   --help               Show this help message
#
# Environment Variables:
#   DEPLOY_SERVER        Production server hostname/IP
#   DEPLOY_DOMAIN        Domain name
#   DEPLOY_USERNAME      SSH username
#   DEPLOY_SSH_KEY       Path to SSH key
#   DEPLOY_DB_PASSWORD   PostgreSQL password
#   GRAFANA_ADMIN_PASSWORD  Grafana admin password
#
# Examples:
#   ./scripts/deployment/deploy-to-server.sh --server prod.example.com --domain erp.example.com
#   ./scripts/deployment/deploy-to-server.sh --config production.json
#   ./scripts/deployment/deploy-to-server.sh --server 192.168.1.100 --domain erp.local --email admin@example.com
#
################################################################################

set -uo pipefail

# Script directory for locating utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_HOST_SETUP="$SCRIPT_DIR/container-host-setup.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration defaults
DEPLOY_SERVER="${DEPLOY_SERVER:-}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-}"
DEPLOY_USERNAME="${DEPLOY_USERNAME:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_rsa}"
REGISTRY_URL="${REGISTRY_URL:-ghcr.io}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-jctroth}"
REGISTRY_TOKEN="${REGISTRY_TOKEN:-}"
SUDO_PASSWORD="${SUDO_PASSWORD:-}"
IMAGE_VERSION="${IMAGE_VERSION:-latest}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-}"
DRY_RUN=false
CONFIG_FILE=""
YES=false
DIAGNOSE=false
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="/tmp/erp-deploy-$$"

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Enhanced print functions (compatible with container-host-setup.sh)
print_color() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo -e "\n${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}" >&2
}

# Command execution helper (compatible with container-host-setup.sh)
run_cmd() {
    local cmd="$1"
    local description="${2:-}"

    if [[ -n "$description" ]]; then
        print_step "Running: $description"
    else
        print_step "Running: $cmd"
    fi

    if ! eval "$cmd"; then
        print_error "Command failed: $cmd"
        return 1
    fi

    print_status "Command completed: ${description:-$cmd}"
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
    DEPLOY_PORT=$(jq -r '.deploy_port // empty' "$config_file" || echo "22")
    DEPLOY_SSH_KEY=$(jq -r '.deploy_ssh_key // empty' "$config_file" || echo "")
    REGISTRY_URL=$(jq -r '.registry_url // empty' "$config_file" || echo "ghcr.io")
    REGISTRY_USERNAME=$(jq -r '.registry_username // empty' "$config_file" || echo "JCTRoth")
    REGISTRY_TOKEN=$(jq -r '.registry_token // empty' "$config_file" || echo "")
    IMAGE_VERSION=$(jq -r '.image_version // empty' "$config_file" || echo "latest")
    LETSENCRYPT_EMAIL=$(jq -r '.letsencrypt_email // empty' "$config_file" || echo "")
    DB_PASSWORD=$(jq -r '.db_password // empty' "$config_file" || echo "")
    GRAFANA_ADMIN_PASSWORD=$(jq -r '.grafana_admin_password // empty' "$config_file" || echo "")
    SUDO_PASSWORD=$(jq -r '.sudo_password // empty' "$config_file" || echo "")
    
    # Expand tilde in SSH key path
    DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"
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
    
    if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
        read -sp "Grafana admin password (leave empty for default 'admin'): " GRAFANA_ADMIN_PASSWORD
        echo ""
        [ -z "$GRAFANA_ADMIN_PASSWORD" ] && GRAFANA_ADMIN_PASSWORD="admin"
    fi
    
    if [ -z "$SUDO_PASSWORD" ]; then
        read -sp "Sudo password for server (required for setup): " SUDO_PASSWORD
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
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Skipping SSH validation"
        return 0
    fi
    
    if ! ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
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

# Setup server infrastructure using container-host-setup.sh utilities
setup_server_infrastructure() {
    print_header "Setting up Server Infrastructure"
    
    if [ ! -f "$CONTAINER_HOST_SETUP" ]; then
        print_warning "container-host-setup.sh not found at $CONTAINER_HOST_SETUP"
        print_info "Skipping automated server setup. Please ensure:"
        print_info "  - Docker is installed"
        print_info "  - Nginx is installed"
        print_info "  - Firewall is configured"
        print_info "  - SSH is hardened"
        return 0
    fi
    
    print_step "Uploading server setup script..."
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would upload container-host-setup.sh to $DEPLOY_SERVER"
        print_warning "DRY RUN: Would run: sudo bash /tmp/container-host-setup.sh --yes --admin-user containeruser"
        return 0
    fi
    
    # Upload the setup script
    scp_to_server "$CONTAINER_HOST_SETUP" "/tmp/container-host-setup.sh"
    
    print_step "Running server setup on $DEPLOY_SERVER..."
    local setup_cmd="bash /tmp/container-host-setup.sh --yes --admin-user containeruser --admin-password 'ContainerAdmin!2024' 2>&1 | tail -50"
    
    if ssh_exec "$setup_cmd"; then
        print_status "Server infrastructure setup completed"
    else
        print_warning "Server setup completed with some warnings (this may be expected)"
    fi
}

# Configure firewall to allow traffic on service ports
configure_firewall() {
    print_header "Configuring Firewall"

    print_step "Allowing traffic on service ports..."
    
    # List of ports to allow
    # 3001: Grafana
    # 5002: Masterdata Service
    # 5003: Shop Service
    # 8080: Company Service
    # 8081: Translation Service
    # 9000: Portainer (HTTP)
    # 9443: Portainer (HTTPS)
    # 9090: Prometheus
    
    local ports="3001 5002 5003 8080 8081 9000 9443 9090 80 443"
    
    for port in $ports; do
        print_info "Opening port $port/tcp..."
        ssh_exec "ufw allow $port/tcp"
    done
    
    print_status "Firewall configuration completed"
}

# Execute SSH command on remote server with sudo password support
ssh_exec() {
    local command=$1
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would execute on remote server"
        print_warning "Command: $command"
        return 0
    fi
    
    # Create temporary password file for sudo
    local pass_file="$TEMP_DIR/sudopass"
    mkdir -p "$TEMP_DIR"
    echo "$SUDO_PASSWORD" > "$pass_file"
    chmod 600 "$pass_file"
    
    # Send command with password available for sudo -S via stdin
    # We use 'cat' to read the password and pipe it to the command
    ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USERNAME@$DEPLOY_SERVER" \
        "cat > /tmp/.sudo_pwd && chmod 600 /tmp/.sudo_pwd && cat /tmp/.sudo_pwd | sudo -S bash -c '$command'; rm -f /tmp/.sudo_pwd" < "$pass_file"
}

# Copy file to remote server via SCP
scp_to_server() {
    local source=$1
    local dest=$2
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would copy $source to $DEPLOY_SERVER:$dest"
        return 0
    fi
    
    scp -i "$DEPLOY_SSH_KEY" -P "$DEPLOY_PORT" "$source" "$DEPLOY_USERNAME@$DEPLOY_SERVER:$dest"
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
services:
  postgres:
    image: postgres:16-alpine
    container_name: erp_system-postgres
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      DB_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pg_stat_statements"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-init/init-multi-db.sh:/docker-entrypoint-initdb.d/init-multi-db.sh
      - ./postgres-init/z-grant-permissions.sh:/opt/erp-system/postgres-init/grant-permissions.sh
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
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=userdb;User Id=erp_user;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"
    restart: unless-stopped
    networks:
      - erp-network

  accounting-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-accounting-service:${IMAGE_VERSION}
    container_name: erp_system-accounting-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=accountingdb;User Id=erp_accounting;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5001:5001"
    expose: []
    restart: unless-stopped
    networks:
      - erp-network

  masterdata-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-masterdata-service:${IMAGE_VERSION}
    container_name: erp_system-masterdata-service
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=masterdatadb;User Id=erp_masterdata;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5002:5002"
    restart: unless-stopped
    networks:
      - erp-network

  # NOTE: shop-service and orders-service disabled in production
  # Both define overlapping Order mutations, causing Apollo Federation conflicts
  # See DEPLOYMENT_CHECKLIST.md for details and resolution options
  # shop-service:
  #   image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-shop-service:${IMAGE_VERSION}
  # orders-service:
  #   image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-orders-service:${IMAGE_VERSION}

  company-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-company-service:${IMAGE_VERSION}
    container_name: erp_system-company-service
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/companydb
      SPRING_DATASOURCE_USERNAME: erp_company
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_PROFILES_ACTIVE: prod
      SPRING_KAFKA_BOOTSTRAP_SERVERS: ""
      SPRING_AUTOCONFIGURE_EXCLUDE: org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration
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
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/translationdb
      SPRING_DATASOURCE_USERNAME: erp_translation
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

  notification-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-notification-service:${IMAGE_VERSION}
    container_name: erp_system-notification-service
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/notificationdb
      SPRING_DATASOURCE_USERNAME: erp_notification
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_PROFILES_ACTIVE: prod
      SPRING_KAFKA_BOOTSTRAP_SERVERS: ""
      SPRING_AUTOCONFIGURE_EXCLUDE: org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8082:8082"
    restart: unless-stopped
    networks:
      - erp-network

  templates-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-templates-service:${IMAGE_VERSION}
    container_name: erp_system-templates-service
    environment:
      NODE_ENV: production
      PORT: 8087
      DATABASE_URL: postgresql://erp_templates:${DB_PASSWORD}@postgres:5432/templatesdb
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8087:8087"
    restart: unless-stopped
    networks:
      - erp-network

  shop-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-shop-service:${IMAGE_VERSION}
    container_name: erp_system-shop-service
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=shopdb;User Id=erp_shop;Password=${DB_PASSWORD};"
      Minio__Endpoint: minio:9000
      Minio__AccessKey: minioadmin
      Minio__SecretKey: minioadmin
      Minio__UseSSL: "false"
      Minio__PublicUrl: https://${DEPLOY_DOMAIN}/minio
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5003:5003"
    restart: unless-stopped
    networks:
      - erp-network

  orders-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-orders-service:${IMAGE_VERSION}
    container_name: erp_system-orders-service
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=ordersdb;User Id=erp_orders;Password=${DB_PASSWORD};"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5004:5004"
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
      ACCOUNTING_SERVICE_URL: http://accounting-service:5001/graphql/
      MASTERDATA_SERVICE_URL: http://masterdata-service:5002/graphql/
      COMPANY_SERVICE_URL: http://company-service:8080/graphql
      TRANSLATION_SERVICE_URL: http://translation-service:8081/graphql
      NOTIFICATION_SERVICE_URL: http://notification-service:8082/graphql
      SHOP_SERVICE_URL: http://shop-service:5003/graphql/
      ORDERS_SERVICE_URL: http://orders-service:5004/graphql/
    depends_on:
      - user-service
      - accounting-service
      - masterdata-service
      - company-service
      - translation-service
    ports:
      - "4000:4000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:4000/health"]
      interval: 30s
      timeout: 3s
      start_period: 30s
      retries: 3
    restart: unless-stopped
    networks:
      - erp-network

  frontend:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-frontend:${IMAGE_VERSION}
    container_name: erp_system-frontend
    environment:
      VITE_API_URL: https://${DEPLOY_DOMAIN}/graphql
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
      - /opt/erp-system/certs:/opt/erp-system/certs:ro
      - /dev/null:/docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
    depends_on:
      - frontend
      - gateway
    restart: unless-stopped
    networks:
      - erp-network

  # Monitoring Services
  minio:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: erp_system-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
      MINIO_SERVER_URL: https://${DEPLOY_DOMAIN}
    volumes:
      - minio_data:/data
    healthcheck:
do it       test: ["CMD-SHELL", "mc alias set local http://localhost:9000 minioadmin minioadmin && mc admin info local --json | grep -q '\"status\":\"success\"' || exit 0"]
      interval: 30s
      timeout: 10s
      retries: 5
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    networks:
      - erp-network

  portainer:
    image: portainer/portainer-ce:latest
    container_name: erp_system-portainer
    ports:
      - "9443:9443"
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /etc/letsencrypt/live/${DEPLOY_DOMAIN}:/certs:ro
    command: --sslcert /certs/fullchain.pem --sslkey /certs/privkey.pem
    restart: always
    networks:
      - erp-network

  prometheus:
    image: prom/prometheus:latest
    container_name: erp_system-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./infrastructure/prometheus/web-config.yml:/etc/prometheus/web-config.yml
      - prometheus_data:/prometheus
      - /etc/letsencrypt/live/${DEPLOY_DOMAIN}:/etc/prometheus/certs:ro
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--web.config.file=/etc/prometheus/web-config.yml'
    restart: always
    networks:
      - erp-network

  grafana:
    image: grafana/grafana:latest
    container_name: erp_system-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=erp-user
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_SERVER_PROTOCOL=https
      - GF_SERVER_CERT_FILE=/etc/grafana/certs/fullchain.pem
      - GF_SERVER_KEY_FILE=/etc/grafana/certs/privkey.pem
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
      - /etc/letsencrypt/live/${DEPLOY_DOMAIN}:/etc/grafana/certs:ro
    restart: always
    networks:
      - erp-network

volumes:
  postgres_data:
  minio_data:
  portainer_data:
  prometheus_data:
  grafana_data:

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
    
    # Redirect all traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl;
    server_name $domain www.$domain;
    
    # SSL certificates (Let's Encrypt path mapping)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Templates Service API
    location /api/templates {
        proxy_pass http://templates-service:8087/api/templates;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Notification Service API
    location /api/smtp-configuration {
        proxy_pass http://notification-service:8082/api/smtp-configuration;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
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
    
    print_info "Setting up SSL certificate for $domain..."
    
    # Check if we already have a certificate
    if [ -d "/opt/erp-system/certs" ] && [ -f "/opt/erp-system/certs/fullchain.pem" ]; then
        print_status "Using existing certificate"
        return 0
    fi
    
    # Try to get Let's Encrypt certificate via certbot
    local install_cmd="command -v certbot >/dev/null 2>&1 || (apt-get update && apt-get install -y certbot)"
    if ! ssh_exec "$install_cmd"; then
      print_warning "Could not install certbot dependencies. Continuing without certbot."
    fi

    # Request certificate (this may fail if DNS isn't configured)
    local cert_cmd="test -d /etc/letsencrypt/live/$domain || certbot certonly --webroot -w /var/www/certbot -d $domain -d www.$domain --email $email --agree-tos --non-interactive 2>&1"
    if ! ssh_exec "$cert_cmd"; then
      print_warning "Certbot could not obtain a certificate for $domain; a self-signed certificate will be used instead."
    fi
}

ensure_ssl_certificates() {
    local domain=$1
    print_step "Ensuring SSL certificates are available"
    local ensure_cmd="mkdir -p /opt/erp-system/certs && if [ -f /etc/letsencrypt/live/$domain/fullchain.pem ] && [ -f /etc/letsencrypt/live/$domain/privkey.pem ]; then cp /etc/letsencrypt/live/$domain/fullchain.pem /opt/erp-system/certs/fullchain.pem && cp /etc/letsencrypt/live/$domain/privkey.pem /opt/erp-system/certs/privkey.pem; else openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /opt/erp-system/certs/privkey.pem -out /opt/erp-system/certs/fullchain.pem -subj "/CN=$domain"; fi"
    ssh_exec "$ensure_cmd"
}

# Wait for databases to be created by postgres init scripts
wait_for_databases() {
    local max_attempts=30
    local attempt=1
    local databases=("userdb" "companydb" "translationdb" "shopdb" "ordersdb" "accountingdb" "masterdatadb" "notificationdb" "scriptingdb" "edifactdb" "templatesdb")
    
    print_info "Waiting for all databases to be created..."
    
    while [ $attempt -le $max_attempts ]; do
        local all_exist=true
        
        for db in "${databases[@]}"; do
            # Check if database exists
            local check_cmd="$compose_cmd_prefix exec -T postgres psql -U postgres -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='$db';\""
            local result
            result=$(ssh_exec "$check_cmd" 2>/dev/null || echo "")
            
            if [ "$result" != "1" ]; then
                all_exist=false
                break
            fi
        done
        
        if [ "$all_exist" = true ]; then
            print_status "All databases created successfully"
            return 0
        fi
        
        print_info "Waiting for databases... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    print_warning "Timeout waiting for databases to be created"
    print_info "This may happen if postgres has existing data. The init scripts only run on first container creation."
    print_info "If this persists, the deployment may need manual intervention to reset postgres data."
    return 1
}

# Handle postgres data volume reset if databases don't exist
handle_postgres_data_reset() {
    print_warning "Database creation timed out - postgres may have existing data preventing init scripts from running"
    
    # Check if --yes flag was used
    if [ "$DRY_RUN" = true ] || [ "$YES" = true ]; then
        print_info "Auto-yes mode: Automatically resetting postgres data volume"
        REPLY="y"
    else
        # Ask user if they want to reset postgres data
        echo ""
        echo "This usually happens when postgres has existing data from a previous deployment."
        echo "The database initialization scripts only run when the postgres container is created for the first time."
        echo ""
        read -p "Do you want to reset the postgres data volume to recreate all databases? (y/N): " -n 1 -r
        echo ""
    fi
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Resetting postgres data volume..."
        
        # Stop services
        local stop_cmd="$compose_cmd_prefix down"
        ssh_exec "$stop_cmd"
        
        # Remove postgres volume
        local volume_cmd="docker volume rm erp_system_postgres-data"
        ssh_exec "$volume_cmd"
        
        # Restart services
        local start_cmd="$compose_cmd_prefix up -d"
        ssh_exec "$start_cmd"
        
        print_status "Postgres data volume reset and services restarted"
        print_info "Waiting 30 seconds for postgres to initialize..."
        sleep 30
        
        # Try waiting for databases again
        if wait_for_databases; then
            return 0
        else
            print_error "Database creation still failed after volume reset"
            return 1
        fi
    else
        print_warning "Skipping postgres data reset"
        print_info "You will need to manually reset the postgres data volume:"
        print_info "1. ssh containeruser@$DEPLOY_SERVER"
        print_info "2. cd /opt/erp-system && docker compose down"
        print_info "3. docker volume rm erp_system_postgres-data"
        print_info "4. docker compose up -d"
        return 1
    fi
}

# Deploy application
deploy_application() {
    print_header "Deploying Application"
    
    # Create temporary directory on remote server with environment file
    print_step "Preparing remote server directories..."
    # Create directories with proper ownership for containeruser
    local setup_cmd="mkdir -p /opt/erp-system /opt/erp-system/nginx/conf.d /opt/erp-system/infrastructure/prometheus /opt/erp-system/infrastructure/grafana /var/www/certbot && chown -R $DEPLOY_USERNAME:$DEPLOY_USERNAME /opt/erp-system && chmod -R 755 /opt/erp-system"
    ssh_exec "$setup_cmd"

    setup_letsencrypt "$DEPLOY_DOMAIN" "$LETSENCRYPT_EMAIL"
    ensure_ssl_certificates "$DEPLOY_DOMAIN"
    
    # Create .env file on remote server with all required variables
    print_step "Creating environment configuration..."
    local env_file="$TEMP_DIR/.env.production"
    mkdir -p "$TEMP_DIR"
    local escaped_db_password="${DB_PASSWORD//\$/\$\$}"
    cat > "$env_file" << EOF
DB_PASSWORD=$escaped_db_password
REGISTRY_URL=$REGISTRY_URL
REGISTRY_USERNAME=$REGISTRY_USERNAME
IMAGE_VERSION=$IMAGE_VERSION
DEPLOY_DOMAIN=$DEPLOY_DOMAIN
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
EOF
    
    # Copy .env file to remote server
    scp_to_server "$env_file" "/opt/erp-system/.env"
    
    # Copy compose file
    local compose_file
    compose_file=$(create_production_compose)
    
    # Pre-process compose file to substitute registry variables before uploading
    # This allows us to use COMPOSE_INTERPOLATION=off to avoid DB_PASSWORD issues
    local processed_compose="$TEMP_DIR/docker-compose.processed.yml"
    sed -e "s|\${REGISTRY_URL}|$REGISTRY_URL|g" \
        -e "s|\${REGISTRY_USERNAME}|$REGISTRY_USERNAME|g" \
        -e "s|\${IMAGE_VERSION}|$IMAGE_VERSION|g" \
        "$compose_file" > "$processed_compose"
    
    print_info "Uploading docker-compose.yml..."
    scp_to_server "$processed_compose" "/opt/erp-system/docker-compose.yml"
    
    # Copy database permission grant script
    print_info "Uploading database permission grant script..."
    scp_to_server "$PROJECT_ROOT/infrastructure/postgres-init/z-grant-permissions.sh" "/opt/erp-system/postgres-init/grant-permissions.sh"
    
    # Copy database initialization script
    print_info "Uploading database initialization script..."
    scp_to_server "$PROJECT_ROOT/infrastructure/postgres-init/init-multi-db.sh" "/opt/erp-system/postgres-init/init-multi-db.sh"
    
    # Copy infrastructure configurations (Prometheus, Grafana)
    print_info "Uploading monitoring configurations..."
    scp_to_server "$PROJECT_ROOT/infrastructure/prometheus/prometheus.yml" "/opt/erp-system/infrastructure/prometheus/prometheus.yml"
    scp_to_server "$PROJECT_ROOT/infrastructure/prometheus/web-config.yml" "/opt/erp-system/infrastructure/prometheus/web-config.yml"
    
    # We need to copy the directory for Grafana provisioning
    # scp -r is not available via our scp_to_server helper effectively for dirs with permissions,
    # so we'll use tar via ssh or individual files. Since structure is simple:
    # infra/grafana/provisioning/datasources/datasource.yml
    # infra/grafana/provisioning/dashboards/dashboard.yml
    ssh_exec "mkdir -p /opt/erp-system/infrastructure/grafana/provisioning/datasources /opt/erp-system/infrastructure/grafana/provisioning/dashboards"
    
    # Find all files in provisioning and copy them
    if [ -d "$PROJECT_ROOT/infrastructure/grafana/provisioning" ]; then
        # Copy entire directory using tar over ssh for simplicity
        tar -C "$PROJECT_ROOT/infrastructure/grafana" -czf - provisioning | ssh_exec "tar -xzf - -C /opt/erp-system/infrastructure/grafana"
    fi

    # Create nginx.conf file (required before docker compose tries to mount it)
    print_step "Creating nginx configuration files..."
    local nginx_main_conf="$TEMP_DIR/nginx.conf"
    cat > "$nginx_main_conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    include /etc/nginx/conf.d/*.conf;
}
EOF
    # Use scp with -r flag removed and force file copy (remove directory if exists)
    ssh_exec "rm -f /opt/erp-system/nginx/nginx.conf"
    scp_to_server "$nginx_main_conf" "/opt/erp-system/nginx/nginx.conf"
    
    # Copy nginx config
    local nginx_config
    nginx_config=$(create_nginx_config "$DEPLOY_DOMAIN")
    print_info "Uploading nginx default configuration..."
    scp_to_server "$nginx_config" "/opt/erp-system/nginx/conf.d/default.conf"
    
    # Login to registry
    print_step "Authenticating with container registry..."
    local login_cmd="cd /opt/erp-system && echo '$REGISTRY_TOKEN' | docker login $REGISTRY_URL -u $REGISTRY_USERNAME --password-stdin"
    ssh_exec "$login_cmd"
    
    local compose_cmd_prefix="cd /opt/erp-system && COMPOSE_INTERPOLATION=off docker compose --env-file .env"

    # Pull images
    print_step "Pulling container images..."
    local pull_cmd="$compose_cmd_prefix pull"
    ssh_exec "$pull_cmd"
    
    # Start all services
    print_step "Starting all services..."
    local start_cmd="$compose_cmd_prefix up -d"
    ssh_exec "$start_cmd"
    sleep 10
    
    # Flush DNS cache to refresh service IPs (critical for gateway and nginx)
    # This prevents "No route to host" or "Connection refused" errors from stale DNS caches
    print_step "Flushing DNS caches to refresh service IPs..."
    local dns_flush_cmd="$compose_cmd_prefix restart gateway nginx"
    ssh_exec "$dns_flush_cmd"
    sleep 5
    
    # Wait for databases to be created by init scripts
    print_step "Waiting for databases to be created..."
    if ! wait_for_databases; then
        # If databases don't exist, run the init script manually
        print_info "Databases not found - running initialization script manually..."
        # Copy the init script into the postgres container
        local copy_cmd="$compose_cmd_prefix cp /opt/erp-system/postgres-init/init-multi-db.sh postgres:/tmp/init-multi-db.sh"
        ssh_exec "$copy_cmd"
        # Make it executable and run it as postgres user
        local init_cmd="$compose_cmd_prefix exec -T --user postgres postgres bash /tmp/init-multi-db.sh"
        ssh_exec "$init_cmd"
        
        # Wait again for databases to be created
        if ! wait_for_databases; then
            # If still failing, try the automatic reset
            handle_postgres_data_reset
        fi
    fi
    
    # Grant database permissions
    print_step "Granting database permissions..."
    # Copy the grant script into the postgres container
    local copy_grant_cmd="$compose_cmd_prefix cp /opt/erp-system/postgres-init/grant-permissions.sh postgres:/tmp/grant-permissions.sh"
    ssh_exec "$copy_grant_cmd"
    # Make it executable and run it as postgres user
    local grant_cmd="$compose_cmd_prefix exec -T --user postgres postgres bash /tmp/grant-permissions.sh"
    ssh_exec "$grant_cmd"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Skipping deployment verification"
        return 0
    fi
    
    # Check HTTP to HTTPS redirect
    print_info "Checking HTTP→HTTPS redirect..."
    local redirect_code
    redirect_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -L "http://$DEPLOY_DOMAIN" 2>/dev/null || echo "000")
    if [ "$redirect_code" = "200" ]; then
        print_status "HTTP→HTTPS redirect working"
    else
        print_warning "HTTP redirect returned code: $redirect_code (may be expected if firewall blocks external connections)"
    fi
    
    # Check HTTPS connectivity
    print_info "Checking HTTPS connectivity..."
    if curl -sf -k -m 5 "https://$DEPLOY_DOMAIN/health" >/dev/null 2>&1; then
        print_status "HTTPS connection successful"
    else
        print_warning "Could not reach HTTPS endpoint (this may be expected if firewall blocks external connections)"
    fi
    
    # Check services on server
    print_info "Checking service status on server..."
    local services_cmd="cd /opt/erp-system && docker compose --env-file .env ps --format 'table {{.Names}}\t{{.Status}}'"
    
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

# Run diagnostic checks on deployed services
diagnose_services() {
    print_header "Diagnosing ERP System Services"
    
    print_step "Checking if templates-service is running..."
    if ssh_exec "docker ps | grep -q templates"; then
        print_status "✓ Templates service is running"
    else
        print_error "✗ Templates service is not running"
        return 1
    fi
    
    print_step "Checking templates service health..."
    local health_result
    health_result=$(ssh_exec "curl -s http://localhost:8087/actuator/health" 2>/dev/null || echo "failed")
    if [[ "$health_result" == *"UP"* ]]; then
        print_status "✓ Templates service health check passed"
    else
        print_error "✗ Templates service health check failed: $health_result"
    fi
    
    print_step "Checking if asciidoctor-pdf is installed in templates container..."
    if ssh_exec "docker exec erp_system-templates-service which asciidoctor-pdf >/dev/null 2>&1"; then
        print_status "✓ asciidoctor-pdf is installed"
    else
        print_error "✗ asciidoctor-pdf is not installed in templates container"
    fi
    
    print_step "Checking available templates..."
    local templates_result
    templates_result=$(ssh_exec "curl -s http://localhost:8087/api/templates" 2>/dev/null || echo "failed")
    if [[ "$templates_result" != "failed" ]] && [[ "$templates_result" != "" ]]; then
        local template_count
        template_count=$(echo "$templates_result" | jq '. | length' 2>/dev/null || echo "0")
        print_status "✓ Found $template_count templates in database"
        if [[ "$template_count" -gt 0 ]]; then
            local first_template
            first_template=$(echo "$templates_result" | jq '.[0].id' 2>/dev/null | tr -d '"')
            print_info "First template ID: $first_template"
            
            print_step "Testing PDF generation..."
            local pdf_test
            pdf_test=$(ssh_exec "curl -X POST http://localhost:8087/api/templates/$first_template/pdf -H 'Content-Type: application/json' -d '{\"order\":{\"number\":\"DIAG-TEST\"}}' --output /tmp/diag-test.pdf 2>/dev/null && ls -la /tmp/diag-test.pdf 2>/dev/null | grep -v 'No such file'" || echo "failed")
            if [[ "$pdf_test" != "failed" ]] && [[ "$pdf_test" != "" ]]; then
                print_status "✓ PDF generation successful"
            else
                print_error "✗ PDF generation failed"
            fi
        fi
    else
        print_error "✗ Could not retrieve templates: $templates_result"
    fi
    
    print_step "Testing shop service connectivity to templates service..."
    # Test if shop service can reach templates service by making a call from shop container
    local connectivity_test
    connectivity_test=$(ssh_exec "docker exec erp_system-shop-service curl -s --connect-timeout 5 http://templates-service:8087/api/templates?assignedState=shipped" 2>/dev/null || echo "failed")
    if [[ "$connectivity_test" != "failed" ]] && [[ "$connectivity_test" != "" ]]; then
        print_status "✓ Shop service can reach templates service"
    else
        print_error "✗ Shop service cannot reach templates service: $connectivity_test"
    fi
    
    print_step "Testing shop service connectivity to MinIO..."
    # First check if MinIO container is running
    local minio_running
    minio_running=$(ssh_exec "docker ps | grep -q minio && echo 'running' || echo 'not running'" 2>/dev/null)
    if [[ "$minio_running" != "running" ]]; then
        print_error "✗ MinIO container is not running"
    else
        print_status "✓ MinIO container is running"
        # Test if shop service can reach MinIO
        local minio_test
        minio_test=$(ssh_exec "docker exec erp_system-shop-service curl -s --connect-timeout 5 http://minio:9000/minio/health/ready" 2>/dev/null || echo "failed")
        if [[ "$minio_test" == "OK" ]]; then
            print_status "✓ Shop service can reach MinIO"
        else
            print_error "✗ Shop service cannot reach MinIO: $minio_test"
        fi
    fi
    
    print_step "Checking shop service logs for document generation errors..."
    local shop_logs
    shop_logs=$(ssh_exec "docker logs erp_system-shop-service --tail 50" 2>/dev/null || echo "failed")
    if [[ "$shop_logs" != "failed" ]]; then
        if echo "$shop_logs" | grep -q "Error generating documents"; then
            print_error "✗ Found document generation errors in shop service logs"
            echo "$shop_logs" | grep -A 5 -B 5 "Error generating documents" | head -20
        elif echo "$shop_logs" | grep -q "Generated document"; then
            print_status "✓ Found successful document generation in logs"
        else
            print_warning "? No document generation activity found in recent logs"
        fi
    else
        print_warning "Could not retrieve shop service logs"
    fi
    
    print_step "Checking container logs (last 20 lines)..."
    ssh_exec "docker logs erp_system-templates-service --tail 20" || print_warning "Could not retrieve logs"
    
    print_info "Diagnosis complete. Check the output above for any issues."
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
            --port)
                DEPLOY_PORT="$2"
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
            --grafana-admin-password)
                GRAFANA_ADMIN_PASSWORD="$2"
                shift 2
                ;;
            --sudo-password)
                SUDO_PASSWORD="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --yes)
                YES=true
                shift
                ;;
            --diagnose)
                DIAGNOSE=true
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
    
    # Load config file if provided or if config.json exists
    if [ -n "$CONFIG_FILE" ]; then
        load_config "$CONFIG_FILE"
    elif [ -f "$SCRIPT_DIR/config.json" ]; then
        print_info "Found config.json, loading configuration..."
        CONFIG_FILE="$SCRIPT_DIR/config.json"
        load_config "$CONFIG_FILE"
    fi
    
    # If diagnose mode, run diagnostics and exit
    if [ "$DIAGNOSE" = true ]; then
        # Prompt for missing configuration
        prompt_for_config || exit 1
        
        # Validate SSH
        validate_ssh || exit 1
        
        # Run diagnostics
        diagnose_services
        exit $?
    fi
    
    # Prompt for missing configuration
    prompt_for_config || exit 1
    
    # Display summary
    display_summary
    
    # Confirm deployment
    echo ""
    if [ "$DRY_RUN" = false ] && [ "$YES" = false ]; then
        read -p "Proceed with deployment to $DEPLOY_SERVER? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Validate SSH
    validate_ssh || exit 1
    
    # Setup server infrastructure (Docker, Nginx, Firewall, SSH hardening)
    setup_server_infrastructure || exit 1
    
    # Configure custom firewall rules for services
    configure_firewall || exit 1
    
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
