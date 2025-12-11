// TASK 2.5: Lint command for validation-only mode
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { logger } from '../../utils/logger';
import { validateDsl } from '../../validation/flow-rules';
import { logFlowValidationResult } from '../utils/flow-validation';

export const lintCommand = new Command('lint')
  .description('Validate Mermaid flowchart without generating output')
  .requiredOption('--input <path>', 'Path to Mermaid file or directory')
  .option('--strict', 'Treat warnings as errors', false)
  .option('--verbose', 'Verbose logging', false)
  .option('--debug', 'Debug logging + stage timing', false)
  .option('--watch', 'Watch file/directory and re-run lint on changes', false)
  .action(async (options) => {
    if (options.watch) {
      await watchLint(options);
      return;
    }
    const exitCode = await lintFlow(options);
    process.exit(exitCode);
  });

async function lintFlow(options: any): Promise<number> {
  if (options.verbose || options.debug) {
    logger.level = 'debug';
  }

  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path not found: ${inputPath}`);
  }

  const stats = fs.statSync(inputPath);
  const files: string[] = [];

  if (stats.isDirectory()) {
    // Lint all .mmd files in directory
    const entries = fs.readdirSync(inputPath);
    for (const entry of entries) {
      if (entry.endsWith('.mmd')) {
        files.push(path.join(inputPath, entry));
      }
    }
  } else if (inputPath.endsWith('.mmd')) {
    files.push(inputPath);
  } else {
    throw new Error('Input must be a .mmd file or directory containing .mmd files');
  }

  if (files.length === 0) {
    logger.warn('No .mmd files found');
    return 0;
  }

  logger.info(`Linting ${files.length} file(s)...`);
  let totalErrors = 0;
  let totalWarnings = 0;
  const failedFiles: string[] = [];

  for (const file of files) {
    const result = await lintSingleFile(file, options);
    totalErrors += result.errors;
    totalWarnings += result.warnings;
    if (!result.valid) {
      failedFiles.push(file);
    }
  }

  // Summary
  logger.info('');
  logger.info('=== Lint Summary ===');
  logger.info(`Files checked: ${files.length}`);
  logger.info(`Total errors: ${totalErrors}`);
  logger.info(`Total warnings: ${totalWarnings}`);

  if (failedFiles.length > 0) {
    logger.error(`Failed files: ${failedFiles.length}`);
    failedFiles.forEach((f) => logger.error(`  - ${path.basename(f)}`));
  }

  // Exit codes:
  // 0 = success (all valid)
  // 1 = validation errors OR (strict mode + warnings)
  if (totalErrors > 0) {
    logger.error('✗ Linting failed with errors');
    return 1;
  }

  if (options.strict && totalWarnings > 0) {
    logger.error('✗ Linting failed (strict mode: warnings treated as errors)');
    return 1;
  }

  logger.info('✓ All files passed linting');
  return 0;
}

async function watchLint(options: any): Promise<void> {
  logger.info(`Watching for changes: ${options.input}`);
  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path not found: ${inputPath}`);
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await lintFlow(options);
    } catch (e: any) {
      logger.error(`Lint error: ${e.message}`);
    } finally {
      running = false;
    }
  };

  await run();

  const stats = fs.statSync(inputPath);
  if (stats.isDirectory()) {
    fs.watch(inputPath, { persistent: true }, async () => {
      logger.info('Change detected, re-linting...');
      await run();
    });
  } else {
    fs.watch(inputPath, { persistent: true }, async () => {
      logger.info('Change detected, re-linting...');
      await run();
    });
  }
}

interface LintResult {
  valid: boolean;
  errors: number;
  warnings: number;
}

async function lintSingleFile(filePath: string, options: any): Promise<LintResult> {
  const fileName = path.basename(filePath);
  logger.info(`\nLinting: ${fileName}`);

  try {
    // 1. Read and parse
    const mermaidText = fs.readFileSync(filePath, 'utf-8');
    const parser = new MermaidParser();
    const graph = parser.parse(mermaidText);
    logger.debug(`  Parsed ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    // 2. Extract metadata
    const extractor = new MetadataExtractor();
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      const metadata = extractor.extract(node);
      metadataMap.set(node.id, metadata);
    }
    logger.debug('  Metadata extracted');

    // 3. Build DSL
    const flowApiName = path.basename(filePath, '.mmd');
    const flowLabel = flowApiName.replace(/_/g, ' ');
    const builder = new IntermediateModelBuilder();
    const dsl = builder.build(graph, metadataMap, flowApiName, flowLabel);
    logger.debug(`  Built DSL with ${dsl.elements.length} elements`);

    // 4. Validate
    const validator = new FlowValidator();
    const validationResult = validator.validate(dsl);

    if (validationResult.warnings.length > 0) {
      logger.warn(`  Warnings (${validationResult.warnings.length}):`);
      validationResult.warnings.forEach((w) => {
        logger.warn(`    - ${w.code}: ${w.message}`);
      });
    }

    if (validationResult.errors.length > 0) {
      logger.error(`  Errors (${validationResult.errors.length}):`);
      validationResult.errors.forEach((e) => {
        logger.error(`    - ${e.code}: ${e.message}`);
      });
    }

    const flowValidation = validateDsl(dsl);
    logFlowValidationResult(flowValidation, 'Visual validation');

    const totalErrors = validationResult.errors.length + flowValidation.errors.length;
    const totalWarnings = validationResult.warnings.length + flowValidation.warnings.length;
    const strictFailure = options.strict && totalWarnings > 0;
    const valid = totalErrors === 0 && !strictFailure;

    if (valid && totalWarnings === 0) {
      logger.info(`  ✓ ${fileName} passed`);
    } else if (valid) {
      logger.warn(`  ⚠ ${fileName} passed with warnings`);
    } else {
      logger.error(`  ✗ ${fileName} failed`);
    }

    return {
      valid,
      errors: totalErrors,
      warnings: totalWarnings,
    };
  } catch (error: any) {
    logger.error(`  ✗ ${fileName} failed: ${error.message}`);
    return {
      valid: false,
      errors: 1,
      warnings: 0,
    };
  }
}
