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
    it('should create XML generator successfully', () => {
      expect(xmlGenerator).toBeDefined();
      expect(typeof xmlGenerator.generate).toBe('function');
    });

    it('should create other components successfully', () => {
      expect(docsGenerator).toBeDefined();
      expect(metadataExtractor).toBeDefined();
      expect(validator).toBeDefined();
      expect(parser).toBeDefined();
    });

    it('should parse simple Mermaid flow', () => {
      const simpleMermaid = [
        'flowchart TD',
        'A([START: Start])',
        'B([END: End])',
        'A --> B',
      ].join('\n');
      const graph = parser.parse(simpleMermaid);
      expect(graph).toBeDefined();
      expect(graph.nodes).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
    });

    it('should handle XML parsing functions', () => {
      const mockXml = '<?xml version="1.0"?><Flow><Name>Test</Name></Flow>';
      const result = parseFlowXmlText(mockXml);
      expect(result).toBeDefined();
      expect(result.version).toBeDefined();
    });
  });

  describe('Pattern Validation', () => {
    it('should validate flow with visitor pattern', () => {
      const mockDsl: FlowDSL = {
        version: 1,
        flowApiName: 'test-flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      };

      const result = validator.validate(mockDsl);
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should extract metadata with chain of responsibility', () => {
      const mockElement: MermaidNode = {
        id: 'screen1',
        label: 'SCREEN: Test Screen',
        shape: 'square',
      };

      const result = metadataExtractor.extract(mockElement);
      expect(result).toBeDefined();
      expect(result.type).toBe('Screen');
    });
  });
});
