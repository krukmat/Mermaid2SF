import { MermaidGenerator } from '../../generators/mermaid-generator';
import { FlowDSL, DecisionElement, AssignmentElement } from '../../types/flow-dsl';

describe('MermaidGenerator', () => {
  const generator = new MermaidGenerator();

  // Helper functions to create test DSLs
  function createMinimalDsl(): FlowDSL {
    return {
      version: 1,
      flowApiName: 'MinimalFlow',
      label: 'Minimal Flow',
      processType: 'Autolaunched',
      startElement: 'Start_1',
      elements: [
        { id: 'Start_1', type: 'Start', next: 'End_1' },
        { id: 'End_1', type: 'End' },
      ],
    };
  }

  function createDslWithDecision(overrides: Partial<DecisionElement> = {}): FlowDSL {
    return {
      version: 1,
      flowApiName: 'DecisionFlow',
      label: 'Decision Flow',
      processType: 'Screen',
      startElement: 'Start_1',
      elements: [
        { id: 'Start_1', type: 'Start', next: 'Dec_1' },
        {
          id: 'Dec_1',
          type: 'Decision',
          label: 'Check Value',
          outcomes: [
            { name: 'Yes', next: 'End_1' },
            { name: 'No', isDefault: true, next: 'End_1' },
          ],
          ...overrides,
        },
        { id: 'End_1', type: 'End' },
      ],
    };
  }

  function createDslWithAssignment(overrides: Partial<AssignmentElement> = {}): FlowDSL {
    return {
      version: 1,
      flowApiName: 'AssignFlow',
      label: 'Assignment Flow',
      processType: 'Autolaunched',
      startElement: 'Start_1',
      elements: [
        { id: 'Start_1', type: 'Start', next: 'Assign_1' },
        {
          id: 'Assign_1',
          type: 'Assignment',
          label: 'Set Value',
          assignments: [{ variable: 'v_Count', value: '0' }],
          next: 'End_1',
          ...overrides,
        },
        { id: 'End_1', type: 'End' },
      ],
    };
  }

  describe('F5.4: Basic MermaidGenerator', () => {
    it('generates flowchart header', () => {
      const dsl = createMinimalDsl();
      const mmd = generator.generate(dsl);
      expect(mmd).toContain('flowchart TD');
    });

    it('generates Start element with shape', () => {
      const dsl = createMinimalDsl();
      const mmd = generator.generate(dsl);
      expect(mmd).toContain('START:');
      // Verify Start node exists with circle shape
      expect(mmd).toMatch(/Start_1\(\[/);
    });

    it('generates End element with shape', () => {
      const dsl = createMinimalDsl();
      const mmd = generator.generate(dsl);
      expect(mmd).toContain('END:');
      // Verify End node exists with circle shape
      expect(mmd).toMatch(/End_1\(\[/);
    });

    it('generates edges between elements', () => {
      const dsl = createMinimalDsl();
      const mmd = generator.generate(dsl);
      // Verify edge from Start to End
      expect(mmd).toContain('Start_1 --> End_1');
    });
  });

  describe('F5.4: Layout metadata in nodes', () => {
    it('includes layout in node content', () => {
      const dsl = createDslWithAssignment({
        layout: { x: 100, y: 200 },
      });
      const mmd = generator.generate(dsl);
      expect(mmd).toContain('layout: pos: 100,200');
    });

    it('omits layout when not present', () => {
      const dsl = createDslWithAssignment();
      const mmd = generator.generate(dsl);
      // Should not have layout: pos pattern in node
      const assignmentNodeSection = mmd.match(/Assign_1[^\n]*\n[^\n]*/);
      expect(assignmentNodeSection?.[0]).not.toContain('layout: pos:');
    });
  });

  describe('F5.4: Decision conditionLogic metadata', () => {
    it('includes conditionLogic in Decision node', () => {
      const dsl = createDslWithDecision({
        conditionLogic: 'and',
      });
      const mmd = generator.generate(dsl);
      expect(mmd).toContain('conditionLogic: and');
    });

    it('generates Decision with outcomes as edges', () => {
      const dsl = createDslWithDecision({
        outcomes: [
          { name: 'Yes', next: 'End_1' },
          { name: 'No', isDefault: true, next: 'End_1' },
        ],
      });
      const mmd = generator.generate(dsl);
      // Decision should have labeled edges
      expect(mmd).toContain('-->|Yes|');
      expect(mmd).toContain('-->|No default|');
    });
  });

  describe('F5.4: Element type shapes', () => {
    it('renders Decision with diamond shape', () => {
      const dsl = createDslWithDecision();
      const mmd = generator.generate(dsl);
      // Decision should use {} shape
      expect(mmd).toMatch(/Dec_1\{/);
    });

    it('renders Assignment with rectangle shape', () => {
      const dsl = createDslWithAssignment();
      const mmd = generator.generate(dsl);
      // Assignment should use [] shape (default)
      expect(mmd).toMatch(/Assign_1\[/);
    });

    it('generates valid Mermaid syntax', () => {
      const dsl = createMinimalDsl();
      const mmd = generator.generate(dsl);
      // Should have no syntax errors, basic structure
      expect(mmd).toMatch(/^flowchart TD/m);
      expect(mmd).not.toContain('undefined');
      expect(mmd).not.toContain('null');
    });
  });

  describe('F5.4: Complete flow with metadata', () => {
    it('generates complete flow with all metadata', () => {
      const dsl = createDslWithDecision({
        layout: { x: 50, y: 100 },
        conditionLogic: 'and',
        outcomes: [
          { name: 'True', next: 'End_1' },
          { name: 'False', isDefault: true, next: 'End_1' },
        ],
      });
      const mmd = generator.generate(dsl);
      // Verify key elements
      expect(mmd).toContain('flowchart TD');
      expect(mmd).toContain('DECISION:');
      expect(mmd).toContain('layout: pos: 50,100');
      expect(mmd).toContain('conditionLogic: and');
      expect(mmd).toContain('-->|True|');
      expect(mmd).toContain('-->|False default|');
    });
  });
});
