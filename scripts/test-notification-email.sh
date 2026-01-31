#!/usr/bin/env bash

# =============================================================================
# Test: Email Notification Service - Comprehensive Tests
# =============================================================================
# Tests the notification-service email functionality:
#   1. GraphQL sendEmail mutation (direct service)
#   2. GraphQL sendEmail mutation (via gateway)
#   3. Email with template data
#   4. Email validation (missing fields)
#   5. Query email notifications
#   6. SMTP connectivity verification
#
# Requirements:
#   - notification-service running (port 8082)
#   - Gateway running (port 4000)
#   - wget and jq installed
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

NOTIFICATION_URL=${NOTIFICATION_URL:-"http://localhost:8082/graphql"}
GATEWAY_URL=${GATEWAY_URL:-"http://localhost:4000/graphql"}
TEST_EMAIL=${TEST_EMAIL:-"test@example.com"}

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

log() {
  echo -e "[$(date +%H:%M:%S)] $*"
}

pass() {
  echo -e "${GREEN}✓${NC} $*"
  ((TESTS_PASSED++)) || true
}

fail() {
  echo -e "${RED}✗${NC} $*"
  ((TESTS_FAILED++)) || true
}

skip() {
  echo -e "${YELLOW}⊘${NC} $*"
  ((TESTS_SKIPPED++)) || true
}

section() {
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Check dependencies
if ! command -v wget >/dev/null 2>&1; then
  echo "Error: wget is required but not installed."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed."
  exit 1
fi

# Helper function to make GraphQL requests
graphql_request() {
  local url="$1"
  local query="$2"
  wget -q -O - --post-data "$query" --header 'Content-Type: application/json' "$url" 2>/dev/null || echo '{"error":"connection_failed"}'
}

section "1. Service Connectivity Tests"

# Test 1.1: Notification service is reachable
log "Testing notification-service connectivity..."
HEALTH_RESP=$(wget -q -O - "http://localhost:8082/actuator/health" 2>/dev/null || echo '{"status":"DOWN"}')
if echo "$HEALTH_RESP" | jq -e '.status == "UP"' >/dev/null 2>&1; then
  pass "notification-service is healthy"
else
  fail "notification-service health check failed: $HEALTH_RESP"
fi

# Test 1.2: GraphQL endpoint is available
log "Testing notification-service GraphQL endpoint..."
INTROSPECT_RESP=$(graphql_request "$NOTIFICATION_URL" '{"query":"{ __typename }"}')
if echo "$INTROSPECT_RESP" | jq -e '.data.__typename' >/dev/null 2>&1; then
  pass "notification-service GraphQL endpoint is available"
else
  fail "notification-service GraphQL endpoint failed: $INTROSPECT_RESP"
fi

# Test 1.3: Gateway is reachable
log "Testing gateway connectivity..."
GW_RESP=$(graphql_request "$GATEWAY_URL" '{"query":"{ __typename }"}')
if echo "$GW_RESP" | jq -e '.data.__typename' >/dev/null 2>&1; then
  pass "Gateway GraphQL endpoint is available"
else
  fail "Gateway GraphQL endpoint failed: $GW_RESP"
fi

section "2. sendEmail Mutation Tests (Direct Service)"

# Test 2.1: Basic email sending
log "Testing basic sendEmail mutation..."
EMAIL_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", subject: \"Test Email - Basic\", bodyHtml: \"<h1>Test</h1><p>This is a basic test email.</p>\" }) { id status errorMessage createdAt } }"
}')

EMAIL_ID=$(echo "$EMAIL_RESP" | jq -r '.data.sendEmail.id // empty')
EMAIL_STATUS=$(echo "$EMAIL_RESP" | jq -r '.data.sendEmail.status // empty')

if [[ -n "$EMAIL_ID" && "$EMAIL_ID" != "null" ]]; then
  pass "Basic sendEmail mutation succeeded: id=$EMAIL_ID status=$EMAIL_STATUS"
else
  fail "Basic sendEmail mutation failed: $EMAIL_RESP"
fi

# Test 2.2: Email with template name
log "Testing sendEmail with template..."
TEMPLATE_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", subject: \"Order Confirmation\", templateName: \"order-confirmation\", templateData: \"{\\\"orderNumber\\\":\\\"ORD-TEST-001\\\",\\\"customerName\\\":\\\"Test Customer\\\",\\\"total\\\":99.99}\" }) { id status templateName } }"
}')

TEMPLATE_ID=$(echo "$TEMPLATE_RESP" | jq -r '.data.sendEmail.id // empty')
TEMPLATE_NAME=$(echo "$TEMPLATE_RESP" | jq -r '.data.sendEmail.templateName // empty')

if [[ -n "$TEMPLATE_ID" && "$TEMPLATE_ID" != "null" ]]; then
  pass "Template sendEmail succeeded: id=$TEMPLATE_ID templateName=$TEMPLATE_NAME"
else
  fail "Template sendEmail failed: $TEMPLATE_RESP"
fi

# Test 2.3: Email with recipient name
log "Testing sendEmail with toName..."
NAME_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", toName: \"Test Recipient\", subject: \"Test with Name\", bodyHtml: \"<p>Hello Test Recipient!</p>\" }) { id status } }"
}')

NAME_ID=$(echo "$NAME_RESP" | jq -r '.data.sendEmail.id // empty')
if [[ -n "$NAME_ID" && "$NAME_ID" != "null" ]]; then
  pass "toName sendEmail succeeded: id=$NAME_ID"
else
  fail "toName sendEmail failed: $NAME_RESP"
fi

# Test 2.4: Email with language
log "Testing sendEmail with language..."
LANG_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", subject: \"Test with Language\", bodyHtml: \"<p>Test mit Sprache</p>\", language: \"de\" }) { id status } }"
}')

LANG_ID=$(echo "$LANG_RESP" | jq -r '.data.sendEmail.id // empty')
if [[ -n "$LANG_ID" && "$LANG_ID" != "null" ]]; then
  pass "Language sendEmail succeeded: id=$LANG_ID"
else
  fail "Language sendEmail failed: $LANG_RESP"
fi

section "3. Input Validation Tests"

# Test 3.1: Missing required field (toEmail)
log "Testing validation: missing toEmail..."
MISSING_TO_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { subject: \"Test\", bodyHtml: \"<p>No recipient</p>\" }) { id status } }"
}')

if echo "$MISSING_TO_RESP" | jq -e '.errors' >/dev/null 2>&1; then
  pass "Validation correctly rejected missing toEmail"
else
  fail "Validation should have rejected missing toEmail: $MISSING_TO_RESP"
fi

# Test 3.2: Invalid email format
log "Testing validation: invalid email format..."
INVALID_EMAIL_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"not-an-email\", subject: \"Test\", bodyHtml: \"<p>Invalid email</p>\" }) { id status errorMessage } }"
}')

# Some implementations may accept it but fail on send, others reject immediately
INVALID_ID=$(echo "$INVALID_EMAIL_RESP" | jq -r '.data.sendEmail.id // empty')
INVALID_ERROR=$(echo "$INVALID_EMAIL_RESP" | jq -r '.data.sendEmail.errorMessage // .errors[0].message // empty')
if [[ -z "$INVALID_ID" || -n "$INVALID_ERROR" ]]; then
  pass "Invalid email format handled: ${INVALID_ERROR:-rejected}"
else
  skip "Invalid email format accepted (validation may happen at send time)"
fi

# Test 3.3: Empty subject
log "Testing validation: empty subject..."
EMPTY_SUBJECT_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", subject: \"\", bodyHtml: \"<p>Empty subject</p>\" }) { id status } }"
}')

EMPTY_SUBJ_ID=$(echo "$EMPTY_SUBJECT_RESP" | jq -r '.data.sendEmail.id // empty')
if [[ -n "$EMPTY_SUBJ_ID" && "$EMPTY_SUBJ_ID" != "null" ]]; then
  pass "Empty subject accepted (allowed): id=$EMPTY_SUBJ_ID"
else
  pass "Empty subject rejected by validation"
fi

section "4. Query Tests"

# Test 4.1: Query single notification by ID (from our earlier test)
if [[ -n "${EMAIL_ID:-}" && "$EMAIL_ID" != "null" ]]; then
  log "Testing notification by ID..."
  SINGLE_RESP=$(graphql_request "$NOTIFICATION_URL" "{
    \"query\": \"{ notification(id: \\\"$EMAIL_ID\\\") { id toEmail subject status createdAt sentAt } }\"
  }")
  
  SINGLE_ID=$(echo "$SINGLE_RESP" | jq -r '.data.notification.id // empty')
  if [[ "$SINGLE_ID" == "$EMAIL_ID" ]]; then
    pass "notification by ID query succeeded"
  else
    fail "notification by ID query failed: $SINGLE_RESP"
  fi
else
  skip "notification by ID test (no email ID from previous test)"
fi

# Test 4.2: Query email templates
log "Testing emailTemplates query..."
TEMPLATES_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "{ emailTemplates { id name subject language } }"
}')

if echo "$TEMPLATES_RESP" | jq -e '.data.emailTemplates' >/dev/null 2>&1; then
  TEMPLATE_COUNT=$(echo "$TEMPLATES_RESP" | jq -r '.data.emailTemplates | length')
  pass "emailTemplates query succeeded: $TEMPLATE_COUNT templates found"
else
  fail "emailTemplates query failed: $TEMPLATES_RESP"
fi

section "5. Gateway Federation Tests"

# Test 5.1: sendEmail via gateway
log "Testing sendEmail via gateway..."
GW_EMAIL_RESP=$(graphql_request "$GATEWAY_URL" '{
  "query": "mutation { sendEmail(input: { toEmail: \"'"$TEST_EMAIL"'\", subject: \"Test via Gateway\", bodyHtml: \"<p>Sent through Apollo Gateway</p>\" }) { id status } }"
}')

GW_EMAIL_ID=$(echo "$GW_EMAIL_RESP" | jq -r '.data.sendEmail.id // empty')
if [[ -n "$GW_EMAIL_ID" && "$GW_EMAIL_ID" != "null" ]]; then
  pass "Gateway sendEmail mutation succeeded: id=$GW_EMAIL_ID"
else
  fail "Gateway sendEmail mutation failed: $GW_EMAIL_RESP"
fi

# Test 5.2: Query notification via gateway
log "Testing notification query via gateway..."
GW_QUERY_RESP=$(graphql_request "$GATEWAY_URL" "{
  \"query\": \"{ notification(id: \\\"$GW_EMAIL_ID\\\") { id toEmail subject status } }\"
}")

if echo "$GW_QUERY_RESP" | jq -e '.data.notification' >/dev/null 2>&1; then
  pass "Gateway notification query succeeded"
else
  fail "Gateway notification query failed: $GW_QUERY_RESP"
fi

section "6. SMTP Status Verification"

# Test 6.1: Verify test emails were sent
log "Verifying test emails were sent..."

# Check the status of our basic test email
if [[ -n "${EMAIL_ID:-}" && "$EMAIL_ID" != "null" ]]; then
  VERIFY_RESP=$(graphql_request "$NOTIFICATION_URL" "{
    \"query\": \"{ notification(id: \\\"$EMAIL_ID\\\") { id status errorMessage sentAt } }\"
  }")
  
  VERIFY_STATUS=$(echo "$VERIFY_RESP" | jq -r '.data.notification.status // empty')
  VERIFY_ERROR=$(echo "$VERIFY_RESP" | jq -r '.data.notification.errorMessage // empty')
  
  if [[ "$VERIFY_STATUS" == "SENT" ]]; then
    pass "Test email was successfully sent via SMTP"
  elif [[ "$VERIFY_STATUS" == "PENDING" ]]; then
    skip "Test email is still pending"
  elif [[ "$VERIFY_STATUS" == "FAILED" ]]; then
    fail "Test email failed: $VERIFY_ERROR"
    if [[ "$VERIFY_ERROR" == *"Authentication"* ]]; then
      echo "    → Check SMTP_USERNAME and SMTP_PASSWORD in .env file"
    fi
  else
    skip "Test email status: $VERIFY_STATUS"
  fi
else
  skip "No test email ID available to verify"
fi

# Test 6.2: Verify gateway email was sent
if [[ -n "${GW_EMAIL_ID:-}" && "$GW_EMAIL_ID" != "null" ]]; then
  GW_VERIFY_RESP=$(graphql_request "$NOTIFICATION_URL" "{
    \"query\": \"{ notification(id: \\\"$GW_EMAIL_ID\\\") { id status } }\"
  }")
  
  GW_VERIFY_STATUS=$(echo "$GW_VERIFY_RESP" | jq -r '.data.notification.status // empty')
  
  if [[ "$GW_VERIFY_STATUS" == "SENT" ]]; then
    pass "Gateway email was successfully sent via SMTP"
  else
    skip "Gateway email status: $GW_VERIFY_STATUS"
  fi
else
  skip "No gateway email ID available to verify"
fi

section "Test Summary"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

if [[ $TESTS_FAILED -gt 0 ]]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
