import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { FlowDSL, FlowElement } from '../../types/flow-dsl';
import { ValidationResult } from '../../types/validation';
import { logger } from '../../utils/logger';

type OutputFormat = 'text' | 'json' | 'html';

// TASK 3.1: Complexity scoring levels
export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface FlowSummary {
  flowApiName: string;
  label: string;
  processType: string;
  apiVersion?: string;
  counts: {
    elements: number;
    screens: number;
    assignments: number;
    decisions: number;
    recordCreates: number;
    recordUpdates: number;
    subflows: number;
    outcomes: number;
    variables: number;
    ends: number;
  };
  startElement: string;
  endElements: string[];
  cyclomaticComplexity: number;
  complexityLevel: ComplexityLevel;
  warnings: ValidationResult['warnings'];
  errors: ValidationResult['errors'];
}

export const explainCommand = new Command('explain')
  .description('Summarize a Flow (Mermaid or DSL) with counts, complexity, and recommendations')
  .requiredOption('--input <path>', 'Path to Mermaid (.mmd) or DSL (.json/.yaml/.yml)')
  .option('--format <format>', 'Output format: text | json | html', 'text')
  .option('--strict', 'Treat warnings as errors', false)
  .option('--verbose', 'Verbose logging', false)
  .option('--debug', 'Debug logging + stage timing', false)
  .action(async (options) => {
    try {
      await explainFlow(options);
      process.exit(0);
    } catch (error: any) {
      logger.error('Explain failed:', error.message);
      process.exit(2);
    }
  });

async function explainFlow(options: any) {
  if (options.verbose || options.debug) {
    logger.level = 'debug';
  }

  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const format = (options.format as OutputFormat) || 'text';
  if (!['text', 'json', 'html'].includes(format)) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const dsl = loadDsl(inputPath);
  const start = Date.now();
  const validator = new FlowValidator();
  const validation = validator.validate(dsl);
  if (options.debug) {
    logger.debug(`Validation duration: ${Date.now() - start}ms`);
  }

  if (!validation.valid) {
    logger.warn(
      `Validation errors (${validation.errors.length}) detected. Summary will include them.`,
    );
  } else if (validation.warnings.length > 0) {
    logger.warn(`Validation warnings (${validation.warnings.length}) detected.`);
  }

  if (options.strict && validation.warnings.length > 0) {
    throw new Error('Strict mode: warnings present');
  }

  const summary = summarizeFlow(dsl, validation);
  const output = renderSummary(summary, format);

  process.stdout.write(output + '\n');
}

export function loadDsl(inputPath: string): FlowDSL {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.mmd') {
    const mermaidText = fs.readFileSync(inputPath, 'utf-8');
    return buildDslFromMermaid(mermaidText, path.basename(inputPath, '.mmd'));
  }

  if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
    const raw = fs.readFileSync(inputPath, 'utf-8');
    const parsed = ext === '.json' ? JSON.parse(raw) : yamlLoad(raw);
    return parsed as FlowDSL;
  }

  throw new Error('Unsupported input format. Use .mmd, .json, .yaml, or .yml');
}

export function buildDslFromMermaid(mermaidText: string, flowApiName: string): FlowDSL {
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();

  const graph = parser.parse(mermaidText);
  const metadataMap = new Map();
  for (const node of graph.nodes) {
    const metadata = extractor.extract(node);
    metadataMap.set(node.id, metadata);
  }

  const flowLabel = flowApiName.replace(/_/g, ' ');
  return builder.build(graph, metadataMap, flowApiName, flowLabel);
}

// TASK 3.1: Calculate complexity level from cyclomatic complexity
export function getComplexityLevel(cyclomatic: number): ComplexityLevel {
  if (cyclomatic < 5) return 'LOW';
  if (cyclomatic < 10) return 'MEDIUM';
  if (cyclomatic < 20) return 'HIGH';
  return 'VERY_HIGH';
}

export function summarizeFlow(dsl: FlowDSL, validation: ValidationResult): FlowSummary {
  const counts = {
    elements: dsl.elements.length,
    screens: countElements(dsl.elements, 'Screen'),
    assignments: countElements(dsl.elements, 'Assignment'),
    decisions: countElements(dsl.elements, 'Decision'),
    recordCreates: countElements(dsl.elements, 'RecordCreate'),
    recordUpdates: countElements(dsl.elements, 'RecordUpdate'),
    subflows: countElements(dsl.elements, 'Subflow'),
    outcomes: dsl.elements
      .filter((e) => e.type === 'Decision')
      .reduce((acc, d: any) => acc + (d.outcomes?.length || 0), 0),
    variables: dsl.variables?.length || 0,
    ends: dsl.elements.filter((e) => e.type === 'End').length,
  };

  const cyclomaticComplexity = counts.decisions + 1;
  const complexityLevel = getComplexityLevel(cyclomaticComplexity);
  const endElements = dsl.elements.filter((e) => e.type === 'End').map((e) => e.id);

  return {
    flowApiName: dsl.flowApiName,
    label: dsl.label,
    processType: dsl.processType,
    apiVersion: dsl.apiVersion,
    counts,
    startElement: dsl.startElement,
    endElements,
    cyclomaticComplexity,
    complexityLevel,
    warnings: validation.warnings,
    errors: validation.errors,
  };
}

export function renderSummary(summary: FlowSummary, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  if (format === 'html') {
    return [
      '<!doctype html>',
      '<html><head><meta charset="UTF-8"><title>Flow Summary</title></head><body>',
      `<h1>${summary.label} (${summary.flowApiName})</h1>`,
      `<p>Process type: ${summary.processType} · API version: ${summary.apiVersion || 'n/a'}</p>`,
      `<p>Start: ${summary.startElement} · Ends: ${summary.endElements.join(', ') || 'n/a'}</p>`,
      '<h2>Complexity</h2>',
      `<p>Cyclomatic: ${summary.cyclomaticComplexity} (${summary.complexityLevel})</p>`,
      '<h2>Counts</h2>',
      `<ul>
        <li>Elements: ${summary.counts.elements}</li>
        <li>Screens: ${summary.counts.screens}</li>
        <li>Assignments: ${summary.counts.assignments}</li>
        <li>Decisions: ${summary.counts.decisions}</li>
        <li>RecordCreates: ${summary.counts.recordCreates}</li>
        <li>RecordUpdates: ${summary.counts.recordUpdates}</li>
        <li>Subflows: ${summary.counts.subflows}</li>
        <li>Outcomes: ${summary.counts.outcomes}</li>
        <li>Variables: ${summary.counts.variables}</li>
      </ul>`,
      '<h2>Validation</h2>',
      `<p>Errors: ${summary.errors.length} · Warnings: ${summary.warnings.length}</p>`,
      '</body></html>',
    ]
      .join('\n')
      .replace(/\n\s+/g, '\n');
  }

  // text format
  const lines = [
    `Flow: ${summary.label} (${summary.flowApiName})`,
    `Process: ${summary.processType} | API: ${summary.apiVersion || 'n/a'}`,
    `Start: ${summary.startElement} | Ends: ${summary.endElements.join(', ') || 'n/a'}`,
    `Elements: ${summary.counts.elements} (Screens ${summary.counts.screens}, Decisions ${summary.counts.decisions}, Assignments ${summary.counts.assignments}, RC ${summary.counts.recordCreates}, RU ${summary.counts.recordUpdates}, Subflows ${summary.counts.subflows})`,
    `Outcomes: ${summary.counts.outcomes} | Variables: ${summary.counts.variables}`,
    `Complexity: ${summary.cyclomaticComplexity} (${summary.complexityLevel})`,
    `Validation: ${summary.errors.length} errors, ${summary.warnings.length} warnings`,
  ];

  if (summary.errors.length > 0) {
    lines.push('Errors:');
    summary.errors.forEach((e) => lines.push(`  - ${e.code}: ${e.message}`));
  }
  if (summary.warnings.length > 0) {
    lines.push('Warnings:');
    summary.warnings.forEach((w) => lines.push(`  - ${w.code}: ${w.message}`));
  }

  lines.push('Recommendations:');
  lines.push(...buildRecommendations(summary));

  return lines.join('\n');
}

function countElements(elements: FlowElement[], type: FlowElement['type']): number {
  return elements.filter((e) => e.type === type).length;
}

// TASK 3.1: Enhanced recommendation engine with more anti-pattern detection
function buildRecommendations(summary: FlowSummary): string[] {
  const recs: string[] = [];

  // CRITICAL: Missing End elements
  if (summary.endElements.length === 0) {
    recs.push('- CRITICAL: Flow has no End element. Add at least one termination point.');
  }

  // CRITICAL: Validation errors present
  if (summary.errors.length > 0) {
    recs.push(`- CRITICAL: Fix ${summary.errors.length} validation error(s) before deployment.`);
  }

  // HIGH: Complexity too high
  if (summary.complexityLevel === 'VERY_HIGH') {
    recs.push('- HIGH: Very high complexity detected. Consider breaking into subflows.');
  } else if (summary.complexityLevel === 'HIGH') {
    recs.push(
      '- HIGH: High complexity detected. Review decision logic for simplification opportunities.',
    );
  }

  // MEDIUM: Many decisions
  if (summary.counts.decisions > 5) {
    recs.push('- MEDIUM: Many decisions detected; consider simplifying or splitting the flow.');
  }

  // MEDIUM: Large flow
  if (summary.counts.elements > 15) {
    recs.push(
      '- MEDIUM: Flow has many elements. Consider breaking into subflows for maintainability.',
    );
  }

  // LOW: No variables declared
  if (summary.counts.variables === 0) {
    recs.push('- LOW: Define and document variables explicitly for clarity.');
  }

  // LOW: Warnings present
  if (summary.warnings.length > 0) {
    recs.push(`- LOW: Resolve ${summary.warnings.length} validation warning(s) before deployment.`);
  }

  // Positive feedback when flow is clean
  if (recs.length === 0) {
    recs.push(
      '- No issues detected; flow follows best practices. Keep validations and docs in sync.',
    );
  }

  return recs;
}
