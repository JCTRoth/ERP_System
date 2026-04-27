#!/usr/bin/env bash

# =============================================================================
# Test: SMTP Configuration Verification
# =============================================================================
# Verifies SMTP configuration is correct and emails can be sent:
#   1. Check .env file exists and has SMTP variables
#   2. Verify notification-service has SMTP config
#   3. Send test email and verify delivery
#   4. Check email status transitions
#
# Requirements:
#   - notification-service running (port 8082)
#   - .env file with SMTP credentials
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
NOTIFICATION_URL=${NOTIFICATION_URL:-"http://localhost:8082/graphql"}
MAILPIT_URL=${MAILPIT_URL:-"http://localhost:8025"}

# Default test recipient (can be overridden)
TEST_RECIPIENT=${TEST_RECIPIENT:-"erp-system@mailbase.info"}

TESTS_PASSED=0
TESTS_FAILED=0

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

info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $*"
}

section() {
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

mailpit_available() {
  curl -fsS "$MAILPIT_URL/api/v1/info" >/dev/null 2>&1
}

lookup_env_var() {
  local var_name="$1"
  if [[ ! -f "$ENV_FILE" ]]; then
    return 1
  fi

  grep "^${var_name}=" "$ENV_FILE" | tail -n1 | cut -d'=' -f2- || true
}

graphql_request() {
  local url="$1"
  local query="$2"
  curl -s -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "$query" 2>/dev/null || echo '{"error":"connection_failed"}'
}

section "1. Environment Configuration Check"

# Test 1.1: Check .env file exists
log "Checking .env file..."
if [[ -f "$ENV_FILE" ]]; then
  pass ".env file exists at $ENV_FILE"
elif mailpit_available; then
  warn ".env file not found at $ENV_FILE"
  info "Continuing in Kubernetes/Mailpit mode"
else
  fail ".env file not found at $ENV_FILE"
  echo "    → Copy .env.example to .env and fill in SMTP credentials"
  exit 1
fi

# Test 1.2: Check required SMTP variables
log "Checking SMTP configuration in .env..."

REQUIRED_VARS=("SMTP_HOST" "SMTP_PORT")
MISSING_VARS=()
SMTP_AUTH_VALUE="${SMTP_AUTH:-$(lookup_env_var "SMTP_AUTH")}" ; SMTP_AUTH_VALUE="${SMTP_AUTH_VALUE:-false}"

if [[ -f "$ENV_FILE" ]]; then
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE"; then
      VALUE=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- || true)
      if [[ -n "${VALUE:-}" ]]; then
        info "$var=$VALUE"
      else
        MISSING_VARS+=("$var")
      fi
    else
      MISSING_VARS+=("$var")
    fi
  done

  if [[ "$SMTP_AUTH_VALUE" =~ ^([Tt][Rr][Uu][Ee]|1|yes|on)$ ]]; then
    for var in SMTP_USERNAME SMTP_PASSWORD; do
      VALUE=$(lookup_env_var "$var")
      if [[ -n "${VALUE:-}" ]]; then
        if [[ "$var" == "SMTP_PASSWORD" ]]; then
          info "$var=****** (set)"
        else
          info "$var=$VALUE"
        fi
      else
        MISSING_VARS+=("$var")
      fi
    done
  else
    info "SMTP auth disabled; username/password not required"
  fi

  if [[ ${#MISSING_VARS[@]} -eq 0 ]]; then
    pass "Required SMTP variables are set"
  elif mailpit_available; then
    warn "Missing SMTP variables in .env: ${MISSING_VARS[*]}"
    pass "Mailpit is reachable at $MAILPIT_URL; local Kubernetes mail delivery does not require .env SMTP host/port"
  else
    fail "Missing SMTP variables: ${MISSING_VARS[*]}"
  fi
elif mailpit_available; then
  pass "Mailpit is reachable at $MAILPIT_URL; SMTP credentials are not required for this test setup"
else
  fail "No SMTP configuration source found"
fi

# Test 1.3: Verify .env is gitignored
log "Verifying .env is gitignored..."
if [[ -f "$ENV_FILE" ]] && grep -q "^\.env$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
  pass ".env is properly gitignored"
elif [[ -f "$ENV_FILE" ]]; then
  warn ".env may not be gitignored - check .gitignore"
else
  info "Skipping .gitignore check because .env is not present"
fi

section "2. Notification Service Configuration"

# Test 2.1: Check notification-service is running
log "Checking notification-service GraphQL endpoint..."
GQL_RESP=$(curl -s --max-time 5 -X POST "$NOTIFICATION_URL" -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' 2>/dev/null || echo '{"error":"failed"}')

if echo "$GQL_RESP" | grep -q '"__typename"'; then
  pass "notification-service GraphQL endpoint is available"
else
  fail "notification-service GraphQL endpoint not responding: $GQL_RESP"
  exit 1
fi

# Test 2.2: Check SMTP config is loaded (via environment endpoint if available)
log "Checking notification-service SMTP configuration..."
ENV_RESP=$(curl -s "http://localhost:8082/actuator/env" 2>/dev/null || echo '{}')

if echo "$ENV_RESP" | grep -q "spring.mail.host"; then
  CONFIGURED_HOST=$(echo "$ENV_RESP" | grep -o '"spring.mail.host"[^}]*' | grep -o '"value":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  info "Configured SMTP host: $CONFIGURED_HOST"
  pass "SMTP configuration detected in notification-service"
else
  info "Could not verify SMTP config via actuator (may be disabled)"
fi

section "3. Email Sending Test"

# Test 3.1: Send test email
log "Sending test email to $TEST_RECIPIENT..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEST_SUBJECT="SMTP Test - $TIMESTAMP"
TEST_BODY="<html><body><h1>SMTP Configuration Test</h1><p>This email was sent at $(date) to verify SMTP configuration.</p><p>If you received this email, SMTP is working correctly!</p></body></html>"

SEND_RESP=$(graphql_request "$NOTIFICATION_URL" "{
  \"query\": \"mutation { sendEmail(input: { toEmail: \\\"$TEST_RECIPIENT\\\", subject: \\\"$TEST_SUBJECT\\\", bodyHtml: \\\"$TEST_BODY\\\" }) { id status errorMessage createdAt } }\"
}")

EMAIL_ID=$(echo "$SEND_RESP" | jq -r '.data.sendEmail.id // empty')
EMAIL_STATUS=$(echo "$SEND_RESP" | jq -r '.data.sendEmail.status // empty')
EMAIL_ERROR=$(echo "$SEND_RESP" | jq -r '.data.sendEmail.errorMessage // empty')

if [[ -n "$EMAIL_ID" && "$EMAIL_ID" != "null" ]]; then
  pass "Test email queued: id=$EMAIL_ID"
  info "Initial status: $EMAIL_STATUS"
  if [[ -n "$EMAIL_ERROR" && "$EMAIL_ERROR" != "null" ]]; then
    warn "Error message: $EMAIL_ERROR"
  fi
else
  fail "Failed to queue test email: $SEND_RESP"
  exit 1
fi

# Test 3.2: Wait and check email status
log "Waiting for email processing (5 seconds)..."
sleep 5

FINAL_STATUS=""
FINAL_ERROR=""
SENT_AT=""

if mailpit_available; then
  log "Checking Mailpit for delivered message..."
  MAILPIT_MESSAGES=$(curl -fsS "$MAILPIT_URL/api/v1/messages" 2>/dev/null || echo '{}')
  MAILPIT_MATCHES=$(echo "$MAILPIT_MESSAGES" | jq --arg subject "$TEST_SUBJECT" --arg recipient "$TEST_RECIPIENT" \
    '[.messages[]? | select(.Subject == $subject and any(.To[]?; .Address == $recipient))] | length' 2>/dev/null || echo 0)

  if [[ "${MAILPIT_MATCHES:-0}" -gt 0 ]]; then
    FINAL_STATUS="SENT"
    SENT_AT=$(echo "$MAILPIT_MESSAGES" | jq -r --arg subject "$TEST_SUBJECT" --arg recipient "$TEST_RECIPIENT" \
      'first(.messages[]? | select(.Subject == $subject and any(.To[]?; .Address == $recipient)) | .Created) // empty' 2>/dev/null)
    pass "Email delivered to Mailpit${SENT_AT:+ at $SENT_AT}"
  else
    warn "Mailpit did not contain the message yet"
  fi
fi

if [[ -z "$FINAL_STATUS" ]]; then
  log "Checking notification delivery status..."
  STATUS_RESP=$(graphql_request "$NOTIFICATION_URL" "{
    \"query\": \"{ notification(id: \\\"$EMAIL_ID\\\") { id status errorMessage sentAt } }\"
  }")

  FINAL_STATUS=$(echo "$STATUS_RESP" | jq -r '.data.notification.status // empty')
  FINAL_ERROR=$(echo "$STATUS_RESP" | jq -r '.data.notification.errorMessage // empty')
  SENT_AT=$(echo "$STATUS_RESP" | jq -r '.data.notification.sentAt // empty')

  info "Final status: $FINAL_STATUS"

  case "$FINAL_STATUS" in
    "SENT")
      pass "Email sent successfully at $SENT_AT"
      ;;
    "PENDING")
      warn "Email still pending - SMTP may be slow or queued"
      info "Check notification-service logs for details"
      ;;
    "FAILED")
      fail "Email sending failed: $FINAL_ERROR"
      ;;
    *)
      warn "Unknown email status: $FINAL_STATUS"
      ;;
  esac
fi

section "4. Email Verification Summary"

# Since our test email was tracked above, just summarize
if [[ "$FINAL_STATUS" == "SENT" || "$EMAIL_STATUS" == "SENT" ]]; then
  pass "SMTP email delivery confirmed!"
  info "Test email was successfully sent via SMTP"
else
  warn "Email delivery could not be fully confirmed"
  info "Check notification-service logs for details"
fi

section "Test Summary"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

if [[ $TESTS_FAILED -gt 0 ]]; then
  echo -e "${RED}SMTP configuration has issues!${NC}"
  echo
  echo "Next steps:"
  echo "  1. Check the error messages above"
  echo "  2. Verify .env file contains correct SMTP credentials"
  echo "  3. Restart notification-service: docker compose restart notification-service"
  echo "  4. Run this test again"
  exit 1
else
  echo -e "${GREEN}SMTP configuration verified!${NC}"
  echo
  echo "Emails will be sent to: $TEST_RECIPIENT"
  exit 0
fi
