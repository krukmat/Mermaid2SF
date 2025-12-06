const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const examplesDir = path.join(__dirname, '../examples/v1');
const outputBase = path.join(__dirname, '../.ci-output');
const flowDir = path.join(outputBase, 'flows');
const dslDir = path.join(outputBase, 'dsl');
const docsDir = path.join(outputBase, 'docs');
const cli = path.join(__dirname, '../dist/cli/index.js');

if (!fs.existsSync(examplesDir)) {
  throw new Error(`Examples directory not found: ${examplesDir}`);
}

const files = fs.readdirSync(examplesDir).filter((file) => file.endsWith('.mmd'));
if (files.length === 0) {
  throw new Error('No Mermaid examples found under examples/v1');
}

fs.rmSync(outputBase, { recursive: true, force: true });
fs.mkdirSync(flowDir, { recursive: true });
fs.mkdirSync(dslDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

files.forEach((file) => {
  const input = path.join(examplesDir, file);
  console.log(`Compiling example ${input}`);
  execSync(
    `node ${cli} compile --input ${input} --out-flow ${flowDir} --out-json ${dslDir} --out-docs ${docsDir} --strict`,
    { stdio: 'inherit' }
  );
});

console.log(`Compiled ${files.length} example(s). Artifacts in ${outputBase}.`);
