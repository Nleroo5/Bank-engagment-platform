#!/bin/bash

# Add CORS origins to Sanity project
# This script adds your production domain to Sanity's allowed CORS origins

echo "🔧 Adding CORS origins to Sanity project..."
echo ""
echo "This script will add the following origins:"
echo "  - https://drivemoreleads.co"
echo "  - https://www.drivemoreleads.co"
echo "  - http://localhost:3000"
echo "  - http://localhost:3333"
echo ""

# Note: You'll need to do this manually in Sanity Manage
# because the Sanity CLI doesn't have a command to add CORS origins

echo "⚠️  IMPORTANT: CORS origins must be added via the Sanity Management Console"
echo ""
echo "Steps:"
echo "1. Go to https://www.sanity.io/manage"
echo "2. Select your project (4z8cbios)"
echo "3. Click 'API' in the left sidebar"
echo "4. Scroll to 'CORS Origins'"
echo "5. Click 'Add CORS Origin' and add:"
echo "   - https://drivemoreleads.co (with credentials)"
echo "   - https://www.drivemoreleads.co (with credentials)"
echo "   - http://localhost:3000 (with credentials)"
echo "   - http://localhost:3333 (with credentials)"
echo "6. Click 'Save'"
echo ""
echo "✅ Once added, your domain will be able to connect to Sanity"
