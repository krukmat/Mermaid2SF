import { analyzePaths } from '../test-generator/path-analyzer';
import { generateTestData } from '../test-generator/data-generator';
import { generateTestScripts } from '../test-generator/script-generator';
import { FlowDSL } from '../types/flow-dsl';

describe('Test generator (paths, data, scripts)', () => {
  const dsl: FlowDSL = {
    version: 1,
    flowApiName: 'GenFlow',
    label: 'Gen Flow',
    processType: 'Autolaunched',
    apiVersion: '60.0',
    startElement: 'Start',
    variables: [
      { name: 'v_Flag', dataType: 'Boolean', isCollection: false, isInput: false, isOutput: false },
      { name: 'v_List', dataType: 'String', isCollection: true, isInput: false, isOutput: false },
    ],
    elements: [
      { id: 'Start', type: 'Start', next: 'Decision' },
      {
        id: 'Decision',
        type: 'Decision',
        outcomes: [
          { name: 'Yes', next: 'EndYes' },
          { name: 'No', isDefault: true, next: 'EndNo' },
        ],
      },
      { id: 'EndYes', type: 'End' },
      { id: 'EndNo', type: 'End' },
    ],
  };

  it('analyzes paths', () => {
    const analysis = analyzePaths(dsl);
    expect(analysis.paths.length).toBe(2);
    expect(analysis.maxDepth).toBeGreaterThan(0);
    expect(analysis.decisionCount).toBe(1);
  });

  it('generates test data heuristically', () => {
    const data = generateTestData(dsl);
    expect(data.variables.v_Flag).toBe(true);
    expect(Array.isArray(data.variables.v_List)).toBe(true);
  });

  it('generates pseudo test scripts', () => {
    const analysis = analyzePaths(dsl);
    const data = generateTestData(dsl);
    const scripts = generateTestScripts(dsl, analysis, data);
    expect(scripts.length).toBe(2);
    expect(scripts[0].content).toContain('Path 1');
    expect(scripts[0].filename).toContain('Path1_Test.cls');
  });
});
