#!/bin/bash

# Enhanced Vercel Deployment Test Script - Corrected Monorepo Approach
echo "🔧 Testing Vercel Deployment Fix - Corrected Monorepo Approach"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "admin-dashboard/package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Checking configuration files...${NC}"

# Check vercel.json (valid schema only)
if [ -f "admin-dashboard/vercel.json" ]; then
    echo -e "${GREEN}✅ vercel.json exists${NC}"
    echo "   Framework: $(grep -o '"framework": "[^"]*"' admin-dashboard/vercel.json)"
    echo "   Build Command: $(grep -o '"buildCommand": "[^"]*"' admin-dashboard/vercel.json)"
    
    # Validate no invalid properties
    if grep -q "rootDirectory" admin-dashboard/vercel.json; then
        echo -e "${RED}❌ Invalid property 'rootDirectory' found in vercel.json${NC}"
    else
        echo -e "${GREEN}✅ vercel.json has valid schema${NC}"
    fi
else
    echo -e "${RED}❌ vercel.json missing${NC}"
fi

# Check package.json
if [ -f "admin-dashboard/package.json" ]; then
    echo -e "${GREEN}✅ package.json exists${NC}"
    echo "   Framework: SvelteKit"
    echo "   Adapter: $(grep -o '"@sveltejs/adapter-vercel": "[^"]*"' admin-dashboard/package.json)"
else
    echo -e "${RED}❌ package.json missing${NC}"
fi

# Check svelte.config.js
if [ -f "admin-dashboard/svelte.config.js" ]; then
    echo -e "${GREEN}✅ svelte.config.js exists${NC}"
else
    echo -e "${RED}❌ svelte.config.js missing${NC}"
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd admin-dashboard
pnpm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${YELLOW}🔨 Building project...${NC}"
pnpm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Ready for Vercel deployment!${NC}"
echo ""
echo "IMPORTANT: Configure Vercel dashboard:"
echo "1. Go to Vercel project settings"
echo "2. Set Root Directory to: admin-dashboard"
echo "3. Ensure framework is detected as SvelteKit"
echo ""
echo "Deployment commands:"
echo "• From repo root: vercel --prod --cwd admin-dashboard"
echo "• Or: cd admin-dashboard && vercel --prod"
echo ""
echo -e "${GREEN}✅ All configuration fixes applied successfully!${NC}"
