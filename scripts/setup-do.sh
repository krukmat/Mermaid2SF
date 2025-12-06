#!/usr/bin/env bash
set -euo pipefail

# This script installs dependencies, builds, starts the web server with pm2,
# and configures Apache as a reverse proxy for /api and /health on port 80.
# Target: DigitalOcean droplet (Ubuntu).
#
# Usage: bash scripts/setup-do.sh

APP_DIR="/opt/mermaid2sf"
PORT=4000

echo "[1/6] Install base packages"
sudo apt update
sudo apt install -y curl git apache2

echo "[2/6] Install Node 18 (NodeSource) and pm2"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "[3/6] Clone or update repository"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  sudo rm -rf "$APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone https://github.com/krukmat/Mermaid2SF.git "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[4/6] Install dependencies and build"
npm install
npm run build

echo "[5/6] Start backend with pm2"
pm2 start web/server/index.js --name mermaid2sf --update-env --cwd "$APP_DIR"
pm2 save

echo "[6/6] Configure Apache reverse proxy (port 80 -> ${PORT} for /api and /health)"
sudo a2enmod proxy proxy_http
VHOST_CONF="/etc/apache2/sites-available/000-default.conf"
sudo tee "$VHOST_CONF" >/dev/null <<EOF
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html

    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:${PORT}/api
    ProxyPassReverse /api http://127.0.0.1:${PORT}/api

    ProxyPass /health http://127.0.0.1:${PORT}/health
    ProxyPassReverse /health http://127.0.0.1:${PORT}/health
</VirtualHost>
EOF

sudo systemctl reload apache2

echo "Done. Smoke tests:"
echo "  curl http://localhost:${PORT}/health"
echo "  curl http://127.0.0.1:${PORT}/health"
echo "  curl http://\$(curl -s ifconfig.me)/health"
echo "  curl -X POST http://\$(curl -s ifconfig.me)/api/compile -H 'Content-Type: application/json' -d '{\"mermaidText\":\"flowchart TD\\nStart([START: Demo])\\nEnd([END: Done])\\nStart --> End\"}'"
