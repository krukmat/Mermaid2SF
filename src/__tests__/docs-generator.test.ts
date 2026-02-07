// TASK 2.4: DocsGenerator tests
import { DocsGenerator } from '../generators/docs-generator';
import {
  AssignmentElement,
  DecisionElement,
  EndElement,
  FaultElement,
  FlowDSL,
  GetRecordsElement,
  LoopElement,
  StartElement,
  WaitElement,
} from '../types/flow-dsl';

describe('DocsGenerator', () => {
  let generator: DocsGenerator;

  beforeEach(() => {
    generator = new DocsGenerator();
  });

  describe('generateMermaidDiagram', () => {
    it('should generate basic Mermaid diagram', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            label: 'Flow Start',
            next: 'End',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
            label: 'Flow End',
          } as EndElement,
        ],
      };

      const diagram = generator.generateMermaidDiagram(dsl);

      expect(diagram).toContain('flowchart TD');
      expect(diagram).toContain('Start([Flow Start])');
      expect(diagram).toContain('End([Flow End])');
      expect(diagram).toContain('Start --> End');
    });

    it('should generate diagram with decision', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            label: 'Check Condition',
            outcomes: [
              { name: 'Yes', condition: 'true', isDefault: false, next: 'End1' },
              { name: 'No', isDefault: true, next: 'End2' },
            ],
          } as DecisionElement,
          {
            id: 'End1',
            type: 'End',
            apiName: 'Success',
          } as EndElement,
          {
            id: 'End2',
            type: 'End',
            apiName: 'Failure',
          } as EndElement,
        ],
      };

      const diagram = generator.generateMermaidDiagram(dsl);

      expect(diagram).toContain('Decision{Check Condition');
      expect(diagram).toContain('Decision -->|Yes| End1');
      expect(diagram).toContain('Decision -->|No| End2');
    });

    it('should escape special characters in labels', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            label: 'Start [Test]',
            next: 'End',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const diagram = generator.generateMermaidDiagram(dsl);

      expect(diagram).toContain('#91;');
      expect(diagram).toContain('#93;');
    });

    it('orders nodes by traversal path and emits classes', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'OrderFlow',
        label: 'Order Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Decision',
            outcomes: [
              { name: 'Yes', next: 'End' },
              { name: 'No', next: 'Assignment' },
            ],
          } as DecisionElement,
          {
            id: 'Assignment',
            type: 'Assignment',
            apiName: 'Assign',
            assignments: [],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const diagram = generator.generateMermaidDiagram(dsl);
      const startIdx = diagram.indexOf('Start');
      const decisionIdx = diagram.indexOf('Decision{');
      const assignmentIdx = diagram.indexOf('Assignment[');
      const endIdx = diagram.indexOf('End([');

      expect(startIdx).toBeGreaterThan(-1);
      expect(decisionIdx).toBeGreaterThan(-1);
      expect(assignmentIdx).toBeGreaterThan(-1);
      expect(endIdx).toBeGreaterThan(-1);
      expect(startIdx).toBeLessThan(decisionIdx);
      expect(decisionIdx).toBeLessThan(endIdx);
      expect(endIdx).toBeLessThan(assignmentIdx);
      expect(diagram).toContain('classDef start');
      expect(diagram).toContain('class Decision decision');
    });

    it('renders metadata for loops, waits, lookups, and faults', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'ComplexFlow',
        label: 'Complex Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'Loop1' } as StartElement,
          {
            id: 'Loop1',
            type: 'Loop',
            apiName: 'Loop1',
            collection: 'v_Items',
            next: 'Wait1',
          } as LoopElement,
          {
            id: 'Wait1',
            type: 'Wait',
            apiName: 'Wait1',
            waitType: 'duration',
            durationValue: 5,
            durationUnit: 'Minutes',
            next: 'Lookup1',
          } as WaitElement,
          {
            id: 'Lookup1',
            type: 'GetRecords',
            apiName: 'Lookup1',
            object: 'Account',
            filters: [{ field: 'Status', operator: 'EqualTo', value: 'New' }],
            next: 'Fault1',
          } as GetRecordsElement,
          {
            id: 'Fault1',
            type: 'Fault',
            apiName: 'Fault1',
            next: 'End',
          } as FaultElement,
          { id: 'End', type: 'End', apiName: 'End' } as EndElement,
        ],
      };

      const diagram = generator.generateMermaidDiagram(dsl);

      expect(diagram).toContain('collection: v_Items');
      expect(diagram).toContain('duration: 5Minutes');
      expect(diagram).toContain('object: Account');
      expect(diagram).toContain('filters: StatusEqualToNew');
      expect(diagram).toContain('fault handler');
    });
  });

  describe('generateMarkdown', () => {
    it('should generate complete markdown documentation', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        variables: [
          {
            name: 'v_Counter',
            dataType: 'Number',
            isCollection: false,
            isInput: false,
            isOutput: true,
          },
        ],
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign',
          } as StartElement,
          {
            id: 'Assign',
            type: 'Assignment',
            apiName: 'SetCounter',
            label: 'Set Counter',
            assignments: [{ variable: 'v_Counter', value: '10' }],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const markdown = generator.generateMarkdown(dsl);

      // Check title
      expect(markdown).toContain('# Test Flow');

      // Check metadata
      expect(markdown).toContain('## Flow Metadata');
      expect(markdown).toContain('`Test_Flow`');
      expect(markdown).toContain('Autolaunched');

      // Check diagram
      expect(markdown).toContain('## Flow Diagram');
      expect(markdown).toContain('```mermaid');

      // Check variables
      expect(markdown).toContain('## Variables');
      expect(markdown).toContain('`v_Counter`');
      expect(markdown).toContain('Number');

      // Check elements
      expect(markdown).toContain('## Flow Elements');
      expect(markdown).toContain('### Set Counter');
      expect(markdown).toContain('Assignment');
    });

    it('should respect documentation options', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'End',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const markdown = generator.generateMarkdown(dsl, {
        includeDiagram: false,
        includeMetadata: false,
        includeVariables: false,
        includeElementDetails: true,
      });

      expect(markdown).not.toContain('## Flow Metadata');
      expect(markdown).not.toContain('## Flow Diagram');
      expect(markdown).not.toContain('## Variables');
      expect(markdown).toContain('## Flow Elements');
    });

    it('should document Assignment element details', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign',
          } as StartElement,
          {
            id: 'Assign',
            type: 'Assignment',
            apiName: 'SetValues',
            label: 'Set Values',
            assignments: [
              { variable: 'v_Name', value: 'John' },
              { variable: 'v_Age', value: '30' },
            ],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const markdown = generator.generateMarkdown(dsl);

      expect(markdown).toContain('### Set Values');
      expect(markdown).toContain('**Type**: Assignment');
      expect(markdown).toContain('**Assignments**:');
      expect(markdown).toContain('`v_Name` = `John`');
      expect(markdown).toContain('`v_Age` = `30`');
    });

    it('should document Decision element details', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'CheckAge',
            label: 'Check Age',
            outcomes: [
              { name: 'Adult', condition: '{!v_Age} >= 18', isDefault: false, next: 'End1' },
              { name: 'Minor', isDefault: true, next: 'End2' },
            ],
          } as DecisionElement,
          {
            id: 'End1',
            type: 'End',
            apiName: 'AdultPath',
          } as EndElement,
          {
            id: 'End2',
            type: 'End',
            apiName: 'MinorPath',
          } as EndElement,
        ],
      };

      const markdown = generator.generateMarkdown(dsl);

      expect(markdown).toContain('### Check Age');
      expect(markdown).toContain('**Type**: Decision');
      expect(markdown).toContain('**Outcomes**:');
      expect(markdown).toContain('**Adult**: → `End1`');
      expect(markdown).toContain('Condition: `{!v_Age} >= 18`');
      expect(markdown).toContain('**Minor** (default): → `End2`');
    });
  });
});
