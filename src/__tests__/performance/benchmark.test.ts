import { createXMLGenerator } from '../../generators/xml/xml-generator';
import { DocsGenerator } from '../../generators/docs/docs-generator';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { FlowValidator } from '../../validator/flow-validator';
import { MermaidParser } from '../../parser/mermaid-parser';
import { FlowDSL } from '../../types/flow-dsl';

describe('Performance Benchmarks', () => {
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

  describe('XML Generation Performance', () => {
    it('should generate XML for simple flow within acceptable time', () => {
      const start = Date.now();
      
      const mockDsl = {
        version: 1,
        flowApiName: 'performance-test',
        label: 'Performance Test Flow',
        elements: [
          {
            type: 'Screen',
            id: 'screen1',
            apiName: 'TestScreen',
            label: 'Test Screen',
            components: []
          },
          {
            type: 'Assignment',
            id: 'assignment1',
            apiName: 'TestAssignment',
            label: 'Test Assignment',
            leftSide: 'variable',
            rightSide: 'value',
            assignments: []
          }
        ]
      };

      const result = xmlGenerator.generate(mockDsl as any);
      
      const duration = Date.now() - start;
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle multiple validation operations efficiently', () => {
      const start = Date.now();
      
      const elements = Array.from({ length: 10 }, (_, i) => ({
        type: 'Screen',
        id: `screen${i}`,
        label: `Screen ${i}`,
        components: []
      }));

      const results = elements.map((element) =>
        validator.validate({
          version: 1,
          flowApiName: 'benchmark-flow',
          label: 'Benchmark Flow',
          processType: 'Autolaunched',
          startElement: 'Start',
          elements: [
            { id: 'Start', type: 'Start', apiName: 'Start', next: element.id },
            {
              id: element.id,
              type: 'Screen',
              apiName: element.id,
              label: element.label,
              components: element.components,
              next: 'End',
            },
            { id: 'End', type: 'End', apiName: 'End' },
          ],
        } as FlowDSL),
      );
      
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should process metadata extraction efficiently', () => {
      const start = Date.now();
      
      const elements = Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'Screen' : 'Assignment',
        id: `element${i}`,
        label: `Element ${i}`
      }));

      const results = elements.map((element) =>
        metadataExtractor.extract({
          id: element.id,
          label: element.type === 'Screen' ? `SCREEN: ${element.label}` : `ASSIGNMENT: ${element.label}`,
          shape: 'square',
        }),
      );
      
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
