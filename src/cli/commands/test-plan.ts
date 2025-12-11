import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { analyzePaths } from '../../test-generator/path-analyzer';
import { generateTestData } from '../../test-generator/data-generator';
import { generateTestScripts } from '../../test-generator/script-generator';
import { FlowDSL } from '../../types/flow-dsl';
import { ExtractedMetadata } from '../../types/metadata';
import { logger } from '../../utils/logger';
import { createHash } from 'crypto';

interface TestPlanOptions {
  input: string;
  out?: string;
  format?: 'text' | 'json';
  skipScripts?: boolean;
  skipValidation?: boolean;
  verbose?: boolean;
}

export const testPlanCommand = new Command('test-plan')
  .description('Generate automatic test cases / scripts for a Flow DSL or Mermaid diagram')
  .requiredOption('--input <path>', 'Path to existing DSL JSON/YAML or Mermaid (.mmd) file')
  .option('--out <dir>', 'Directory to emit summary + script artifacts')
  .option('--format <type>', 'Summary output format (text|json)', 'text')
  .option('--skip-scripts', 'Do not emit script artifacts', false)
  .option('--skip-validation', 'Skip structural validation before generating tests', false)
  .option('--verbose', 'Verbose logging for helpers', false)
  .action(async (options: TestPlanOptions) => {
    if (options.verbose) {
      logger.level = 'debug';
    }

    try {
      const dsl = await loadFlowDsl(options.input);
      if (!options.skipValidation) {
        validateDsl(dsl);
      }

      const analysis = analyzePaths(dsl);
      const data = generateTestData(dsl);
      const scripts = options.skipScripts ? [] : generateTestScripts(dsl, analysis, data);

      const summary = formatSummary(dsl, analysis, data, scripts);
      if (options.format === 'json') {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        printSummary(summary);
      }

      if (options.out) {
        emitArtifacts(options.out, dsl.flowApiName, summary, data, scripts);
      }

      if (scripts.length === 0 && !options.skipScripts) {
        logger.info('No scripts generated; add decision/outcome combinations to the flow.');
      }
    } catch (err: any) {
      logger.error(`test-plan failed: ${err.message}`);
      process.exit(1);
    }
  });

async function loadFlowDsl(inputPath: string): Promise<FlowDSL> {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext === '.mmd' || ext === '.mermaid') {
    return buildDslFromMermaid(resolved);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  if (ext === '.json') {
    return JSON.parse(content) as FlowDSL;
  }

  if (ext === '.yaml' || ext === '.yml') {
    const parsed = yamlLoad(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('YAML DSL parsed to unexpected type');
    }
    return parsed as FlowDSL;
  }

  throw new Error('Unsupported input type; provide .mmd, .json, .yaml, or .yml');
}

function buildDslFromMermaid(inputPath: string): FlowDSL {
  const mermaidText = fs.readFileSync(inputPath, 'utf-8');
  const parser = new MermaidParser();
  const graph = parser.parse(mermaidText);

  const extractor = new MetadataExtractor();
  const metadataMap = new Map<string, ExtractedMetadata>();
  graph.nodes.forEach((node) => metadataMap.set(node.id, extractor.extract(node)));

  const flowApiName = path.basename(inputPath, path.extname(inputPath));
  const flowLabel = flowApiName.replace(/_/g, ' ');
  const builder = new IntermediateModelBuilder();
  return builder.build(graph, metadataMap, flowApiName, flowLabel);
}

function validateDsl(dsl: FlowDSL) {
  const validator = new FlowValidator();
  const result = validator.validate(dsl);
  if (!result.valid) {
    throw new Error('Flow DSL validation failed before generating test plan.');
  }
  if (result.warnings.length > 0) {
    logger.warn('Validation warnings (test generation will continue):');
    result.warnings.forEach((w) =>
      logger.warn(`  - ${w.code}: ${w.message}${w.elementId ? ` [${w.elementId}]` : ''}`),
    );
  }
}

interface TestPlanSummary {
  flow: string;
  paths: number;
  maxDepth: number;
  decisions: number;
  variables: string[];
  scripts: number;
  samplePath: string[];
}

function formatSummary(
  dsl: FlowDSL,
  analysis: ReturnType<typeof analyzePaths>,
  data: ReturnType<typeof generateTestData>,
  scripts: ReturnType<typeof generateTestScripts>,
): TestPlanSummary {
  return {
    flow: dsl.flowApiName,
    paths: analysis.paths.length,
    maxDepth: analysis.maxDepth,
    decisions: analysis.decisionCount,
    variables: Object.keys(data.variables || {}),
    scripts: scripts.length,
    samplePath: analysis.paths[0] || [],
  };
}

function printSummary(summary: TestPlanSummary) {
  console.log(`Flow: ${summary.flow}`);
  console.log(
    `Paths: ${summary.paths} | Decisions: ${summary.decisions} | Max depth: ${summary.maxDepth}`,
  );
  console.log(`Variables: ${summary.variables.join(', ') || 'None'}`);
  console.log(`Sample path: ${summary.samplePath.join(' → ') || 'n/a'}`);
  console.log(`Scripts generated: ${summary.scripts}`);
}

function emitArtifacts(
  baseDir: string,
  flowApiName: string,
  summary: TestPlanSummary,
  data: ReturnType<typeof generateTestData>,
  scripts: ReturnType<typeof generateTestScripts>,
) {
  const outDir = path.resolve(baseDir);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const summaryPath = path.join(outDir, `${flowApiName}.test-plan.json`);
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        summary,
        variables: data.variables,
        scripts: scripts.map((s) => s.filename),
        scriptsDetail: scripts.map((s) => ({
          filename: s.filename,
          checksum: checksum(s.content),
        })),
      },
      null,
      2,
    ),
    'utf-8',
  );
  logger.info(`Test plan summary written to ${summaryPath}`);

  scripts.forEach((script) => {
    const scriptPath = path.join(outDir, script.filename);
    fs.writeFileSync(scriptPath, script.content, 'utf-8');
  });
  if (scripts.length > 0) {
    logger.info(`Generated ${scripts.length} script artifact(s) under ${outDir}`);
  }
}

function checksum(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}
