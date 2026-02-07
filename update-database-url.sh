#!/bin/bash

# Script to update DATABASE_URL in Vercel
# Usage: ./update-database-url.sh "your-connection-string-here"

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the Supabase connection pooling URL"
  echo "Usage: ./update-database-url.sh \"postgresql://postgres...\""
  exit 1
fi

CONNECTION_STRING="$1"

echo "🔄 Updating DATABASE_URL in all Vercel environments..."
echo ""

for env in production preview development; do
  echo "Removing old DATABASE_URL from $env..."
  vercel env rm DATABASE_URL $env <<< "y" 2>/dev/null

  echo "Adding new DATABASE_URL to $env..."
  printf "%s" "$CONNECTION_STRING" | vercel env add DATABASE_URL $env

  if [ $? -eq 0 ]; then
    echo "✅ Updated $env"
  else
    echo "❌ Failed to update $env"
  fi
  echo ""
done

echo "✅ All environments updated!"
echo "🚀 Now run: vercel --prod"
