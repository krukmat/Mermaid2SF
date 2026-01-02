import { createXMLGenerator } from '../../generators/xml/xml-generator';
import { DocsGenerator } from '../../generators/docs/docs-generator';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { XMLParser } from '../../reverse/xml-parser';
import { FlowValidator } from '../../validator/flow-validator';

describe('Pattern Integration Tests', () => {
  let xmlGenerator: ReturnType<typeof createXMLGenerator>;
  let docsGenerator: DocsGenerator;
  let metadataExtractor: MetadataExtractor;
  let xmlParser: XMLParser;
  let validator: FlowValidator;

  beforeEach(() => {
    xmlGenerator = createXMLGenerator();
    docsGenerator = new DocsGenerator();
    metadataExtractor = new MetadataExtractor();
    xmlParser = new XMLParser();
    validator = new FlowValidator();
  });

  describe('Sprint 1 Patterns Integration', () => {
    it('should work with Strategy Pattern (XML Generator)', () => {
      const mockDsl = {
        version: 1,
        flowApiName: 'strategy-test',
        label: 'Strategy Test',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'screen1' },
          {
            type: 'Screen',
            id: 'screen1',
            apiName: 'TestScreen',
            label: 'Test Screen',
            components: [],
            next: 'End',
          },
          { id: 'End', type: 'End', apiName: 'End' },
        ]
      };

      const xmlResult = xmlGenerator.generate(mockDsl as any);
      expect(xmlResult).toContain('<?xml');
      expect(xmlResult).toContain('<screens>');
    });

    it('should work with Template Method (Docs Generator)', () => {
      const mockDsl = {
        version: 1,
        flowApiName: 'template-test',
        label: 'Template Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      };

      const docsResult = docsGenerator.generateMarkdown(mockDsl as any);
      expect(docsResult).toBeDefined();
      expect(typeof docsResult).toBe('string');
    });
  });

  describe('Sprint 2 Patterns Integration', () => {
    it('should work with Chain of Responsibility (Metadata Extractor)', () => {
      const mockElement = {
        type: 'Screen',
        id: 'screen1',
        apiName: 'TestScreen',
        label: 'Test Screen'
      };

      const metadata = metadataExtractor.extract({
        id: mockElement.id,
        label: 'SCREEN: Test Screen',
        shape: 'square',
      });
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('Screen');
    });

    it('should work with Composite Pattern (XML Parser)', () => {
      const mockXmlElement = {
        screens: {
          name: 'TestScreen',
          label: 'Test Screen'
        }
      };

      const parsed = xmlParser.parseXML(mockXmlElement);
      expect(parsed).toBeDefined();
      expect(parsed.type).toBe('Screen');
    });

    it('should work with Visitor Pattern (Flow Validator)', () => {
      const validation = validator.validate({
        version: 1,
        flowApiName: 'validator-test',
        label: 'Validator Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'screen1' },
          { id: 'screen1', type: 'Screen', apiName: 'screen1', label: 'Test Screen', components: [], next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      } as any);
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
    });
  });

  describe('Sprint 2B Patterns Integration', () => {
    it('should work with refined Strategy Pattern (Validation)', () => {
      const mockElement = {
        type: 'Screen',
        id: 'screen1',
        label: 'Test Screen',
        components: []
      };

      const validation = validator.validate({
        version: 1,
        flowApiName: 'validator-test',
        label: 'Validator Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', apiName: 'Start', next: 'screen1' },
          { id: 'screen1', type: 'Screen', apiName: 'screen1', label: 'Test Screen', components: [], next: 'End' },
          { id: 'End', type: 'End', apiName: 'End' },
        ],
      } as any);
      expect(validation).toBeDefined();
    });

    it('should work with Registry Pattern (Parser Registry)', () => {
      const mockElement = {
        type: 'Screen',
        name: 'TestScreen',
        label: 'Test Screen'
      };

      // Test that parser registry can handle different element types
      const parsed = xmlParser.parseXML(mockElement);
      expect(parsed).toBeDefined();
    });
  });
});
