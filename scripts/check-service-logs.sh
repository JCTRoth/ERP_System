#!/bin/bash

# ============================================================================
# Service Logs Check Script
# Checks all ERP services for errors and warnings
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "============================================================================"
echo -e "${BLUE}        ERP System - Service Logs Check${NC}"
echo "============================================================================"
echo ""

SERVICES=(
    "user-service"
    "shop-service"
    "orders-service"
    "accounting-service"
    "masterdata-service"
    "company-service"
    "translation-service"
    "notification-service"
    "templates-service"
    "gateway"
)

TOTAL_ERRORS=0
TOTAL_WARNINGS=0

for service in "${SERVICES[@]}"; do
    container="erp_system-${service}-1"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${RED}✗ $service: NOT RUNNING${NC}"
        TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
        continue
    fi
    
    # Get error count
    errors=$(docker logs --tail 500 "$container" 2>&1 | grep -ic "error" 2>/dev/null || true)
    errors=${errors:-0}
    # Get exception count (exclude "ExceptionHandler" which is a class name)
    exceptions=$(docker logs --tail 500 "$container" 2>&1 | grep -i "exception" | grep -v "ExceptionHandler" | grep -v "ExceptionMiddleware" | wc -l 2>/dev/null || true)
    exceptions=${exceptions:-0}
    # Get warning count (exclude info messages and common harmless warnings)
    warnings=$(docker logs --tail 500 "$container" 2>&1 | grep -i "warn" | grep -v "INFO" | wc -l 2>/dev/null || true)
    warnings=${warnings:-0}
    
    # Clean up whitespace
    errors=$(echo "$errors" | tr -d ' ')
    exceptions=$(echo "$exceptions" | tr -d ' ')
    warnings=$(echo "$warnings" | tr -d ' ')
    
    # Calculate totals (avoid double counting error/exception)
    error_total=$((errors + exceptions))
    
    if [ "$error_total" -gt 0 ]; then
        echo -e "${YELLOW}⚠ $service: ${error_total} error(s), ${warnings} warning(s)${NC}"
        TOTAL_ERRORS=$((TOTAL_ERRORS + error_total))
        TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
        
        # Show recent errors (last 3)
        echo "  Recent errors:"
        docker logs --tail 500 "$container" 2>&1 | grep -i -E "error|exception" | grep -v "ExceptionHandler" | grep -v "ExceptionMiddleware" | tail -3 | while read line; do
            echo "    $(echo $line | head -c 100)..."
        done
    elif [ "$warnings" -gt 0 ]; then
        echo -e "${GREEN}✓ $service: OK${NC} (${warnings} warnings)"
        TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    else
        echo -e "${GREEN}✓ $service: OK${NC}"
    fi
done

echo ""
echo "============================================================================"
echo -e "${BLUE}                    Summary${NC}"
echo "============================================================================"
echo ""

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ No critical errors found across all services${NC}"
else
    echo -e "${RED}✗ Found $TOTAL_ERRORS error(s) across services${NC}"
fi

if [ $TOTAL_WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}  Note: $TOTAL_WARNINGS warning(s) detected (usually non-critical)${NC}"
fi

echo ""
