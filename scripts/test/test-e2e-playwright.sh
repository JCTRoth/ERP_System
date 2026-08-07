#!/bin/bash
# shellcheck shell=bash

# ========================================================================================================================================================
# Playwright E2E Test Script
# Runs the Playwright end-to-end suite (apps/e2e) against the local ERP stack.
#
# Usage:
#   ./scripts/test/test-e2e-playwright.sh [playwright args...]
#
# Prerequisites:
#   - The full ERP stack must be running (see scripts/dev/start-local.sh, or
#     docker-compose.prod-local.yml for the production-like local stack).
#   - Playwright browsers must be installed (npm run e2e:install).
#
# Notes:
#   - The authentication test ALWAYS runs first; if it fails the whole suite
#     stops immediately (setup project + maxFailures: 1).
#   - Targets http://localhost:5173 (frontend) and http://localhost:3008 (webshop)
#     by default; override with E2E_BASE_URL / E2E_WEBSHOP_URL.
#   - Exit code 0 = all tests passed; non-zero = one or more failures.
# ============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Pre-flight: make sure the gateway is reachable so we fail with a clear
# message instead of a wall of Playwright timeouts.
GATEWAY_URL="${E2E_GATEWAY_URL:-http://localhost:4000/health}"
FRONTEND_URL="${E2E_BASE_URL:-http://localhost:5173}"

echo -e "${YELLOW}[i]${NC} Checking gateway ($GATEWAY_URL)..."
if curl -sf "$GATEWAY_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} Gateway is reachable"
else
    echo -e "${RED}[✗]${NC} Gateway is not reachable at $GATEWAY_URL"
    echo "      Start the stack first: ./scripts/dev/start-local.sh (or docker compose -f docker-compose.prod-local.yml up -d --build)"
    exit 1
fi

echo -e "${YELLOW}[i]${NC} Checking frontend ($FRONTEND_URL)..."
if curl -sf "$FRONTEND_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} Frontend is reachable"
else
    echo -e "${YELLOW}[!]${NC} Frontend is not reachable at $FRONTEND_URL — Playwright will attempt to start it (webServer)"
fi

echo -e "${YELLOW}[i]${NC} Running Playwright E2E tests..."
npm --workspace @erp/e2e run test -- "$@"
