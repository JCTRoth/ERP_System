#!/usr/bin/env bash
# Quick restart script - assumes cluster is already set up
# Just rebuilds images, reloads them, and restarts services

cd "$(dirname "$0")/.."

echo "Quick restart: rebuilding images and redeploying..."

bash scripts/k8s-local-deploy.sh rebuild
