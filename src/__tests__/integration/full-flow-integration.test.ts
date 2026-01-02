import { MermaidParser } from '../../parser/mermaid-parser';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { createXMLGenerator } from '../../generators/xml/xml-generator';
import { DocsGenerator } from '../../generators/docs/docs-generator';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { XMLParser } from '../../reverse/xml-parser';
import { FlowValidator } from '../../validator/flow-validator';

describe('Full Flow Integration Tests', () => {
  const sampleMermaidFlow = `
    flowchart TD
      A([START: Start]) --> B{DECISION: Decision}
      B -->|Yes| C[SCREEN: Screen 1]
      B -->|No| D[ASSIGNMENT: Assignment]
      C --> E([END: End])
      D --> E
  `;

  let parser: MermaidParser;
  let builder: IntermediateModelBuilder;
  let xmlGenerator: ReturnType<typeof createXMLGenerator>;
  let docsGenerator: DocsGenerator;
  let metadataExtractor: MetadataExtractor;
  let xmlParser: XMLParser;
  let validator: FlowValidator;

  beforeEach(() => {
    parser = new MermaidParser();
    builder = new IntermediateModelBuilder();
    xmlGenerator = createXMLGenerator();
    docsGenerator = new DocsGenerator();
    metadataExtractor = new MetadataExtractor();
    xmlParser = new XMLParser();
    validator = new FlowValidator();
  });

  describe('Complete Flow: Mermaid → DSL → XML → Documentation', () => {
    it('should process full flow successfully', () => {
      // Step 1: Parse Mermaid
      const graph = parser.parse(sampleMermaidFlow);
      expect(graph).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);

      // Step 2: Build DSL
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        metadataMap.set(node.id, metadataExtractor.extract(node));
      }
      const flowApiName = 'test-integration-flow';
      const flowLabel = 'Integration Test Flow';
      const dsl = builder.build(graph, metadataMap, flowApiName, flowLabel);
      expect(dsl).toBeDefined();
      expect(dsl.flowApiName).toBe(flowApiName);

      // Step 3: Generate XML
      const xmlResult = xmlGenerator.generate(dsl);
      expect(xmlResult).toBeDefined();
      expect(typeof xmlResult).toBe('string');

      // Step 4: Generate Documentation
      const docsResult = docsGenerator.generateMarkdown(dsl);
      expect(docsResult).toBeDefined();
      expect(docsResult).toContain('Integration Test Flow');

      // Step 5: Extract Metadata
      const metadata = dsl.elements.map((element) => element.type);
      expect(metadata).toBeDefined();

      // Step 6: Validate Flow
      const validation = validator.validate(dsl);
      expect(validation).toBeDefined();
    });

    it('should handle all pattern implementations together', () => {
      const graph = parser.parse(sampleMermaidFlow);
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        metadataMap.set(node.id, metadataExtractor.extract(node));
      }
      const dsl = builder.build(graph, metadataMap, 'pattern-test', 'Pattern Test');

      // Validate all patterns are working
      const xmlResult = xmlGenerator.generate(dsl);
      expect(xmlResult).toContain('<?xml');

      // Strategy Pattern (XML Generator)
      expect(xmlResult).toContain('<screens>');
      
      // Chain of Responsibility (Metadata Extractor)
      const metadata = metadataExtractor.extract(graph.nodes[0]);
      expect(metadata).toBeDefined();

      // Composite Pattern (XML Parser)
      const parsed = xmlParser.parseXML({
        screens: { name: 'Screen_1', label: 'Screen 1', fields: [] },
      });
      expect(parsed).toBeDefined();

      // Visitor Pattern (Flow Validator)
      const validation = validator.validate(dsl);
      expect(validation).toBeDefined();
    });

    it('should handle error scenarios gracefully', () => {
      // Test with invalid Mermaid
      expect(() => {
        parser.parse('invalid mermaid syntax');
      }).toThrow();

      // Test with empty DSL
      const emptyDsl = {
        version: 1,
        flowApiName: 'empty',
        label: 'Empty',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      };
      const xmlResult = xmlGenerator.generate(emptyDsl as any);
      expect(xmlResult).toBeDefined();
      
      // Test validation with invalid elements
      const validation = validator.validate(emptyDsl as any);
      expect(validation).toBeDefined();
    });
  });
});
