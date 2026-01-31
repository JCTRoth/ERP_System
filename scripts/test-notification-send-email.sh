#!/usr/bin/env bash

# Test Notification Service sendEmail GraphQL mutation
# Verifies that the Java notification-service is reachable and accepts
# SendEmailInput payloads via GraphQL.

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL=${BASE_URL:-"http://localhost:8082/graphql"}

echo "Testing notification-service sendEmail mutation against: $BASE_URL" 

PAYLOAD='{"query":"mutation TestSendEmail($input: SendEmailInput!) { sendEmail(input: $input) { id status } }","variables":{"input":{"toEmail":"dev-null@example.com","subject":"Test notification-service email","bodyText":"This is a test email from test-notification-send-email.sh","language":"en"}}}'

RESPONSE=$(wget -qO- --header='Content-Type: application/json' --post-data="${PAYLOAD}" "${BASE_URL}" 2>&1 || true)

if echo "$RESPONSE" | grep -q '"errors"'; then
  echo -e "${RED}✗ FAIL${NC} sendEmail returned GraphQL errors"
  echo "Response: $RESPONSE"
  exit 1
fi

if echo "$RESPONSE" | grep -q '"data"' && echo "$RESPONSE" | grep -q '"sendEmail"'; then
  echo -e "${GREEN}✓ PASS${NC} sendEmail mutation accepted payload"
  echo "Response: $(echo "$RESPONSE" | head -c 200)..."
else
  echo -e "${RED}✗ FAIL${NC} sendEmail mutation did not return expected data"
  echo "Response: $RESPONSE"
  exit 1
fi
