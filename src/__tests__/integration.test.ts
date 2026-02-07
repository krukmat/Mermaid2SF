// TASK 2.7: Integration tests for all v1 element types
import * as fs from 'fs';
import * as path from 'path';
import { MermaidParser } from '../parser/mermaid-parser';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { FlowValidator } from '../validator/flow-validator';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { DocsGenerator } from '../generators/docs-generator';

describe('Integration Tests - Full Pipeline', () => {
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const validator = new FlowValidator();
  const xmlGenerator = new FlowXmlGenerator();
  const docsGenerator = new DocsGenerator();

  describe('Complete flow with all v1 elements', () => {
    const mermaidInput = `
flowchart TD
    Start([START: Complete Flow Example])
    Screen1[SCREEN: Collect Customer Info]
    Assign1[ASSIGNMENT: Initialize Variables]
    Decision1{DECISION: Customer Type}
    CreateNew[CREATE: Create New Account]
    UpdateExisting[UPDATE: Update Existing Account]
    Subflow1[[SUBFLOW: Send Welcome Email]]
    Screen2[SCREEN: Show Confirmation]
    End([END: Process Complete])

    Start --> Screen1
    Screen1 --> Assign1
    Assign1 --> Decision1
    Decision1 -->|New Customer| CreateNew
    Decision1 -->|Existing default| UpdateExisting
    CreateNew --> Subflow1
    UpdateExisting --> Subflow1
    Subflow1 --> Screen2
    Screen2 --> End
    `;

    it('should parse Mermaid diagram', () => {
      const graph = parser.parse(mermaidInput);

      expect(graph.nodes).toHaveLength(9);
      expect(graph.edges).toHaveLength(9);
      expect(graph.direction).toBe('TD');
    });

    it('should extract metadata for all element types', () => {
      const graph = parser.parse(mermaidInput);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      expect(metadataMap.size).toBe(9);
      expect(metadataMap.get('Start')?.type).toBe('Start');
      expect(metadataMap.get('Screen1')?.type).toBe('Screen');
      expect(metadataMap.get('Assign1')?.type).toBe('Assignment');
      expect(metadataMap.get('Decision1')?.type).toBe('Decision');
      expect(metadataMap.get('CreateNew')?.type).toBe('RecordCreate');
      expect(metadataMap.get('UpdateExisting')?.type).toBe('RecordUpdate');
      expect(metadataMap.get('Subflow1')?.type).toBe('Subflow');
      expect(metadataMap.get('Screen2')?.type).toBe('Screen');
      expect(metadataMap.get('End')?.type).toBe('End');
    });

    it('should build DSL from graph and metadata', () => {
      const graph = parser.parse(mermaidInput);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Complete_Flow', 'Complete Flow');

      expect(dsl.flowApiName).toBe('Complete_Flow');
      expect(dsl.label).toBe('Complete Flow');
      expect(dsl.elements).toHaveLength(9);
      expect(dsl.startElement).toBe('Start');
    });

    it('should validate DSL successfully', () => {
      const graph = parser.parse(mermaidInput);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Complete_Flow', 'Complete Flow');
      const result = validator.validate(dsl);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should generate valid Flow XML', () => {
      const graph = parser.parse(mermaidInput);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Complete_Flow', 'Complete Flow');
      const xml = xmlGenerator.generate(dsl);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');
      expect(xml).toContain('<apiVersion>60.0</apiVersion>');
      expect(xml).toContain('<label>Complete Flow</label>');
      expect(xml).toContain('<processType>Autolaunched</processType>');
      expect(xml).toContain('<start>');
      expect(xml).toContain('</Flow>');
    });

    it('should generate documentation', () => {
      const graph = parser.parse(mermaidInput);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Complete_Flow', 'Complete Flow');
      const markdown = docsGenerator.generateMarkdown(dsl);

      expect(markdown).toContain('# Complete Flow');
      expect(markdown).toContain('## Flow Metadata');
      expect(markdown).toContain('## Flow Diagram');
      expect(markdown).toContain('## Flow Elements');
    });
  });

  describe('Screen element integration', () => {
    const screenFlow = `
flowchart TD
    Start([START: Screen Flow])
    Screen[SCREEN: User Input]
    End([END: Done])
    Start --> Screen
    Screen --> End
    `;

    it('should handle Screen element end-to-end', () => {
      const graph = parser.parse(screenFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Screen_Flow', 'Screen Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<screens>');
      expect(xml).toMatch(/<name>User_Input<\/name>/);
    });
  });

  describe('RecordCreate element integration', () => {
    const createFlow = `
flowchart TD
    Start([START: Create Account])
    Create[CREATE: New Account]
    End([END: Created])
    Start --> Create
    Create --> End
    `;

    it('should handle RecordCreate element end-to-end', () => {
      const graph = parser.parse(createFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Create_Flow', 'Create Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<recordCreates>');
      expect(xml).toMatch(/<name>New_Account<\/name>/);
    });
  });

  describe('RecordUpdate element integration', () => {
    const updateFlow = `
flowchart TD
    Start([START: Update Account])
    Update[UPDATE: Account Status]
    End([END: Updated])
    Start --> Update
    Update --> End
    `;

    it('should handle RecordUpdate element end-to-end', () => {
      const graph = parser.parse(updateFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Update_Flow', 'Update Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<recordUpdates>');
      expect(xml).toMatch(/<name>Account_Status<\/name>/);
    });
  });

  describe('Subflow element integration', () => {
    const subflowFlow = `
flowchart TD
    Start([START: Main Flow])
    Subflow[[SUBFLOW: Email Notification]]
    End([END: Done])
    Start --> Subflow
    Subflow --> End
    `;

    it('should handle Subflow element end-to-end', () => {
      const graph = parser.parse(subflowFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Subflow_Flow', 'Subflow Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<subflows>');
      expect(xml).toMatch(/<name>Email_Notification<\/name>/);
    });
  });

  describe('Decision with multiple outcomes', () => {
    const decisionFlow = `
flowchart TD
    Start([START: Decision Flow])
    Decision{DECISION: Check Status}
    Path1[ASSIGNMENT: Path 1]
    Path2[ASSIGNMENT: Path 2]
    Path3[ASSIGNMENT: Path 3]
    End([END: Done])

    Start --> Decision
    Decision -->|Active| Path1
    Decision -->|Inactive| Path2
    Decision -->|Unknown default| Path3
    Path1 --> End
    Path2 --> End
    Path3 --> End
    `;

    it('should handle Decision with multiple paths', () => {
      const graph = parser.parse(decisionFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Decision_Flow', 'Decision Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<decisions>');

      // Check for outcomes
      const decisionElement = dsl.elements.find((e) => e.type === 'Decision');
      expect(decisionElement).toBeDefined();
      if (decisionElement?.type === 'Decision') {
        expect(decisionElement.outcomes).toHaveLength(3);
        expect(decisionElement.outcomes.some((o) => o.isDefault)).toBe(true);
      }
    });
  });

  describe('Assignment element integration', () => {
    const assignmentFlow = `
flowchart TD
    Start([START: Assignment Flow])
    Assign[ASSIGNMENT: Set Variables]
    End([END: Done])
    Start --> Assign
    Assign --> End
    `;

    it('should handle Assignment element end-to-end', () => {
      const graph = parser.parse(assignmentFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Assignment_Flow', 'Assignment Flow');
      const result = validator.validate(dsl);
      const xml = xmlGenerator.generate(dsl);

      expect(result.valid).toBe(true);
      expect(xml).toContain('<assignments>');
      expect(xml).toContain('<name>Set_Variables</name>');
    });
  });

  describe('Deterministic output', () => {
    const testFlow = `
flowchart TD
    Z([START: Test])
    B[ASSIGNMENT: Step B]
    A[ASSIGNMENT: Step A]
    C[ASSIGNMENT: Step C]
    End([END: Done])

    Z --> B
    B --> A
    A --> C
    C --> End
    `;

    it('should produce identical output for same input', () => {
      // First run
      const graph1 = parser.parse(testFlow);
      const metadataMap1 = new Map();
      for (const node of graph1.nodes) {
        const metadata = extractor.extract(node);
        metadataMap1.set(node.id, metadata);
      }
      const dsl1 = builder.build(graph1, metadataMap1, 'Test_Flow', 'Test Flow');
      const xml1 = xmlGenerator.generate(dsl1);

      // Second run
      const graph2 = parser.parse(testFlow);
      const metadataMap2 = new Map();
      for (const node of graph2.nodes) {
        const metadata = extractor.extract(node);
        metadataMap2.set(node.id, metadata);
      }
      const dsl2 = builder.build(graph2, metadataMap2, 'Test_Flow', 'Test Flow');
      const xml2 = xmlGenerator.generate(dsl2);

      // Outputs should be identical
      expect(xml1).toBe(xml2);
      expect(JSON.stringify(dsl1)).toBe(JSON.stringify(dsl2));
    });
  });

  describe('Validation errors', () => {
    it('should detect missing Start element', () => {
      const invalidFlow = `
flowchart TD
    A[ASSIGNMENT: Step]
    End([END: Done])
    A --> End
      `;

      const graph = parser.parse(invalidFlow);
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }
      const dsl = builder.build(graph, metadataMap, 'Invalid_Flow', 'Invalid Flow');

      // Manually set startElement to a non-existent Start element
      dsl.startElement = 'NonExistent';
      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid element references', () => {
      const invalidRefFlow = `
flowchart TD
    Start([START: Test])
    A[ASSIGNMENT: Step]
    End([END: Done])

    Start --> A
    A --> End
      `;

      const graph = parser.parse(invalidRefFlow);
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }
      const dsl = builder.build(graph, metadataMap, 'Invalid_Ref', 'Invalid Ref');

      // Manually add invalid reference
      const assignElement = dsl.elements.find((e) => e.type === 'Assignment');
      if (assignElement && 'next' in assignElement) {
        assignElement.next = 'NonExistentElement';
      }

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_ELEMENT_REFERENCE')).toBe(true);
    });

    it('should detect cycles in flow', () => {
      const cycleFlow = `
flowchart TD
    Start([START: Cycle Test])
    A[ASSIGNMENT: Step A]
    B[ASSIGNMENT: Step B]
    End([END: Done])

    Start --> A
    A --> B
    B --> A
      `;

      const graph = parser.parse(cycleFlow);
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }
      const dsl = builder.build(graph, metadataMap, 'Cycle_Flow', 'Cycle Flow');
      const result = validator.validate(dsl);

      // Cycle detection produces warnings, not errors
      expect(result.warnings.some((w) => w.code === 'CYCLE_DETECTED')).toBe(true);
    });
  });

  describe('Connectors use API names when IDs differ', () => {
    const flowWithApiNames = `
flowchart TD
    S([START: Begin api: Start_Api])
    A[ASSIGNMENT: Work api: Assign_Api]
    D{DECISION: Route api: Decision_Api}
    E1([END: First api: End_One])
    E2([END: Second api: End_Two])

    S --> A
    A --> D
    D -->|Yes| E1
    D -->|No default| E2
    `;

    it('should emit targetReference with destination apiName values', () => {
      const graph = parser.parse(flowWithApiNames);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Api_Name_Flow', 'Api Name Flow');
      const xml = xmlGenerator.generate(dsl);

      expect(xml).toContain('<targetReference>Assign_Api</targetReference>');
      expect(xml).toContain('<targetReference>Decision_Api</targetReference>');
      expect(xml).toContain('<targetReference>End_One</targetReference>');
      expect(xml).toContain('<targetReference>End_Two</targetReference>');
    });
  });

  describe('Real-world example files', () => {
    const examplesDir = path.join(__dirname, '../../examples/v1');

    if (fs.existsSync(examplesDir)) {
      const exampleFiles = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.mmd'));

      exampleFiles.forEach((filename) => {
        it(`should process ${filename} successfully`, () => {
          const filePath = path.join(examplesDir, filename);
          const mermaidText = fs.readFileSync(filePath, 'utf-8');

          const graph = parser.parse(mermaidText);
          const metadataMap = new Map();

          for (const node of graph.nodes) {
            const metadata = extractor.extract(node);
            metadataMap.set(node.id, metadata);
          }

          const flowName = path.basename(filename, '.mmd');
          const dsl = builder.build(graph, metadataMap, flowName, flowName);
          const result = validator.validate(dsl);
          const xml = xmlGenerator.generate(dsl);
          const docs = docsGenerator.generateMarkdown(dsl);

          expect(result.valid).toBe(true);
          expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(docs).toContain(`# ${flowName}`);
        });
      });
    }
  });

  describe('Documentation generation', () => {
    const testFlow = `
flowchart TD
    Start([START: Doc Test])
    Screen[SCREEN: Input Form]
    Assign[ASSIGNMENT: Process Data]
    Decision{DECISION: Valid?}
    Create[CREATE: Save Record]
    End1([END: Success])
    End2([END: Failed])

    Start --> Screen
    Screen --> Assign
    Assign --> Decision
    Decision -->|Yes| Create
    Decision -->|No default| End2
    Create --> End1
    `;

    it('should generate Mermaid diagram from DSL', () => {
      const graph = parser.parse(testFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Doc_Test', 'Doc Test');
      const mermaid = docsGenerator.generateMermaidDiagram(dsl);

      expect(mermaid).toContain('flowchart TD');
      expect(mermaid).toContain('Start([');
      expect(mermaid).toContain('Screen[');
      expect(mermaid).toContain('Decision{');
      expect(mermaid).toContain('Create[');
      expect(mermaid).toContain('Start --> Screen');
      expect(mermaid).toContain('Decision -->|Yes| Create');
    });

    it('should generate comprehensive Markdown documentation', () => {
      const graph = parser.parse(testFlow);
      const metadataMap = new Map();

      for (const node of graph.nodes) {
        const metadata = extractor.extract(node);
        metadataMap.set(node.id, metadata);
      }

      const dsl = builder.build(graph, metadataMap, 'Doc_Test', 'Doc Test');
      const markdown = docsGenerator.generateMarkdown(dsl);

      expect(markdown).toContain('# Doc Test');
      expect(markdown).toContain('## Flow Metadata');
      expect(markdown).toContain('## Flow Diagram');
      expect(markdown).toContain('## Flow Elements');
      expect(markdown).toContain('**Type**: Screen');
      expect(markdown).toContain('**Type**: Assignment');
      expect(markdown).toContain('**Type**: Decision');
      expect(markdown).toContain('**Type**: RecordCreate');
    });
  });
});
