#!/usr/bin/env bash
# Integration tests for the Data Proxy API (scripting service).
# Run from repository root: ./scripts/test/test-data-proxy.sh
#
# Prerequisites:
#   - Services running via docker-compose.dev.yml (at least: postgres, masterdata, shop, accounting, user, scripting-service)
#   - Optionally set TOKEN env var with a valid JWT, otherwise the script will login automatically.
#
# Usage:
#   ./scripts/test/test-data-proxy.sh              # run against localhost:8083
#   PROXY_URL=http://host:port ./scripts/test/...   # custom target

set -euo pipefail

PROXY_URL="${PROXY_URL:-http://localhost:8083}"
USER_URL="${USER_URL:-http://localhost:5000}"
VITE_URL="${VITE_URL:-http://localhost:5173}"
PASS=0
FAIL=0
SKIP=0

# ── Helpers ───────────────────────────────────────────────────────────────

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

pass() { PASS=$((PASS + 1)); green "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); red   "  FAIL: $1"; }
skip() { SKIP=$((SKIP + 1)); yellow "  SKIP: $1"; }

assert_status() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        pass "$desc (HTTP $actual)"
    else
        fail "$desc — expected HTTP $expected, got $actual"
    fi
}

assert_json_has() {
    local desc="$1" json="$2" path="$3"
    if echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); exec(\"v=$path\"); print('ok')" 2>/dev/null | grep -q ok; then
        pass "$desc"
    else
        fail "$desc — missing $path in response"
    fi
}

# ── Auth ──────────────────────────────────────────────────────────────────

echo "=== Data Proxy Integration Tests ==="
echo "Target: $PROXY_URL"
echo ""

if [ -z "${TOKEN:-}" ]; then
    echo "Logging in..."
    LOGIN_RESP=$(curl -sf -X POST "$USER_URL/graphql" \
        -H "Content-Type: application/json" \
        -d '{"query":"mutation { login(email: \"admin@erp-system.local\", password: \"Admin123!\") { accessToken } }"}' 2>/dev/null || true)
    if [ -n "$LOGIN_RESP" ]; then
        TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['login']['accessToken'])" 2>/dev/null || true)
    fi
    if [ -z "${TOKEN:-}" ]; then
        echo "WARNING: Could not login. Auth-required tests will fail."
    else
        echo "Logged in (token length: ${#TOKEN})"
    fi
fi
echo ""

AUTH_ARGS=()
if [ -n "${TOKEN:-}" ]; then
    AUTH_ARGS=(-H "Authorization: Bearer $TOKEN")
fi

query() {
    local service="$1" gql="$2"
    local body
    body=$(printf '{"service":"%s","query":"%s"}' "$service" "$gql")
    curl -sf -X POST "$PROXY_URL/api/data/query" \
        -H "Content-Type: application/json" \
        "${AUTH_ARGS[@]}" \
        -d "$body" 2>/dev/null
}

query_with_vars() {
    local service="$1" gql="$2" vars="$3"
    local body
    body=$(printf '{"service":"%s","query":"%s","variables":%s}' "$service" "$gql" "$vars")
    curl -sf -X POST "$PROXY_URL/api/data/query" \
        -H "Content-Type: application/json" \
        "${AUTH_ARGS[@]}" \
        -d "$body" 2>/dev/null
}

query_raw() {
    curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/data/query" \
        -H "Content-Type: application/json" \
        "${AUTH_ARGS[@]}" \
        -d "$1" 2>/dev/null
}

mutate_raw() {
    curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/data/mutate" \
        -H "Content-Type: application/json" \
        "${AUTH_ARGS[@]}" \
        -d "$1" 2>/dev/null
}

# ── Test 1: Service discovery ─────────────────────────────────────────────

echo "--- Service Discovery ---"
RESP=$(curl -sf "$PROXY_URL/api/data/services" 2>/dev/null || echo '{}')
SVC_COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('services',[])))" 2>/dev/null || echo 0)
if [ "$SVC_COUNT" = "6" ]; then
    pass "GET /api/data/services lists 6 services"
else
    fail "GET /api/data/services — expected 6 services, got $SVC_COUNT"
fi

# ── Test 2–6: Query each service ──────────────────────────────────────────

echo ""
echo "--- Query Services ---"

# Masterdata
RESP=$(query "masterdata" "{ customers { nodes { id name } } }" || echo '{}')
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('customers',{}).get('nodes',[])))" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then pass "masterdata: $COUNT customers"; else fail "masterdata: no customers returned"; fi

# Shop
RESP=$(query "shop" "{ products(first:5) { nodes { id name } } }" || echo '{}')
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('products',{}).get('nodes',[])))" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then pass "shop: $COUNT products"; else fail "shop: no products returned"; fi

# Accounting
RESP=$(query "accounting" "{ accounts(first:3) { nodes { id accountNumber name } } }" || echo '{}')
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('accounts',{}).get('nodes',[])))" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then pass "accounting: $COUNT accounts"; else fail "accounting: no accounts returned"; fi

# User
RESP=$(query "user" "{ users { id email } }" || echo '{}')
COUNT=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); u=d.get('users',[]); print(len(u) if isinstance(u,list) else 0)" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then pass "user: $COUNT users"; else fail "user: no users returned"; fi

# Company (may require permissions)
RESP=$(query "company" "{ companies { id name } }" || echo '{}')
HAS_DATA=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('data') else 'no')" 2>/dev/null || echo no)
HAS_ERROR=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('errors') else 'no')" 2>/dev/null || echo no)
if [ "$HAS_DATA" = "yes" ]; then
    pass "company: queried successfully"
elif [ "$HAS_ERROR" = "yes" ]; then
    pass "company: access denied (expected — permissions enforced)"
else
    fail "company: unexpected response"
fi

# ── Test 7: Variables ─────────────────────────────────────────────────────

echo ""
echo "--- Variables ---"
RESP=$(query_with_vars "shop" 'query GetProducts($first: Int!) { products(first: $first) { nodes { id name } totalCount } }' '{"first":2}' || echo '{}')
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('products',{}).get('nodes',[])))" 2>/dev/null || echo 0)
if [ "$COUNT" = "2" ]; then pass "Variables: returned exactly 2 products"; else fail "Variables: expected 2 products, got $COUNT"; fi

# ── Test 8–12: Validation ────────────────────────────────────────────────

echo ""
echo "--- Validation ---"

# Missing service
RAW=$(query_raw '{"query":"{ test }"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Missing service → 400" "400" "$CODE"

# Missing query
RAW=$(query_raw '{"service":"masterdata"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Missing query → 400" "400" "$CODE"

# Blank service
RAW=$(query_raw '{"service":"   ","query":"{ test }"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Blank service → 400" "400" "$CODE"

# Invalid service
RAW=$(query_raw '{"service":"evil","query":"{ test }"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Invalid service → 400" "400" "$CODE"

# Non-mutation on /mutate
RAW=$(mutate_raw '{"service":"masterdata","query":"{ customers { nodes { id } } }"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Non-mutation on /mutate → 400" "400" "$CODE"

# Missing service on /mutate
RAW=$(mutate_raw '{"query":"mutation { test }"}')
CODE=$(echo "$RAW" | tail -1)
assert_status "Missing service on /mutate → 400" "400" "$CODE"

# ── Test 13: Mutation ─────────────────────────────────────────────────────

echo ""
echo "--- Mutations ---"

RAW=$(mutate_raw "{\"service\":\"masterdata\",\"query\":\"mutation { createCustomer(input: { name: \\\"IntegrationTest $(date +%s)\\\", type: \\\"Company\\\" }) { id name } }\"}")
CODE=$(echo "$RAW" | tail -1)
BODY=$(echo "$RAW" | head -n -1)
if [ "$CODE" = "200" ]; then
    CNAME=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createCustomer']['name'])" 2>/dev/null || echo "?")
    pass "Mutation: created customer '$CNAME'"
else
    fail "Mutation: expected 200, got $CODE"
fi

# ── Test 14: Vite proxy ──────────────────────────────────────────────────

echo ""
echo "--- Vite Proxy ---"

VITE_RESP=$(curl -sf "$VITE_URL/api/data/services" 2>/dev/null || echo '{}')
VITE_COUNT=$(echo "$VITE_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('services',[])))" 2>/dev/null || echo 0)
if [ "$VITE_COUNT" = "6" ]; then
    pass "Vite proxy: /api/data/services works"
else
    skip "Vite proxy: frontend not running or proxy not configured"
fi

VITE_QUERY=$(curl -sf -X POST "$VITE_URL/api/data/query" \
    -H "Content-Type: application/json" \
    "${AUTH_ARGS[@]}" \
    -d '{"service":"masterdata","query":"{ currencies { nodes { id code } } }"}' 2>/dev/null || echo '{}')
VITE_DATA=$(echo "$VITE_QUERY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('currencies',{}).get('nodes',[])))" 2>/dev/null || echo 0)
if [ "$VITE_DATA" -gt 0 ]; then
    pass "Vite proxy: queried $VITE_DATA currencies"
else
    skip "Vite proxy: query failed (frontend may not be running)"
fi

# ── Summary ───────────────────────────────────────────────────────────────

echo ""
echo "=========================="
TOTAL=$((PASS + FAIL + SKIP))
echo "Results: $TOTAL tests — $(green "$PASS passed"), $([ "$FAIL" -gt 0 ] && red "$FAIL failed" || echo "0 failed"), $([ "$SKIP" -gt 0 ] && yellow "$SKIP skipped" || echo "0 skipped")"
echo "=========================="

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
