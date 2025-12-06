import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { parseFlowXml } from '../../reverse/xml-parser';
import { DocsGenerator } from '../../generators/docs-generator';
import { logger } from '../../utils/logger';

export const decompileCommand = new Command('decompile')
  .description('Decompile Salesforce Flow XML to DSL and Mermaid')
  .requiredOption('--input <path>', 'Path to Flow XML (*.flow-meta.xml)')
  .option('--out-json <dir>', 'Output directory for DSL JSON')
  .option('--out-mermaid <dir>', 'Output directory for Mermaid')
  .action(async (options) => {
    try {
      await runDecompile(options);
      process.exit(0);
    } catch (error: any) {
      logger.error('Decompile failed:', error.message);
      process.exit(2);
    }
  });

async function runDecompile(options: any) {
  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const dsl = parseFlowXml(inputPath);
  const generator = new DocsGenerator();
  const mermaid = generator.generateMermaidDiagram(dsl);

  const outputs: string[] = [];
  if (options.outJson) {
    const jsonPath = path.join(options.outJson, `${dsl.flowApiName}.flow.json`);
    ensureDir(path.dirname(jsonPath));
    fs.writeFileSync(jsonPath, JSON.stringify(dsl, null, 2), 'utf-8');
    outputs.push(`DSL JSON: ${jsonPath}`);
  }

  if (options.outMermaid) {
    const mmdPath = path.join(options.outMermaid, `${dsl.flowApiName}.mmd`);
    ensureDir(path.dirname(mmdPath));
    fs.writeFileSync(mmdPath, mermaid, 'utf-8');
    outputs.push(`Mermaid: ${mmdPath}`);
  }

  logger.info('Decompile complete');
  outputs.forEach((o) => logger.info(`  ${o}`));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
