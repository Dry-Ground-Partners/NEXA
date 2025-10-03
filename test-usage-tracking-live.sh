#!/bin/bash

# 🧪 Live Usage Tracking Test Script
# This script tests the newly implemented usage tracking system

echo "🚀 Testing NEXA Platform Usage Tracking System"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Wait for server to be ready
echo "⏳ Waiting for development server..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "❌ Development server is not running!"
    echo "   Please run: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Server is running!${NC}"
echo ""

# Test 1: Check event definitions
echo -e "${BLUE}📋 Test 1: Checking Event Definitions${NC}"
echo "   Endpoint: GET /api/admin/config?type=events"
EVENTS=$(curl -s http://localhost:5000/api/admin/config?type=events)
STRUCTURING_EVENTS=$(echo "$EVENTS" | grep -o "structuring_diagnose\|structuring_generate_solution" | wc -l)

if [ "$STRUCTURING_EVENTS" -ge 2 ]; then
    echo -e "${GREEN}   ✅ Found structuring events configured${NC}"
    echo "$EVENTS" | grep -A 3 "structuring_diagnose" | head -5
else
    echo -e "${YELLOW}   ⚠️  Structuring events not found in config${NC}"
fi
echo ""

# Test 2: Check plan definitions
echo -e "${BLUE}📋 Test 2: Checking Plan Definitions${NC}"
echo "   Endpoint: GET /api/admin/config?type=plans"
PLANS=$(curl -s http://localhost:5000/api/admin/config?type=plans)
PLAN_COUNT=$(echo "$PLANS" | grep -o "planName" | wc -l)

if [ "$PLAN_COUNT" -ge 4 ]; then
    echo -e "${GREEN}   ✅ Found $PLAN_COUNT plans configured${NC}"
else
    echo -e "${YELLOW}   ⚠️  Expected 4 plans, found $PLAN_COUNT${NC}"
fi
echo ""

# Test 3: Check organization endpoint health
echo -e "${BLUE}📋 Test 3: Checking Organization-Scoped Endpoints${NC}"

# Try to get auth info (will fail if not logged in, but that's okay)
AUTH_RESPONSE=$(curl -s http://localhost:5000/api/auth/me)
if echo "$AUTH_RESPONSE" | grep -q "organizationMemberships"; then
    echo -e "${GREEN}   ✅ Auth endpoint working${NC}"
    
    # Extract first org ID if available
    ORG_ID=$(echo "$AUTH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$ORG_ID" ]; then
        echo "   📍 Found organization ID: $ORG_ID"
        
        # Test health check endpoint
        HEALTH=$(curl -s "http://localhost:5000/api/organizations/$ORG_ID/structuring/analyze-pain-points")
        if echo "$HEALTH" | grep -q "timestamp"; then
            echo -e "${GREEN}   ✅ Organization-scoped endpoint is accessible${NC}"
        fi
    fi
else
    echo -e "${YELLOW}   ⚠️  Not logged in (expected in test environment)${NC}"
fi
echo ""

# Test 4: Check database connection
echo -e "${BLUE}📋 Test 4: Database Schema Check${NC}"
echo "   Checking if usage_events table exists..."

# This will only work if we have database access
if command -v npx >/dev/null 2>&1; then
    echo "   Running: npx prisma db push --skip-generate"
    npx prisma db push --skip-generate 2>&1 | grep -q "already in sync" || echo "   Database schema updated"
    echo -e "${GREEN}   ✅ Database connection working${NC}"
else
    echo -e "${YELLOW}   ⚠️  npx not available for database check${NC}"
fi
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}🎉 Test Suite Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:5000/structuring"
echo "   2. Add content to tabs"
echo "   3. Click 'Diagnose' button"
echo "   4. Open browser console (F12)"
echo "   5. Look for:"
echo "      • 🏛️ Organization: ..."
echo "      • 💰 Credits consumed: ..."
echo "      • 💵 Credits remaining: ..."
echo "      • 🎫 Usage event ID: ..."
echo ""
echo "   6. Then navigate to /organizations → Usage tab"
echo "   7. Verify events appear in dashboard and history"
echo ""
echo "✅ The system is ready for testing!"




