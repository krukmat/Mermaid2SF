# Web Visualizer/Editor (Skeleton)

## Overview
This is a minimal scaffold for the web-based visualizer/editor:
- **Frontend**: vanilla HTML/JS placeholder (replace with React/Vue in next step).
- **Backend**: lightweight HTTP server exposing health and a stub `/api/compile` endpoint.

## Run Backend
```bash
node web/server/index.js
```
The server listens on `http://localhost:4000`.

## Frontend Preview
Open `web/frontend/index.html` in a browser. It will call `/health` and show the response.

## Next Steps
- Swap the frontend placeholder with React/Vue (e.g., Vite app) and hook it to `/api/compile`.
- Implement `/api/compile` to invoke the CLI (`mermaid-flow-compile`) and return DSL/XML/docs.
- Add bundler/dev server scripts in `package.json` once dependencies can be installed.
