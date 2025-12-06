// TASK 3.1: Explain command - comprehensive test suite
import { summarizeFlow, buildDslFromMermaid, renderSummary, loadDsl } from '../cli/commands/explain';
import { FlowValidator } from '../validator/flow-validator';
import { FlowDSL } from '../types/flow-dsl';
import * as fs from 'fs';
import * as path from 'path';

const mermaidSample = `
flowchart TD
    Start([START: Demo])
    Screen[SCREEN: Collect Data]
    Assign[ASSIGNMENT: Set Flags]
    Decision{DECISION: Route}
    End1([END: Success])
    End2([END: Failure])

    Start --> Screen
    Screen --> Assign
    Assign --> Decision
    Decision -->|Yes| End1
    Decision -->|No default| End2
`;

const complexMermaidSample = `
flowchart TD
    Start([START: Complex Flow])
    Dec1{DECISION: Check 1}
    Dec2{DECISION: Check 2}
    Dec3{DECISION: Check 3}
    Dec4{DECISION: Check 4}
    Dec5{DECISION: Check 5}
    Dec6{DECISION: Check 6}
    End1([END: End])

    Start --> Dec1
    Dec1 -->|Yes| Dec2
    Dec1 -->|No default| Dec3
    Dec2 -->|Yes| Dec4
    Dec2 -->|No default| Dec5
    Dec3 -->|Yes| Dec6
    Dec3 -->|No default| End1
    Dec4 -->|Yes| End1
    Dec4 -->|No default| End1
    Dec5 -->|Yes| End1
    Dec5 -->|No default| End1
    Dec6 -->|Yes| End1
    Dec6 -->|No default| End1
`;

describe('Explain command helpers', () => {
  describe('summarizeFlow', () => {
    it('summarizes a flow built from Mermaid', () => {
      const dsl = buildDslFromMermaid(mermaidSample, 'Demo_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);

      const summary = summarizeFlow(dsl, validation);

      expect(summary.flowApiName).toBe('Demo_Flow');
      expect(summary.counts.decisions).toBe(1);
      expect(summary.counts.screens).toBe(1);
      expect(summary.counts.outcomes).toBe(2);
      expect(summary.cyclomaticComplexity).toBe(2);
      expect(summary.errors.length).toBe(0);
    });

    it('calculates cyclomatic complexity correctly', () => {
      const dsl = buildDslFromMermaid(complexMermaidSample, 'Complex_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);
      const summary = summarizeFlow(dsl, validation);

      // Cyclomatic complexity = decisions + 1
      expect(summary.cyclomaticComplexity).toBe(7); // 6 decisions + 1
      expect(summary.counts.decisions).toBe(6);
    });

    it('counts all element types correctly', () => {
      const dsl = buildDslFromMermaid(mermaidSample, 'Demo_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);
      const summary = summarizeFlow(dsl, validation);

      expect(summary.counts.elements).toBe(6); // Start, Screen, Assign, Decision, 2 Ends
      expect(summary.counts.screens).toBe(1);
      expect(summary.counts.assignments).toBe(1);
      expect(summary.counts.decisions).toBe(1);
      expect(summary.counts.ends).toBe(2);
    });

    it('includes validation errors and warnings', () => {
      const invalidDsl: FlowDSL = {
        version: 1,
        flowApiName: 'Invalid_Flow',
        label: 'Invalid',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Missing' },
        ],
      };

      const validator = new FlowValidator();
      const validation = validator.validate(invalidDsl);
      const summary = summarizeFlow(invalidDsl, validation);

      expect(summary.errors.length).toBeGreaterThan(0);
    });
  });

  describe('renderSummary - output formats', () => {
    let summary: any;

    beforeEach(() => {
      const dsl = buildDslFromMermaid(mermaidSample, 'Demo_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);
      summary = summarizeFlow(dsl, validation);
    });

    it('renders JSON format correctly', () => {
      const json = renderSummary(summary, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.flowApiName).toBe('Demo_Flow');
      expect(parsed.counts.elements).toBeGreaterThan(0);
      expect(parsed.cyclomaticComplexity).toBe(2);
      expect(parsed).toHaveProperty('warnings');
      expect(parsed).toHaveProperty('errors');
    });

    it('renders text format correctly', () => {
      const text = renderSummary(summary, 'text');

      expect(text).toContain('Flow:');
      expect(text).toContain('Demo_Flow');
      expect(text).toContain('Complexity:');
      expect(text).toContain('LOW');
      expect(text).toContain('Recommendations:');
    });

    it('renders HTML format correctly', () => {
      const html = renderSummary(summary, 'html');

      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<h1>');
      expect(html).toContain('Demo_Flow');
      expect(html).toContain('Counts');
      expect(html).toContain('Validation');
      expect(html).toContain('</html>');
    });
  });

  describe('recommendations engine', () => {
    it('recommends simplification for complex flows (>5 decisions)', () => {
      const dsl = buildDslFromMermaid(complexMermaidSample, 'Complex_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);
      const summary = summarizeFlow(dsl, validation);
      const text = renderSummary(summary, 'text');

      expect(text).toContain('Many decisions detected');
      expect(text).toContain('simplifying or splitting');
    });

    it('recommends defining variables when none exist', () => {
      const dsl = buildDslFromMermaid(mermaidSample, 'Demo_Flow');
      const validator = new FlowValidator();
      const validation = validator.validate(dsl);
      const summary = summarizeFlow(dsl, validation);
      const text = renderSummary(summary, 'text');

      expect(text).toContain('Define and document variables');
    });

    it('recommends resolving warnings when present', () => {
      const invalidDsl: FlowDSL = {
        version: 1,
        flowApiName: 'Warning_Flow',
        label: 'Warning',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
          { id: 'Orphan', type: 'Assignment', assignments: [], next: 'End' },
        ],
      };

      const validator = new FlowValidator();
      const validation = validator.validate(invalidDsl);
      const summary = summarizeFlow(invalidDsl, validation);
      const text = renderSummary(summary, 'text');

      if (validation.warnings.length > 0) {
        expect(text).toContain('Resolve');
        expect(text).toContain('validation warning');
      }
    });

    it('shows positive recommendation when no issues detected', () => {
      const simpleDsl: FlowDSL = {
        version: 1,
        flowApiName: 'Simple_Flow',
        label: 'Simple',
        processType: 'Autolaunched',
        startElement: 'Start',
        variables: [{ name: 'var1', dataType: 'String', isCollection: false, isInput: false, isOutput: false }],
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };

      const validator = new FlowValidator();
      const validation = validator.validate(simpleDsl);
      const summary = summarizeFlow(simpleDsl, validation);
      const text = renderSummary(summary, 'text');

      expect(text).toContain('No issues detected');
    });
  });

  describe('loadDsl', () => {
    const testDir = path.join(__dirname, '../../test-temp');

    beforeAll(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it('loads DSL from .mmd file', () => {
      const mmdPath = path.join(testDir, 'test.mmd');
      fs.writeFileSync(mmdPath, mermaidSample, 'utf-8');

      const dsl = loadDsl(mmdPath);

      expect(dsl.flowApiName).toBe('test');
      expect(dsl.elements.length).toBeGreaterThan(0);
    });

    it('loads DSL from .json file', () => {
      const jsonDsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_JSON',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };

      const jsonPath = path.join(testDir, 'test.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonDsl), 'utf-8');

      const dsl = loadDsl(jsonPath);

      expect(dsl.flowApiName).toBe('Test_JSON');
      expect(dsl.elements).toHaveLength(2);
    });

    it('throws error for unsupported file format', () => {
      const txtPath = path.join(testDir, 'test.txt');
      fs.writeFileSync(txtPath, 'invalid', 'utf-8');

      expect(() => loadDsl(txtPath)).toThrow('Unsupported input format');
    });

    it('throws error for non-existent file', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.mmd');

      expect(() => loadDsl(nonExistentPath)).toThrow();
    });
  });
});
