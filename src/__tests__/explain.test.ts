import {
  summarizeFlow,
  buildDslFromMermaid,
  renderSummary,
  loadDsl,
  getComplexityLevel,
} from '../cli/commands/explain';
import { FlowValidator } from '../validator/flow-validator';
import { FlowDSL } from '../types/flow-dsl';
import * as fs from 'fs';
import * as path from 'path';

const mermaidSample = `
flowchart TD
    Start([START: Demo\\nflow: screen\\nvariable: flag Boolean])
    Screen[SCREEN: Collect Data]
    Assign[ASSIGNMENT: Set Flags\\nset: flag = true]
    Decision{DECISION: Route}
    End1([END: Success])
    End2([END: Failure])
    Start --> Screen
    Screen --> Assign
    Assign --> Decision
    Decision -->|Yes if flag = true| End1
    Decision -->|No default| End2
`;

function summarize(source = mermaidSample, name = 'Demo_Flow') {
  const dsl = buildDslFromMermaid(source, name);
  const validation = new FlowValidator().validate(dsl);
  return { dsl, validation, summary: summarizeFlow(dsl, validation) };
}

describe('Explain command helpers', () => {
  it('maps complexity levels', () => {
    expect(getComplexityLevel(2)).toBe('LOW');
    expect(getComplexityLevel(20)).toBe('VERY_HIGH');
  });

  it('summarizes a semantically explicit FlowIR v2 Mermaid flow', () => {
    const { dsl, validation, summary } = summarize();
    expect(dsl.version).toBe(2);
    expect(dsl.flowKind).toBe('Screen');
    expect(validation.errors).toHaveLength(0);
    expect(summary.flowApiName).toBe('Demo_Flow');
    expect(summary.counts.elements).toBe(6);
    expect(summary.counts.screens).toBe(1);
    expect(summary.counts.assignments).toBe(1);
    expect(summary.counts.decisions).toBe(1);
    expect(summary.counts.outcomes).toBe(2);
    expect(summary.counts.ends).toBe(2);
    expect(summary.cyclomaticComplexity).toBe(2);
    expect(summary.errors).toHaveLength(0);
  });

  it('renders JSON, text and HTML summaries', () => {
    const { summary } = summarize();
    const json = JSON.parse(renderSummary(summary, 'json'));
    expect(json.flowApiName).toBe('Demo_Flow');
    expect(json.cyclomaticComplexity).toBe(2);

    const text = renderSummary(summary, 'text');
    expect(text).toContain('Demo_Flow');
    expect(text).toContain('Complexity:');
    expect(text).toContain('Recommendations:');

    const html = renderSummary(summary, 'html');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Demo_Flow');
    expect(html).toContain('Validation');
  });

  it('surfaces validation errors and critical recommendations', () => {
    const invalidDsl: FlowDSL = {
      version: 2,
      flowApiName: 'No_End_Flow',
      label: 'No End',
      flowKind: 'Autolaunched',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [{ id: 'Start', type: 'Start', next: 'Missing' }],
    };
    const validation = new FlowValidator().validate(invalidDsl);
    const summary = summarizeFlow(invalidDsl, validation);
    const text = renderSummary(summary, 'text');
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(text).toContain('Errors:');
    expect(text).toContain('CRITICAL: Flow has no End element');
  });

  it('recommends variables for otherwise valid flows without declared resources', () => {
    const dsl: FlowDSL = {
      version: 2,
      flowApiName: 'Simple_Flow',
      label: 'Simple',
      flowKind: 'Autolaunched',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };
    const validation = new FlowValidator().validate(dsl);
    const text = renderSummary(summarizeFlow(dsl, validation), 'text');
    expect(text).toContain('Define and document variables');
  });

  it('reports high decision complexity without requiring legacy branch-label semantics', () => {
    const decisions = Array.from({ length: 7 }, (_, index) => `D${index + 1}{DECISION: D${index + 1}}`).join('\n');
    const edges = Array.from({ length: 7 }, (_, index) => {
      const current = `D${index + 1}`;
      const next = index === 6 ? 'End' : `D${index + 2}`;
      return `${current} -->|Continue if flag = true| ${next}\n${current} -->|Stop default| End`;
    }).join('\n');
    const source = `
flowchart TD
  Start([START: Complex\\nvariable: flag Boolean])
  ${decisions}
  End([END: Done])
  Start --> D1
  ${edges}
`;
    const { summary } = summarize(source, 'Complex_Flow');
    expect(summary.cyclomaticComplexity).toBe(8);
    expect(renderSummary(summary, 'text')).toContain('Many decisions detected');
  });

  describe('loadDsl', () => {
    const testDir = path.join(__dirname, '../../test-temp');

    beforeAll(() => fs.mkdirSync(testDir, { recursive: true }));
    afterAll(() => fs.rmSync(testDir, { recursive: true, force: true }));

    it('loads Mermaid and JSON inputs', () => {
      const mmdPath = path.join(testDir, 'test.mmd');
      fs.writeFileSync(mmdPath, mermaidSample, 'utf-8');
      expect(loadDsl(mmdPath).flowApiName).toBe('test');

      const jsonDsl: FlowDSL = {
        version: 2,
        flowApiName: 'Test_JSON',
        label: 'Test',
        flowKind: 'Autolaunched',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };
      const jsonPath = path.join(testDir, 'test.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonDsl), 'utf-8');
      expect(loadDsl(jsonPath).flowApiName).toBe('Test_JSON');
    });

    it('rejects unsupported or missing inputs', () => {
      const txtPath = path.join(testDir, 'test.txt');
      fs.writeFileSync(txtPath, 'invalid', 'utf-8');
      expect(() => loadDsl(txtPath)).toThrow('Unsupported input format');
      expect(() => loadDsl(path.join(testDir, 'missing.mmd'))).toThrow();
    });
  });
});
