import { FlowDSL } from '../types/flow-dsl';
import { PathAnalysis } from './path-analyzer';
import { GeneratedTestData } from './data-generator';

export interface GeneratedScript {
  filename: string;
  content: string;
}

/**
 * Generate simple Apex-like pseudo test script content from paths and test data.
 * (Placeholder to illustrate output shape; not executable Apex.)
 */
export function generateTestScripts(
  dsl: FlowDSL,
  analysis: PathAnalysis,
  data: GeneratedTestData,
): GeneratedScript[] {
  const scripts: GeneratedScript[] = [];

  analysis.paths.forEach((path, idx) => {
    const lines: string[] = [];
    lines.push(`// Auto-generated test for path ${idx + 1}`);
    lines.push(`// Flow: ${dsl.flowApiName}`);
    lines.push(`// Path ${idx + 1}: ${path.join(' -> ')}`);
    lines.push('');
    lines.push(`@isTest`);
    lines.push(`private class ${dsl.flowApiName}_Path${idx + 1}_Test {`);
    lines.push(`  static testMethod void runTest() {`);
    lines.push(`    // TODO: bind variables`);
    Object.entries(data.variables || {}).forEach(([name, value]) => {
      lines.push(`    // ${name} = ${JSON.stringify(value)};`);
    });
    lines.push(`    // TODO: invoke flow and assert outcomes`);
    lines.push(`  }`);
    lines.push(`}`);

    scripts.push({
      filename: `${dsl.flowApiName}_Path${idx + 1}_Test.cls`,
      content: lines.join('\n'),
    });
  });

  return scripts;
}
