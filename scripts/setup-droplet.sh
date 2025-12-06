#!/bin/bash
# Initial setup for DigitalOcean droplet
# Run this script on the droplet as root user
# Usage: bash <(curl -s https://raw.githubusercontent.com/krukmat/Mermaid2SF/main/scripts/setup-droplet.sh)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up Mermaid2SF API droplet...${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
apt update && apt upgrade -y

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
apt install -y curl git build-essential nginx ufw

# Create user
echo -e "${YELLOW}👤 Creating mermaid2sf user...${NC}"
if id "mermaid2sf" &>/dev/null; then
    echo "User mermaid2sf already exists"
else
    adduser --disabled-password --gecos "" mermaid2sf
    usermod -aG sudo mermaid2sf
fi

# Setup SSH for new user
echo -e "${YELLOW}🔑 Setting up SSH...${NC}"
mkdir -p /home/mermaid2sf/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/mermaid2sf/.ssh/
fi
chown -R mermaid2sf:mermaid2sf /home/mermaid2sf/.ssh
chmod 700 /home/mermaid2sf/.ssh
chmod 600 /home/mermaid2sf/.ssh/authorized_keys 2>/dev/null || true

# Install Node.js as mermaid2sf user
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
su - mermaid2sf << 'EOF'
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Install PM2 globally
npm install -g pm2

# Verify
node --version
npm --version
pm2 --version
EOF

# Clone repository
echo -e "${YELLOW}📥 Cloning repository...${NC}"
if [ -d "/home/mermaid2sf/app" ]; then
    echo "Repository already exists"
else
    su - mermaid2sf << 'EOF'
cd /home/mermaid2sf
git clone https://github.com/krukmat/Mermaid2SF.git app
cd app
git checkout feature/api-deployment
EOF
fi

# Install app dependencies and build
echo -e "${YELLOW}📦 Installing app dependencies...${NC}"
su - mermaid2sf << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/mermaid2sf/app
npm install
npm run build
npm test
EOF

# Create logs directory
mkdir -p /home/mermaid2sf/logs
chown mermaid2sf:mermaid2sf /home/mermaid2sf/logs

# Create PM2 ecosystem config
echo -e "${YELLOW}⚙️  Creating PM2 configuration...${NC}"
cat > /home/mermaid2sf/app/ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'mermaid2sf-api',
    script: 'web/server/index.js',
    cwd: '/home/mermaid2sf/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/home/mermaid2sf/logs/err.log',
    out_file: '/home/mermaid2sf/logs/out.log',
    log_file: '/home/mermaid2sf/logs/combined.log',
    time: true
  }]
};
EOFPM2

chown mermaid2sf:mermaid2sf /home/mermaid2sf/app/ecosystem.config.js

# Start PM2
echo -e "${YELLOW}🚀 Starting PM2...${NC}"
su - mermaid2sf << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/mermaid2sf/app
pm2 start ecosystem.config.js
pm2 save
EOF

# Setup PM2 startup
su - mermaid2sf << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 startup
EOF

# Get the startup command and execute it
STARTUP_CMD=$(su - mermaid2sf -c "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\"; pm2 startup | grep 'sudo env'" || true)
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD
fi

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"

# Get droplet IP
DROPLET_IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)

cat > /etc/nginx/sites-available/mermaid2sf << EOFNGINX
server {
    listen 80;
    server_name ${DROPLET_IP};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/mermaid2sf-access.log;
    error_log /var/log/nginx/mermaid2sf-error.log;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}
EOFNGINX

# Enable site
ln -sf /etc/nginx/sites-available/mermaid2sf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configure firewall
echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Droplet IP: ${DROPLET_IP}"
echo ""
echo "Test the API:"
echo "  curl http://${DROPLET_IP}/health"
echo ""
echo "View logs:"
echo "  ssh mermaid2sf@${DROPLET_IP} 'pm2 logs mermaid2sf-api'"
echo ""
echo "SSH access:"
echo "  ssh mermaid2sf@${DROPLET_IP}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. (Optional) Configure domain and SSL with certbot"
echo "2. Test endpoints thoroughly"
echo "3. Update DNS if using a domain"
