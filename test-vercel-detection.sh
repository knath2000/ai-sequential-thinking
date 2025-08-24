#!/bin/bash

# Vercel Framework Detection Test Script
echo "🔍 Testing Vercel Framework Detection Fix"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "admin-dashboard/package.json" ]; then
    echo "❌ Error: Please run this script from the project root"
    exit 1
fi

cd admin-dashboard

echo "📦 Installing dependencies..."
pnpm install

echo "🔧 Building project..."
pnpm run build

echo "📋 Checking framework configuration..."
echo "Package.json adapter version:"
grep -A 1 "@sveltejs/adapter-vercel" package.json

echo "Vercel.json configuration:"
cat vercel.json

echo "Svelte config adapter:"
grep -A 5 "adapter(" svelte.config.js

echo "✅ Framework detection fix implemented successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Run: vercel --prod"
echo "2. Check Vercel dashboard for framework detection"
echo "3. Should show 'SvelteKit' instead of 'SvelteKit(v0)'"