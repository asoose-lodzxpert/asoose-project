#!/bin/bash

# Order History Sorting - Automated Enforcement Script
# Detects re-sorting bugs, missing indexes, and timestamp issues
# Run before merging any order-related PRs

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Order History Sorting Enforcement Check ===${NC}\n"

# ============================================================================
# 1. CHECK: Frontend re-sorting detection
# ============================================================================
echo -e "${BLUE}[1/5] Scanning for frontend re-sorting bugs...${NC}"

FRONTEND_ISSUES=0

# Look for .sort() on order/notification arrays in components
if grep -r "orders\|notifications" web/customer-web-app/src/app --include="*.tsx" | \
   grep -E "\.sort\(|\.reverse\(\)|orders.*sort|orders.*reverse" | \
   grep -v "orderBy\|createdAt\|// sort\|/\*.*sort"; then
  echo -e "${RED}❌ FOUND: Potential re-sorting in frontend!${NC}"
  FRONTEND_ISSUES=$((FRONTEND_ISSUES + 1))
else
  echo -e "${GREEN}✅ PASS: No illegal .sort() or .reverse() on order arrays${NC}"
fi

# ============================================================================
# 2. CHECK: Backend sorting verification
# ============================================================================
echo -e "\n${BLUE}[2/5] Verifying backend orderBy: { createdAt: 'desc' }...${NC}"

BACKEND_ISSUES=0

# Check orders service
if ! grep -q "orderBy.*createdAt.*desc" backend/src/users/orders.service.ts; then
  echo -e "${RED}❌ MISSING: orderBy in customers orders service${NC}"
  BACKEND_ISSUES=$((BACKEND_ISSUES + 1))
fi

if ! grep -q "orderBy.*createdAt.*desc" backend/src/super-admin/orders/orders.service.ts; then
  echo -e "${RED}❌ MISSING: orderBy in admin orders service${NC}"
  BACKEND_ISSUES=$((BACKEND_ISSUES + 1))
fi

if ! grep -q "orderBy.*createdAt.*desc" backend/src/vendor/orders/vendor-orders.service.ts; then
  echo -e "${RED}❌ MISSING: orderBy in vendor orders service${NC}"
  BACKEND_ISSUES=$((BACKEND_ISSUES + 1))
fi

if ! grep -q "orderBy.*createdAt.*desc" backend/src/riders/order/order.service.ts; then
  echo -e "${RED}❌ MISSING: orderBy in rider order service${NC}"
  BACKEND_ISSUES=$((BACKEND_ISSUES + 1))
fi

if [ $BACKEND_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ PASS: All order services have createdAt DESC sorting${NC}"
else
  echo -e "${RED}❌ FAIL: $BACKEND_ISSUES service(s) missing createdAt DESC sorting${NC}"
fi

# ============================================================================
# 3. CHECK: Database indexes exist
# ============================================================================
echo -e "\n${BLUE}[3/5] Verifying database indexes for createdAt...${NC}"

INDEX_ISSUES=0

# Check Prisma schema for indexes
if ! grep -q "@@index(\[createdAt(sort: Desc)\])" backend/prisma/schema.prisma; then
  echo -e "${RED}❌ MISSING: Primary createdAt DESC index in Prisma schema${NC}"
  INDEX_ISSUES=$((INDEX_ISSUES + 1))
else
  echo -e "${GREEN}✅ PASS: Primary createdAt DESC index exists${NC}"
fi

if ! grep -q "@@index(\[createdAt(sort: Desc), status\])" backend/prisma/schema.prisma; then
  echo -e "${RED}❌ MISSING: Composite createdAt DESC + status index${NC}"
  INDEX_ISSUES=$((INDEX_ISSUES + 1))
else
  echo -e "${GREEN}✅ PASS: Composite createdAt DESC + status index exists${NC}"
fi

# ============================================================================
# 4. CHECK: Frontend pagination correctness
# ============================================================================
echo -e "\n${BLUE}[4/5] Verifying frontend pagination reset on filter changes...${NC}"

PAGINATION_ISSUES=0

# Check main orders page resets page to 1 on filter change
if grep -q "setStatusFilter.*setPage(1)" web/customer-web-app/src/app/main/orders/page.tsx; then
  echo -e "${GREEN}✅ PASS: Customer orders page resets pagination on filter${NC}"
else
  echo -e "${RED}❌ MISSING: Pagination reset on filter change in customer orders${NC}"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# ============================================================================
# 5. CHECK: Timestamp field integrity
# ============================================================================
echo -e "\n${BLUE}[5/5] Verifying timestamp field definitions...${NC}"

TIMESTAMP_ISSUES=0

# Check Order model has createdAt DateTime field
if grep -A 20 "^model Order {" backend/prisma/schema.prisma | grep -q "createdAt.*DateTime"; then
  echo -e "${GREEN}✅ PASS: Order.createdAt is DateTime type${NC}"
else
  echo -e "${RED}❌ MISSING: Order.createdAt must be DateTime type${NC}"
  TIMESTAMP_ISSUES=$((TIMESTAMP_ISSUES + 1))
fi

# Check OrderGroup model has createdAt DateTime field
if grep -A 10 "^model OrderGroup {" backend/prisma/schema.prisma | grep -q "createdAt.*DateTime"; then
  echo -e "${GREEN}✅ PASS: OrderGroup.createdAt is DateTime type${NC}"
else
  echo -e "${RED}❌ MISSING: OrderGroup.createdAt must be DateTime type${NC}"
  TIMESTAMP_ISSUES=$((TIMESTAMP_ISSUES + 1))
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}=== ENFORCEMENT RESULTS ===${NC}"

TOTAL_ISSUES=$((FRONTEND_ISSUES + BACKEND_ISSUES + INDEX_ISSUES + PAGINATION_ISSUES + TIMESTAMP_ISSUES))

if [ $TOTAL_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED - Order sorting is correctly enforced${NC}"
  exit 0
else
  echo -e "${RED}❌ FOUND $TOTAL_ISSUES ISSUE(S)${NC}"
  echo ""
  echo "Breakdown:"
  [ $FRONTEND_ISSUES -gt 0 ] && echo -e "  ${RED}Frontend re-sorting issues: $FRONTEND_ISSUES${NC}"
  [ $BACKEND_ISSUES -gt 0 ] && echo -e "  ${RED}Backend sorting issues: $BACKEND_ISSUES${NC}"
  [ $INDEX_ISSUES -gt 0 ] && echo -e "  ${RED}Database index issues: $INDEX_ISSUES${NC}"
  [ $PAGINATION_ISSUES -gt 0 ] && echo -e "  ${RED}Pagination issues: $PAGINATION_ISSUES${NC}"
  [ $TIMESTAMP_ISSUES -gt 0 ] && echo -e "  ${RED}Timestamp issues: $TIMESTAMP_ISSUES${NC}"
  exit 1
fi
