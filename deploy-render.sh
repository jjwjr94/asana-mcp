#!/bin/bash

# Render Deployment Script for Asana MCP HTTP Server

echo "🚀 Preparing Asana MCP HTTP Server for Render deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Please ensure you have the render configuration."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if dist files exist
if [ ! -f "dist/http-server.js" ]; then
    echo "❌ Error: dist/http-server.js not found. Build may have failed."
    exit 1
fi

echo ""
echo "🎯 Ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Add HTTP server for n8n integration'"
echo "   git push origin main"
echo ""
echo "2. Deploy to Render:"
echo "   - Go to https://render.com"
echo "   - Connect your GitHub repository"
echo "   - Use render.yaml for configuration"
echo "   - Set ASANA_ACCESS_TOKEN environment variable"
echo ""
echo "3. Test your deployment:"
echo "   curl https://your-service-name.onrender.com/health"
echo ""
echo "4. Integrate with n8n:"
echo "   - Use your Render URL in n8n HTTP Request nodes"
echo "   - Set x-asana-token header with your Asana token"
echo ""

echo "📚 See README-HTTP.md for detailed integration instructions."
