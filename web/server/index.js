// Minimal HTTP server scaffold (no external deps)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  // Serve static frontend (web/frontend)
  const served = tryServeStatic(req, res);
  if (served) return;

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function compileMermaid(mermaidText) {
  const { MermaidParser } = require(path.join(__dirname, '../../dist/parser/mermaid-parser'));
  const { MetadataExtractor } = require(path.join(__dirname, '../../dist/extractor/metadata-extractor'));
  const { IntermediateModelBuilder } = require(path.join(__dirname, '../../dist/dsl/intermediate-model-builder'));
  const { FlowValidator } = require(path.join(__dirname, '../../dist/validator/flow-validator'));
  const { FlowXmlGenerator } = require(path.join(__dirname, '../../dist/generators/flow-xml-generator'));

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
  const urlPath = req.url.split('?')[0];
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, '../frontend', safePath === '/' ? 'index.html' : safePath);

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
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
    }[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Web server listening on http://localhost:${PORT}`);
});
