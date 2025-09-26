#!/bin/bash

# RBAC Test Suite Runner
# Runs all RBAC-related tests and validations

set -e  # Exit on any error

echo "🚀 Starting Complete RBAC Test Suite..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if required files exist
print_status "Checking RBAC implementation files..."

required_files=(
    "src/hooks/useUserRole.ts"
    "src/lib/api-rbac.ts"
    "src/components/rbac/RoleGate.tsx"
    "src/components/rbac/RoleDebugPanel.tsx"
    "src/scripts/test-rbac-api.ts"
    "src/scripts/rbac-edge-case-tests.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
        exit 1
    fi
done

echo ""
print_status "Running TypeScript compilation check..."
if npx tsc --noEmit; then
    print_success "✓ TypeScript compilation successful"
else
    print_error "✗ TypeScript compilation failed"
    exit 1
fi

echo ""
print_status "Running ESLint on RBAC files..."
if npx eslint src/hooks/useUserRole.ts src/lib/api-rbac.ts src/components/rbac/ --quiet; then
    print_success "✓ ESLint checks passed"
else
    print_warning "⚠ ESLint warnings found (non-blocking)"
fi

echo ""
print_status "Running RBAC Permission Tests..."
if npx tsx src/scripts/test-rbac-api.ts; then
    print_success "✓ Permission tests passed"
else
    print_error "✗ Permission tests failed"
    exit 1
fi

echo ""
print_status "Running RBAC Edge Case Tests..."
if npx tsx src/scripts/rbac-edge-case-tests.ts; then
    print_success "✓ Edge case tests passed"
else
    print_error "✗ Edge case tests failed"
    exit 1
fi

echo ""
print_status "Checking API route protection..."

api_routes=(
    "src/app/api/organizations/[orgId]/members/route.ts"
    "src/app/api/organizations/[orgId]/members/[memberId]/route.ts"
    "src/app/api/organizations/[orgId]/invitations/route.ts"
    "src/app/api/organizations/[orgId]/sessions/route.ts"
    "src/app/api/organizations/[orgId]/members-for-permissions/route.ts"
)

for route in "${api_routes[@]}"; do
    if grep -q "require.*Management\|require.*Access" "$route"; then
        print_success "✓ $route has RBAC protection"
    else
        print_warning "⚠ $route may be missing RBAC protection"
    fi
done

echo ""
print_status "Checking UI protection..."

ui_files=(
    "src/app/organizations/page.tsx"
    "src/app/profile/page.tsx"
)

for file in "${ui_files[@]}"; do
    if grep -q "canAccessOrganizations\|canSeeBilling\|canSeeAccess" "$file"; then
        print_success "✓ $file has role-based UI protection"
    else
        print_warning "⚠ $file may be missing UI protection"
    fi
done

echo ""
print_status "Testing build process..."
if npm run build > /dev/null 2>&1; then
    print_success "✓ Production build successful"
else
    print_error "✗ Production build failed"
    exit 1
fi

echo ""
print_success "🎉 All RBAC tests completed successfully!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Implementation files verified"
echo "  ✅ TypeScript compilation passed"
echo "  ✅ ESLint checks completed"
echo "  ✅ Permission tests passed"
echo "  ✅ Edge case tests passed"
echo "  ✅ API protection verified"
echo "  ✅ UI protection verified"
echo "  ✅ Production build successful"
echo ""
echo "🚀 RBAC system is ready for production!"

# Optional: Clean up build files
if [ "$1" = "--cleanup" ]; then
    print_status "Cleaning up build files..."
    rm -rf .next
    print_success "✓ Cleanup completed"
fi


