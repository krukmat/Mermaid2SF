# Deploy Web Visualizer (Task 4.2.5)

Checklist to publish the web visualizer/editor + API on DigitalOcean.

## Prerequisites
- Node 18+ on the droplet.
- Run `npm install`.
- Run `npm run build` (produces `dist/` consumed by `web/server/index.js`).

## Recommended droplet setup
- Ubuntu LTS with Node 18+ and npm.
- Reverse proxy with Nginx/Caddy to terminate TLS and forward to app port (default 4000).
- Environment: `PORT` (optional; default 4000).

## Serve frontend + backend together (Express)
1) Optionally serve static frontend from the same server (if not already):
   ```js
   app.use(express.static(path.join(__dirname, '../frontend')));
   ```
2) Start: `node web/server/index.js` (or pm2/systemd service).
3) Endpoints: `/health`, `/api/compile`, and `/` for the frontend when served statically.

## Deployment steps on DigitalOcean droplet
1) SSH into the droplet.
2) Clone or pull the repo:
   ```bash
   git clone https://github.com/krukmat/Mermaid2SF.git /opt/mermaid2sf
   cd /opt/mermaid2sf
   git pull origin main
   ```
3) `npm install`
4) `npm run build`
5) (Optional) add static serving as above.
6) Start service (pm2 or systemd). Example systemd unit:
   ```
   [Unit]
   Description=Mermaid2SF Web
   After=network.target

   [Service]
   WorkingDirectory=/opt/mermaid2sf
   ExecStart=/usr/bin/node web/server/index.js
   Restart=always
   Environment=PORT=4000

   [Install]
   WantedBy=multi-user.target
   ```
7) Configure Nginx/Caddy to proxy `https://your-domain` -> `http://localhost:4000`.

## Frontend static + API separate (if desired)
- Deploy `web/frontend/` as static assets (could still be served by Nginx).
- Set API base URL in the frontend fetch calls (e.g., `https://api.your-domain/api/compile`).
- Backend: steps above, exposed via reverse proxy.

## Docker (optional)
```
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["node", "web/server/index.js"]
```

## Pre-deploy checks
- `npm test`
- `npm run openapi:validate`
- `npm run build`
- Smoke test locally: `curl http://localhost:4000/health` and POST a sample Mermaid to `/api/compile`.
