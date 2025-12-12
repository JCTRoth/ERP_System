# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (1.28+)
- kubectl configured
- Helm 3.x installed
- Container registry access

## Namespace Setup

```bash
# Create namespaces
kubectl create namespace erp-dev
kubectl create namespace erp-prod
```

## Secrets Configuration

### Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \
  --namespace erp-prod \
  --from-literal=postgres-password='your-secure-password' \
  --from-literal=postgres-user='erp_user'

# JWT secret
kubectl create secret generic jwt-secret \
  --namespace erp-prod \
  --from-literal=secret='your-super-secret-key-at-least-256-bits-long-for-hs256'

# Container registry (if private)
kubectl create secret docker-registry regcred \
  --namespace erp-prod \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token>
```

## Helm Deployment

### Install

```bash
# Development
helm install erp-system ./infrastructure/helm/erp-system \
  --namespace erp-dev \
  --values ./infrastructure/helm/erp-system/values.yaml \
  --set environment=development

# Production
helm install erp-system ./infrastructure/helm/erp-system \
  --namespace erp-prod \
  --values ./infrastructure/helm/erp-system/values-prod.yaml \
  --set environment=production
```

### Upgrade

```bash
helm upgrade erp-system ./infrastructure/helm/erp-system \
  --namespace erp-prod \
  --set global.imageTag=v1.2.0
```

### Rollback

```bash
# View history
helm history erp-system --namespace erp-prod

# Rollback to previous
helm rollback erp-system --namespace erp-prod

# Rollback to specific revision
helm rollback erp-system 3 --namespace erp-prod
```

## Configuration Values

### Development (values.yaml)

```yaml
global:
  environment: development
  imageTag: latest

replicaCount: 1

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

postgresql:
  enabled: true
  auth:
    postgresPassword: postgres
```

### Production (values-prod.yaml)

```yaml
global:
  environment: production
  imageTag: v1.0.0

replicaCount: 3

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 256Mi

postgresql:
  enabled: false  # Use external managed database

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: erp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: erp-tls
      hosts:
        - erp.example.com
```

## Ingress Configuration

### NGINX Ingress

```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### TLS with cert-manager

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Database

### External PostgreSQL

For production, use a managed PostgreSQL service:

```yaml
# values-prod.yaml
postgresql:
  enabled: false

externalDatabase:
  host: your-db-host.region.rds.amazonaws.com
  port: 5432
  database: erp
  existingSecret: db-credentials
```

### PostgreSQL in Cluster (Dev only)

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    postgresPassword: postgres
    database: erp
  primary:
    persistence:
      enabled: true
      size: 10Gi
```

## Monitoring

### Prometheus & Grafana

```bash
# Install Prometheus stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default credentials: admin / prom-operator
```

### Service Monitors

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: erp-services
  namespace: erp-prod
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: erp-system
  endpoints:
    - port: metrics
      interval: 30s
```

## Logging

### Loki Stack

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace logging \
  --create-namespace \
  --set grafana.enabled=false \
  --set promtail.enabled=true
```

## Health Checks

All services expose health endpoints:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### View Pod Logs

```bash
kubectl logs -f deployment/user-service -n erp-prod
```

### Debug Pod

```bash
kubectl exec -it deployment/user-service -n erp-prod -- /bin/sh
```

### Check Events

```bash
kubectl get events -n erp-prod --sort-by='.lastTimestamp'
```

### Resource Usage

```bash
kubectl top pods -n erp-prod
kubectl top nodes
```
