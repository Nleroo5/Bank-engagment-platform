#!/bin/bash

# This script adds all required environment variables to Vercel
# Run this once to configure your production environment

echo "🚀 Setting up Vercel environment variables..."
echo ""

# Generate a secure NEXTAUTH_SECRET for production
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Production URL
PROD_URL="https://bank-engagment-platform.vercel.app"

# Add environment variables to Vercel (production environment)
echo "Adding DATABASE_URL..."
vercel env add DATABASE_URL production <<< "postgresql://postgres:Nicoli77%24%24@db.nhivlybbsffxrpwdwbbp.supabase.co:5432/postgres"

echo "Adding NEXTAUTH_SECRET..."
vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"

echo "Adding NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL production <<< "$PROD_URL"

echo "Adding BASE_URL..."
vercel env add BASE_URL production <<< "$PROD_URL"

echo "Adding NEXT_PUBLIC_SANITY_PROJECT_ID..."
vercel env add NEXT_PUBLIC_SANITY_PROJECT_ID production <<< "4z8cbios"

echo "Adding NEXT_PUBLIC_SANITY_DATASET..."
vercel env add NEXT_PUBLIC_SANITY_DATASET production <<< "production"

# Optional: Add these if you have real values
# echo "Adding SANITY_API_TOKEN..."
# vercel env add SANITY_API_TOKEN production <<< "your-actual-token"

# echo "Adding RESEND_API_KEY..."
# vercel env add RESEND_API_KEY production <<< "your-actual-api-key"

echo ""
echo "✅ Environment variables added!"
echo ""
echo "🔄 Now redeploy your app:"
echo "   vercel --prod"
echo ""
