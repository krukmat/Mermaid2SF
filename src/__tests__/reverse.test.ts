import * as fs from 'fs';
import * as path from 'path';
import { MermaidParser } from '../parser/mermaid-parser';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { parseFlowXml } from '../reverse/xml-parser';
import { DocsGenerator } from '../generators/docs-generator';

describe('Reverse engineering (XML -> DSL)', () => {
  it('round-trips a simple flow Mermaid -> XML -> DSL', () => {
    const mermaid = `
flowchart TD
  Start([START: Demo])
  Assign[ASSIGNMENT: Set Flag]
  End([END: Done])

  Start --> Assign
  Assign --> End
`;
    const parser = new MermaidParser();
    const extractor = new MetadataExtractor();
    const builder = new IntermediateModelBuilder();
    const xmlGen = new FlowXmlGenerator();

    const graph = parser.parse(mermaid);
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      const meta = extractor.extract(node);
      metadataMap.set(node.id, meta);
    }
    const dsl = builder.build(graph, metadataMap, 'ReverseFlow', 'Reverse Flow');
    const xml = xmlGen.generate(dsl);

    const tmpPath = path.join(fs.mkdtempSync(path.join(process.cwd(), 'tmp-')), 'flow.flow-meta.xml');
    fs.writeFileSync(tmpPath, xml, 'utf-8');

    const parsedDsl = parseFlowXml(tmpPath);

    // Cleanup
    fs.unlinkSync(tmpPath);
    fs.rmdirSync(path.dirname(tmpPath));

    expect(parsedDsl.flowApiName).toBe('flow');
    expect(parsedDsl.elements.length).toBeGreaterThanOrEqual(2);
    const nonStart = parsedDsl.elements.filter((e) => e.type !== 'Start');
    expect(nonStart.length).toBeGreaterThanOrEqual(1);
    expect(parsedDsl.elements.some((e) => e.type === 'End')).toBe(true);
    expect(parsedDsl.startElement).toBe('Start');

    // Mermaid back from parsed DSL
    const docsGen = new DocsGenerator();
    const mermaidBack = docsGen.generateMermaidDiagram(parsedDsl);
    expect(mermaidBack).toContain('flowchart');
    expect(mermaidBack).toContain('Start');

    // Types preserved
    const types = new Set(parsedDsl.elements.map((e) => e.type));
    expect(types.has('Assignment')).toBe(true);
    expect(types.has('End')).toBe(true);
  });
});
