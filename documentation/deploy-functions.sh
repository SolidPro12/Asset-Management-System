#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys all Edge Functions to your Supabase project

echo "🚀 Deploying Supabase Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project is not linked to Supabase."
    echo "Link it with: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📦 Deploying all functions..."
echo ""

# Deploy all functions
supabase functions deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All functions deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Verify functions in Supabase dashboard"
    echo "2. Set RESEND_API_KEY secret if using email functions"
    echo "3. Test functions to ensure they work"
else
    echo ""
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

