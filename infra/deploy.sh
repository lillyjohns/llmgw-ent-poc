#!/bin/bash
set -e

echo "🚀 LLM Gateway - One-Command Deploy"
echo "======================================"
echo ""

# Get script directory (infra/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 1. Build Lambda
echo "📦 Building Lambda code..."
cd "$PROJECT_DIR/lambda-deploy"
npm ci --silent
npx tsc
echo "   ✓ Lambda built"

# 2. Build UI
echo "🎨 Building Admin UI..."
cd "$PROJECT_DIR/ui"
npm ci --silent
npm run build --silent
echo "   ✓ UI built"

# 3. Deploy CDK
echo "☁️  Deploying to AWS..."
cd "$SCRIPT_DIR"
npm ci --silent
npx cdk deploy --require-approval never "$@"

echo ""
echo "✅ Done! Check the outputs above for your endpoints."
