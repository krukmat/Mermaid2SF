import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { FlowXmlGenerator } from '../../generators/flow-xml-generator';
import { DocsGenerator } from '../../generators/docs-generator'; // TASK 2.4
import { logger } from '../../utils/logger';
import { dump as yamlDump } from 'js-yaml';

export const compileCommand = new Command('compile')
  .description('Compile Mermaid flowchart to Salesforce Flow')
  .requiredOption('--input <path>', 'Path to Mermaid file')
  .option('--out-flow <dir>', 'Output directory for Flow XML')
  .option('--out-json <dir>', 'Output directory for DSL JSON/YAML')
  .option('--dsl-format <format>', 'DSL format: json or yaml', 'json')
  .option('--out-docs <dir>', 'Output directory for documentation')
  .option('--strict', 'Treat warnings as errors', false) // TASK 2.5
  .option('--verbose', 'Verbose logging', false)
  .option('--debug', 'Debug logging + stage timing + debug artifacts', false)
  .option('--watch', 'Watch input file and recompile on changes', false)
  .action(async (options) => {
    if (options.watch) {
      await watchCompile(options);
      return;
    }
    const exitCode = await runCompileOnce(options);
    process.exit(exitCode);
  });

async function watchCompile(options: any) {
  logger.info(`Watching for changes: ${options.input}`);
  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runCompileOnce(options);
    } catch (e: any) {
      logger.error(`Compile error: ${e.message}`);
    } finally {
      running = false;
    }
  };

  await run();

  fs.watch(inputPath, { persistent: true }, async () => {
    logger.info('Change detected, recompiling...');
    await run();
  });
}

async function runCompileOnce(options: any) {
  if (options.verbose || options.debug) {
    logger.level = 'debug';
  }

  logger.info(`Compiling: ${options.input}`);
  const timers = createTimers(options.debug);

  // 1. Read input
  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const mermaidText = fs.readFileSync(inputPath, 'utf-8');
  timers.mark('read');
  logger.debug('Mermaid file loaded');

  // 2. Parse
  const parser = new MermaidParser();
  const graph = parser.parse(mermaidText);
  timers.mark('parse');
  logger.info(`Parsed ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  // 3. Extract metadata
  const extractor = new MetadataExtractor();
  const metadataMap = new Map();
  for (const node of graph.nodes) {
    const metadata = extractor.extract(node);
    metadataMap.set(node.id, metadata);
  }
  timers.mark('extract');
  logger.debug('Metadata extracted');

  // 4. Build DSL
  const flowApiName = path.basename(inputPath, '.mmd');
  const flowLabel = flowApiName.replace(/_/g, ' ');
  const builder = new IntermediateModelBuilder();
  const dsl = builder.build(graph, metadataMap, flowApiName, flowLabel);
  timers.mark('build');
  logger.info(`Built DSL with ${dsl.elements.length} elements`);

  // 5. Validate (TASK 2.5: strict mode support)
  const validator = new FlowValidator();
  const validationResult = validator.validate(dsl);
  timers.mark('validate');

  if (validationResult.warnings.length > 0) {
    logger.warn(`Validation warnings (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach((w) => {
      logger.warn(`  - ${w.code}: ${w.message}${w.elementId ? ` [elem: ${w.elementId}]` : ''}`);
    });
  }

  if (!validationResult.valid) {
    logger.error(`Validation errors (${validationResult.errors.length}):`);
    validationResult.errors.forEach((e) => {
      logger.error(`  - ${e.code}: ${e.message}${e.elementId ? ` [elem: ${e.elementId}]` : ''}`);
    });
    throw new Error('Validation failed');
  }

  // TASK 2.5: In strict mode, treat warnings as errors
  if (options.strict && validationResult.warnings.length > 0) {
    logger.error('Strict mode: Warnings treated as errors');
    throw new Error('Validation failed (strict mode)');
  }

  logger.info('Validation passed');

  // 6. Generate outputs
  const outputs: string[] = [];

  // Generate Flow XML
  if (options.outFlow) {
    const xmlGenerator = new FlowXmlGenerator();
    const xml = xmlGenerator.generate(dsl);
    const outPath = path.join(options.outFlow, `${flowApiName}.flow-meta.xml`);
    writeOutput(outPath, xml);
    outputs.push(`Flow XML: ${outPath}`);
    logger.info(`Generated Flow XML: ${outPath}`);
  }

  // Generate DSL JSON/YAML
  if (options.outJson) {
    const dslContent =
      options.dslFormat === 'yaml' ? yamlStringify(dsl) : JSON.stringify(dsl, null, 2);
    const ext = options.dslFormat === 'yaml' ? '.flow.yaml' : '.flow.json';
    const outPath = path.join(options.outJson, `${flowApiName}${ext}`);
    writeOutput(outPath, dslContent);
    outputs.push(`DSL ${options.dslFormat.toUpperCase()}: ${outPath}`);
    logger.info(`Generated DSL: ${outPath}`);
  }

  // TASK 2.4: Generate comprehensive documentation using DocsGenerator
  if (options.outDocs) {
    const docsGenerator = new DocsGenerator();
    const markdown = docsGenerator.generateMarkdown(dsl);
    const mdPath = path.join(options.outDocs, `${flowApiName}.md`);
    writeOutput(mdPath, markdown);

    // Also generate normalized Mermaid diagram
    const mermaidDiagram = docsGenerator.generateMermaidDiagram(dsl);
    const mermaidPath = path.join(options.outDocs, `${flowApiName}.mmd`);
    writeOutput(mermaidPath, mermaidDiagram);

    outputs.push(`Docs (Markdown): ${mdPath}`);
    outputs.push(`Docs (Mermaid): ${mermaidPath}`);
    logger.info(`Generated comprehensive documentation: ${options.outDocs}`);
  }

  timers.mark('outputs');
  if (options.debug) {
    const debugDir = path.join(process.cwd(), '.debug');
    writeOutput(path.join(debugDir, `${flowApiName}.debug.dsl.json`), JSON.stringify(dsl, null, 2));
    writeOutput(
      path.join(debugDir, `${flowApiName}.debug.graph.json`),
      JSON.stringify(graph, null, 2),
    );
    logger.debug('Debug artifacts written to .debug/');
    timers.logTimings(logger);
  }

  logger.info('✓ Compilation successful');
  outputs.forEach((o) => logger.info(`  ${o}`));
  return 0;
}

function writeOutput(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function yamlStringify(obj: any): string {
  return yamlDump(obj, { noRefs: true, skipInvalid: true, sortKeys: true });
}

function createTimers(enabled: boolean) {
  const marks: Array<{ stage: string; time: number }> = [];
  return {
    mark: (stage: string) => {
      if (!enabled) return;
      marks.push({ stage, time: Date.now() });
    },
    logTimings: (log: typeof logger) => {
      if (!enabled || marks.length === 0) return;
      const base = marks[0].time;
      log.debug('Stage timings (ms):');
      marks.forEach((m) => log.debug(`  ${m.stage}: ${m.time - base}`));
    },
  };
}
