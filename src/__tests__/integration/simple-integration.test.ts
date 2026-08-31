import { createXMLGenerator } from '../../generators/xml/xml-generator';
import { DocsGenerator } from '../../generators/docs/docs-generator';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { parseFlowXmlText } from '../../reverse/xml-parser';
import { FlowValidator } from '../../validator/flow-validator';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MermaidNode } from '../../types/mermaid';
import { FlowDSL } from '../../types/flow-dsl';

describe('Simple Integration Tests', () => {
  let xmlGenerator: ReturnType<typeof createXMLGenerator>;
  let docsGenerator: DocsGenerator;
  let metadataExtractor: MetadataExtractor;
  let validator: FlowValidator;
  let parser: MermaidParser;

  beforeEach(() => {
    xmlGenerator = createXMLGenerator();
    docsGenerator = new DocsGenerator();
    metadataExtractor = new MetadataExtractor();
    validator = new FlowValidator();
    parser = new MermaidParser();
  });

  describe('Basic Integration', () => {
    it('creates compiler components successfully', () => {
      expect(xmlGenerator).toBeDefined();
      expect(typeof xmlGenerator.generate).toBe('function');
      expect(docsGenerator).toBeDefined();
      expect(metadataExtractor).toBeDefined();
      expect(validator).toBeDefined();
      expect(parser).toBeDefined();
    });

    it('parses a simple Mermaid flow', () => {
      const graph = parser.parse(['flowchart TD', 'A([START: Start])', 'B([END: End])', 'A --> B'].join('\n'));
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(graph.nodes).toHaveLength(2);
    });

    it('parses structurally valid Salesforce Flow metadata', () => {
      const result = parseFlowXmlText(`<?xml version="1.0"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion><label>Test</label><processType>AutoLaunchedFlow</processType>
  <start/><status>Draft</status>
</Flow>`);
      expect(result.version).toBe(2);
      expect(result.flowKind).toBe('Autolaunched');
    });
  });

  describe('Pattern Validation', () => {
    it('validates a minimal FlowIR graph', () => {
      const mockDsl: FlowDSL = {
        version: 2,
        flowApiName: 'test-flow',
        label: 'Test Flow',
        flowKind: 'Autolaunched',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      };
      expect(validator.validate(mockDsl).valid).toBe(true);
    });

    it('extracts metadata through the strategy chain', () => {
      const mockElement: MermaidNode = { id: 'screen1', label: 'SCREEN: Test Screen', shape: 'square' };
      expect(metadataExtractor.extract(mockElement).type).toBe('Screen');
    });
  });
});
