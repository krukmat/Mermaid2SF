import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { Command } from 'commander';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { FlowXmlGenerator } from '../../generators/flow-xml-generator';
import { DocsGenerator } from '../../generators/docs-generator';
import { FlowDSL, FlowElement } from '../../types/flow-dsl';
import { logger } from '../../utils/logger';

export const interactiveCommand = new Command('interactive')
  .description('Run an interactive wizard to compile or create flows')
  .option('--debug', 'Debug logging', false)
  .action(async (options) => {
    if (options.debug) {
      logger.level = 'debug';
    }
    await runInteractive();
  });

async function runInteractive(): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    const mode = await promptChoice(rl, 'Select mode', [
      'Compile existing Mermaid file',
      'Create new flow (wizard)',
    ]);

    if (mode === 'Compile existing Mermaid file') {
      await compileFlowInteractive(rl);
    } else {
      await createFlowWizard(rl);
    }
  } finally {
    rl.close();
  }
}

async function compileFlowInteractive(rl: any) {
  const defaultDir = path.join(process.cwd(), 'examples', 'v1');
  const defaultFile = path.join(defaultDir, 'complete-flow.mmd');
  const inputPath = await promptInput(
    rl,
    `Path to Mermaid file (.mmd) [default: ${defaultFile}]`,
    defaultFile,
  );

  const mermaidFile = path.resolve(inputPath);
  if (!fs.existsSync(mermaidFile)) {
    throw new Error(`Input file not found: ${mermaidFile}`);
  }

  const { dsl, validation } = buildAndValidateFromMermaid(mermaidFile);
  printValidation(validation);
  printPreview(dsl);

  const generateOutputs = await promptYesNo(rl, 'Generate outputs (XML/DSL/Docs)?', false);
  if (!generateOutputs) return;

  const outFlow = await promptInput(
    rl,
    'Output directory for Flow XML (blank to skip)',
    path.join(process.cwd(), 'output', 'flows'),
  );
  const outDsl = await promptInput(
    rl,
    'Output directory for DSL JSON (blank to skip)',
    path.join(process.cwd(), 'output', 'dsl'),
  );
  const outDocs = await promptInput(
    rl,
    'Output directory for docs (blank to skip)',
    path.join(process.cwd(), 'output', 'docs'),
  );

  writeOutputs(dsl, mermaidFile, outFlow, outDsl, outDocs);
}

async function createFlowWizard(rl: any) {
  const flowApiName = await promptInput(rl, 'Flow API name', 'Wizard_Flow');
  const label = await promptInput(rl, 'Flow label', flowApiName.replace(/_/g, ' '));
  const processType = (await promptChoice(rl, 'Process type', [
    'Autolaunched',
    'Screen',
    'RecordTriggered',
  ])) as FlowDSL['processType'];
  const includeScreen = await promptYesNo(rl, 'Include a Screen step?', true);
  const includeAssignment = await promptYesNo(rl, 'Include an Assignment step?', true);
  const includeDecision = await promptYesNo(rl, 'Include a Decision step?', true);

  const mermaid = buildWizardMermaid({
    flowApiName,
    label,
    includeScreen,
    includeAssignment,
    includeDecision,
  });

  const savePath = await promptInput(
    rl,
    'Save new Mermaid to (path)',
    path.join(process.cwd(), 'output', `${flowApiName}.mmd`),
  );
  ensureDir(path.dirname(savePath));
  fs.writeFileSync(savePath, mermaid, 'utf-8');
  logger.info(`Saved Mermaid diagram to ${savePath}`);

  const { dsl, validation } = buildAndValidateFromMermaid(
    savePath,
    flowApiName,
    label,
    processType,
  );
  printValidation(validation);
  printPreview(dsl);

  const generateOutputs = await promptYesNo(rl, 'Generate outputs (XML/DSL/Docs)?', true);
  if (!generateOutputs) return;

  writeOutputs(
    dsl,
    savePath,
    path.join(process.cwd(), 'output', 'flows'),
    path.join(process.cwd(), 'output', 'dsl'),
    path.join(process.cwd(), 'output', 'docs'),
  );
}

function buildWizardMermaid(opts: {
  flowApiName: string;
  label: string;
  includeScreen: boolean;
  includeAssignment: boolean;
  includeDecision: boolean;
}): string {
  const lines: string[] = [];
  lines.push('flowchart TD');
  lines.push(`    Start([START: ${opts.label}])`);

  if (opts.includeScreen) {
    lines.push(`    Screen[SCREEN: Collect Data\\n api: Screen_${opts.flowApiName}]`);
  }

  if (opts.includeAssignment) {
    lines.push(
      `    Assign[ASSIGNMENT: Set Flags\\n api: Assign_${opts.flowApiName}\\n set: v_Flag = true]`,
    );
  }

  if (opts.includeDecision) {
    lines.push(`    Decision{DECISION: Route\\n api: Decision_${opts.flowApiName}}`);
  }

  lines.push(`    End([END: Done])`);
  lines.push('');

  // Connections
  const chain: string[] = ['Start'];
  if (opts.includeScreen) chain.push('Screen');
  if (opts.includeAssignment) chain.push('Assign');
  if (opts.includeDecision) chain.push('Decision');
  chain.push('End');

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    lines.push(`    ${from} --> ${to}`);
  }

  if (opts.includeDecision) {
    lines.push(`    Decision -->|Yes| End`);
    lines.push(`    Decision -->|No default| End`);
  }

  return lines.join('\n');
}

function buildAndValidateFromMermaid(
  mermaidPath: string,
  flowApiName?: string,
  flowLabel?: string,
  processType?: FlowDSL['processType'],
) {
  const mermaidText = fs.readFileSync(mermaidPath, 'utf-8');
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const validator = new FlowValidator();

  const graph = parser.parse(mermaidText);
  const metadataMap = new Map();
  for (const node of graph.nodes) {
    const metadata = extractor.extract(node);
    metadataMap.set(node.id, metadata);
  }

  const apiName = flowApiName || path.basename(mermaidPath, '.mmd');
  const label = flowLabel || apiName.replace(/_/g, ' ');
  const dsl = builder.build(graph, metadataMap, apiName, label);
  if (processType) {
    dsl.processType = processType;
  }

  const validation = validator.validate(dsl);
  return { dsl, validation };
}

function printValidation(validation: any) {
  logger.info('Validation results:');
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    logger.info('  ✓ No errors or warnings');
    return;
  }

  if (validation.errors.length > 0) {
    logger.error(`  Errors (${validation.errors.length}):`);
    validation.errors.forEach((e: any) => logger.error(`    - ${e.code}: ${e.message}`));
  }

  if (validation.warnings.length > 0) {
    logger.warn(`  Warnings (${validation.warnings.length}):`);
    validation.warnings.forEach((w: any) => logger.warn(`    - ${w.code}: ${w.message}`));
  }
}

function printPreview(dsl: FlowDSL) {
  logger.info('ASCII preview:');
  const lines = buildAsciiPreview(dsl);
  lines.forEach((line) => logger.info(`  ${line}`));
}

export function buildAsciiPreview(dsl: FlowDSL): string[] {
  const lines: string[] = [];
  const map = new Map<string, FlowElement>();
  dsl.elements.forEach((el) => map.set(el.id, el));

  const sorted = [...dsl.elements].sort((a, b) =>
    (a.apiName || a.id).localeCompare(b.apiName || b.id),
  );
  for (const el of sorted) {
    const label = el.label || el.apiName || el.id;
    if (el.type === 'Decision') {
      const outcomes = el.outcomes
        .map((o) => `${o.name} -> ${(map.get(o.next)?.apiName || o.next) ?? '??'}`)
        .join(' | ');
      lines.push(`${label} [Decision]: ${outcomes}`);
    } else if ('next' in el && el.next) {
      const target = map.get(el.next);
      lines.push(`${label} (${el.type}) -> ${(target?.apiName || el.next) ?? '??'}`);
    } else {
      lines.push(`${label} (${el.type})`);
    }
  }

  return lines;
}

function writeOutputs(
  dsl: FlowDSL,
  mermaidPath: string,
  outFlow?: string,
  outDsl?: string,
  outDocs?: string,
) {
  const flowApiName = dsl.flowApiName;

  if (outFlow) {
    ensureDir(outFlow);
    const xml = new FlowXmlGenerator().generate(dsl);
    const xmlPath = path.join(outFlow, `${flowApiName}.flow-meta.xml`);
    fs.writeFileSync(xmlPath, xml, 'utf-8');
    logger.info(`  XML: ${xmlPath}`);
  }

  if (outDsl) {
    ensureDir(outDsl);
    const jsonPath = path.join(outDsl, `${flowApiName}.flow.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(dsl, null, 2), 'utf-8');
    logger.info(`  DSL JSON: ${jsonPath}`);
  }

  if (outDocs) {
    ensureDir(outDocs);
    const docsGen = new DocsGenerator();
    const md = docsGen.generateMarkdown(dsl);
    const mermaid = docsGen.generateMermaidDiagram(dsl);
    const mdPath = path.join(outDocs, `${flowApiName}.md`);
    const mmdPath = path.join(outDocs, `${flowApiName}.mmd`);
    fs.writeFileSync(mdPath, md, 'utf-8');
    fs.writeFileSync(mmdPath, mermaid, 'utf-8');
    logger.info(`  Docs: ${mdPath}`);
    logger.info(`  Mermaid: ${mmdPath}`);
  }

  logger.info('Outputs generated. Source: ' + mermaidPath);
}

async function promptChoice(rl: any, question: string, choices: string[]): Promise<string> {
  const answer = await rl.question(`${question} (${choices.join('/')}) `);
  const normalized = answer && answer.trim() !== '' ? answer.trim() : choices[0];
  if (choices.includes(normalized)) return normalized;
  logger.warn(`Invalid choice, defaulting to "${choices[0]}"`);
  return choices[0];
}

async function promptInput(rl: any, question: string, defaultValue?: string): Promise<string> {
  const answer = await rl.question(defaultValue ? `${question}: ` : `${question}: `);
  if (!answer && defaultValue) return defaultValue;
  return answer.trim();
}

async function promptYesNo(rl: any, question: string, defaultYes: boolean): Promise<boolean> {
  const def = defaultYes ? 'Y/n' : 'y/N';
  const answer = await rl.question(`${question} (${def}) `);
  if (!answer) return defaultYes;
  const normalized = answer.trim().toLowerCase();
  return normalized.startsWith('y');
}

function ensureDir(dir: string) {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
