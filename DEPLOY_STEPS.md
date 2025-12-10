# Web Visualizer Deployment Steps

These instructions describe how the publicly hosted visualizer (`http://iotforce.es/flow/`) is deployed on a DigitalOcean droplet. They assume a fresh Ubuntu 20.04/22.04 instance, `root` access, and an Apache proxy in front of the Node service.

## 1. System prep

```bash
apt-get update
apt-get install -y curl git build-essential apache2
```

## 2. Install `nvm` + Node 18

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 18
nvm alias default 18
```

## 3. Install dependencies & build

```bash
cd /opt/mermaid2sf
npm install
npm run build
```

## 4. Create `pm2` service

```bash
npm install -g pm2
pm2 start web/server/index.js --name mermaid2sf --watch
pm2 startup systemd
pm2 save
```

## 5. Apache reverse proxy

Add the following to `/etc/apache2/sites-enabled/000-default.conf` (and the SSL equivalent) inside the appropriate `<VirtualHost>` block:

```
ProxyPass /flow/ http://127.0.0.1:4000/
ProxyPassReverse /flow/ http://127.0.0.1:4000/
ProxyPass /api http://127.0.0.1:4000/api
ProxyPassReverse /api http://127.0.0.1:4000/api
ProxyPass /health http://127.0.0.1:4000/health
ProxyPassReverse /health http://127.0.0.1:4000/health
```

Then reload Apache:

```bash
apachectl configtest
systemctl reload apache2
```

## 6. Health verification

```bash
curl http://localhost:4000/health
curl http://127.0.0.1/flow/health
```

## 7. Maintenance notes

- Use `pm2 status` to monitor the Node process.
- Run `pm2 logs mermaid2sf` for runtime errors.
- Rebuild with `npm run build` after pulling upstream updates.
