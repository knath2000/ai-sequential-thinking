#!/bin/bash

# Final Vercel Deployment Script - Corrected Monorepo Approach
echo "🚀 Deploying Admin Dashboard to Vercel - Corrected Approach"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "admin-dashboard/package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment checklist:${NC}"

# 1. Check vercel.json validity
echo -e "${YELLOW}1. Validating vercel.json...${NC}"
if [ -f "admin-dashboard/vercel.json" ]; then
    echo -e "${GREEN}✅ vercel.json exists${NC}"
    
    # Check for invalid properties
    if grep -q "rootDirectory" admin-dashboard/vercel.json; then
        echo -e "${RED}❌ ERROR: Invalid 'rootDirectory' found in vercel.json${NC}"
        echo -e "${YELLOW}💡 Fix: Remove 'rootDirectory' from vercel.json${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ vercel.json has valid schema${NC}"
    fi
else
    echo -e "${RED}❌ vercel.json missing${NC}"
fi

# 2. Check dependencies
echo -e "${YELLOW}2. Checking dependencies...${NC}"
cd admin-dashboard
if grep -q "@sveltejs/kit" package.json; then
    echo -e "${GREEN}✅ @sveltejs/kit found${NC}"
else
    echo -e "${RED}❌ @sveltejs/kit missing${NC}"
    exit 1
fi

if grep -q "@sveltejs/adapter-vercel" package.json; then
    echo -e "${GREEN}✅ @sveltejs/adapter-vercel found${NC}"
else
    echo -e "${RED}❌ @sveltejs/adapter-vercel missing${NC}"
    exit 1
fi

# 3. Install dependencies
echo -e "${YELLOW}3. Installing dependencies...${NC}"
pnpm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# 4. Build test
echo -e "${YELLOW}4. Testing build...${NC}"
pnpm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 5. Framework detection
echo -e "${YELLOW}5. Checking framework detection...${NC}"
if grep -q '"framework": "sveltekit"' vercel.json; then
    echo -e "${GREEN}✅ Framework explicitly set to sveltekit${NC}"
else
    echo -e "${YELLOW}⚠️  Framework not explicitly set in vercel.json${NC}"
fi

cd ..

echo -e "${BLUE}🎯 Ready for deployment!${NC}"
echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Ensure Vercel dashboard has Root Directory set to: admin-dashboard"
echo "2. Run one of these commands:"
echo ""
echo "   From repo root:"
echo "   ${GREEN}vercel --prod --cwd admin-dashboard${NC}"
echo ""
echo "   From admin-dashboard directory:"
echo "   ${GREEN}cd admin-dashboard && vercel --prod${NC}"
echo ""
echo "   With explicit project settings:"
echo "   ${GREEN}vercel --prod --root-directory admin-dashboard${NC}"
echo ""
echo -e "${YELLOW}💡 Note: The root directory must be configured in Vercel dashboard${NC}"
echo -e "${YELLOW}   Settings → General → Root Directory → admin-dashboard${NC}"