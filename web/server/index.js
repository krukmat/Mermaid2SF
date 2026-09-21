/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
// Minimal HTTP server scaffold (no external deps)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFlowXmlText } = require(path.join(__dirname, '../../dist/reverse/xml-parser'));
const { executeFenixFlowRequest } = require('./fenix-contract');

const PORT = process.env.PORT || 4000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Fenix-Trace-ID, X-Fenix-Execution-ID');
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/api/fenix/ready' && req.method === 'GET') {
    const auth = authorizeFenix(req);
    if (!auth.ok) {
      writeJSON(res, auth.status, { error: auth.error });
      return;
    }
    writeJSON(res, 200, { status: 'ready', contract_version: '1' });
    return;
  }

  if (req.url === '/api/fenix/flow' && req.method === 'POST') {
    const auth = authorizeFenix(req);
    if (!auth.ok) {
      writeJSON(res, auth.status, { error: auth.error });
      return;
    }
    readJSONBody(req, 2 * 1024 * 1024, (error, payload) => {
      if (error) {
        writeJSON(res, error.status || 400, { error: error.message });
        return;
      }
      const result = executeFenixFlowRequest(payload);
      writeJSON(res, 200, result);
    });
    return;
  }

  if (req.url === '/api/compile' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const mermaidText = payload.mermaidText || '';
        const result = compileMermaid(mermaidText);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/decompile' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const xmlText = payload.flowXml || payload.xml || '';
        if (!xmlText) {
          throw new Error('Missing flow XML payload.');
        }
        const parsed = parseFlowXmlText(xmlText, payload.flowName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ dsl: parsed }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static frontend (web/frontend)
  const served = tryServeStatic(req, res);
  if (served) return;

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function compileMermaid(mermaidText) {
  const { MermaidParser } = require(path.join(__dirname, '../../dist/parser/mermaid-parser'));
  const { MetadataExtractor } = require(
    path.join(__dirname, '../../dist/extractor/metadata-extractor'),
  );
  const { IntermediateModelBuilder } = require(
    path.join(__dirname, '../../dist/dsl/intermediate-model-builder'),
  );
  const { FlowValidator } = require(path.join(__dirname, '../../dist/validator/flow-validator'));
  const { FlowXmlGenerator } = require(
    path.join(__dirname, '../../dist/generators/flow-xml-generator'),
  );

  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const validator = new FlowValidator();
  const xmlGen = new FlowXmlGenerator();

  const graph = parser.parse(mermaidText);
  const metadataMap = new Map();
  for (const node of graph.nodes) {
    const metadata = extractor.extract(node);
    metadataMap.set(node.id, metadata);
  }
  const flowApiName = 'WebFlow';
  const dsl = builder.build(graph, metadataMap, flowApiName, flowApiName.replace(/_/g, ' '));
  const validation = validator.validate(dsl);
  const xml = validation.valid ? xmlGen.generate(dsl) : null;

  return {
    dsl,
    xml,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

function tryServeStatic(req, res) {
  if (req.method !== 'GET') return false;
  let urlPath = req.url.split('?')[0] || '/';
  // Normalize known prefixes (/flow) or root
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  if (urlPath === '/flow' || urlPath === '/flow/') urlPath = '/index.html';
  if (urlPath.startsWith('/flow/')) {
    urlPath = urlPath.replace(/^\/flow/, '');
    if (urlPath === '' || urlPath === '/') urlPath = '/index.html';
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath.replace(/^\/+/, '');
  const finalPath = relativePath === '' ? 'index.html' : relativePath;
  const filePath = path.join(__dirname, '../frontend', finalPath);

  if (!filePath.startsWith(path.join(__dirname, '../frontend'))) {
    return false;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime =
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
    }[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function authorizeFenix(req) {
  const configured = process.env.M2SF_FENIX_TOKEN || '';
  if (!configured) {
    return { ok: false, status: 503, error: 'Fenix integration token is not configured.' };
  }
  const header = req.headers.authorization || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) {
    return { ok: false, status: 401, error: 'Missing bearer token.' };
  }
  const supplied = header.slice(prefix.length);
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, status: 401, error: 'Invalid bearer token.' };
  }
  return { ok: true };
}

function readJSONBody(req, limitBytes, callback) {
  let body = '';
  let size = 0;
  let finished = false;

  req.on('data', (chunk) => {
    if (finished) return;
    size += chunk.length;
    if (size > limitBytes) {
      finished = true;
      const error = new Error('Request body exceeds 2 MiB limit.');
      error.status = 413;
      callback(error);
      req.destroy();
      return;
    }
    body += chunk.toString();
  });

  req.on('end', () => {
    if (finished) return;
    try {
      callback(null, JSON.parse(body || '{}'));
    } catch (error) {
      callback(error);
    }
  });
}

function writeJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Web server listening on http://localhost:${PORT}`);
});
