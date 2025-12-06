#!/bin/bash
# Deploy Mermaid2SF API to DigitalOcean
# Usage: ./scripts/deploy-to-digitalocean.sh <droplet-ip>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Droplet IP required${NC}"
    echo "Usage: $0 <droplet-ip>"
    exit 1
fi

DROPLET_IP=$1
SSH_USER="mermaid2sf"
APP_DIR="/home/mermaid2sf/app"

echo -e "${GREEN}🚀 Deploying Mermaid2SF API to DigitalOcean${NC}"
echo "Droplet IP: $DROPLET_IP"
echo ""

# Pre-deployment checks
echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"
npm test
npm run build
echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

# SSH and deploy
echo -e "${YELLOW}📤 Deploying to droplet...${NC}"

ssh ${SSH_USER}@${DROPLET_IP} << 'ENDSSH'
set -e

echo "📥 Pulling latest changes..."
cd /home/mermaid2sf/app
git pull origin feature/api-deployment

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "🧪 Running tests..."
npm test

echo "🔄 Restarting PM2..."
pm2 restart mermaid2sf-api

echo "✅ Deployment complete!"
pm2 status
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "Test the API:"
echo "  curl http://${DROPLET_IP}/health"
echo "  curl -X POST http://${DROPLET_IP}/api/compile -H 'Content-Type: application/json' -d '{\"mermaidText\":\"flowchart TD\\n  Start[START: Begin]\\n  End[END: Complete]\\n  Start --> End\"}'"
echo ""
echo "View logs:"
echo "  ssh ${SSH_USER}@${DROPLET_IP} 'pm2 logs mermaid2sf-api'"
