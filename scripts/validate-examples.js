const { execSync } = require('child_process');
const path = require('path');

const cli = path.join(__dirname, '../dist/cli/index.js');
const examplesDir = path.join(__dirname, '../examples/v1');

if (!require('fs').existsSync(examplesDir)) {
  throw new Error(`Examples directory missing: ${examplesDir}`);
}

console.log('Linting example Mermaid files with CLI');
execSync(`node ${cli} lint --input ${examplesDir} --strict`, { stdio: 'inherit' });
