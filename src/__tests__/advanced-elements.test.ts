import { MetadataExtractor } from '../extractor/metadata-extractor';
import { MermaidParser } from '../parser/mermaid-parser';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { FlowValidator } from '../validator/flow-validator';

describe('Advanced elements (Loop, Wait, GetRecords, Fault)', () => {
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const validator = new FlowValidator();
  const xmlGen = new FlowXmlGenerator();

  it('builds and validates Loop/Wait/GetRecords/Fault', () => {
    const mermaid = `
flowchart TD
  Start([START: Demo])
  LoopNode[[LOOP: Iterate\\n api: Loop_Demo\\n collection: coll_Items]]
  GetNode[GET: Accounts\\n api: Get_Accounts\\n object: Account\\n field: Id\\n filter: Name = 'Test']
  WaitNode([WAIT: Pause\\n api: Wait_Demo\\n condition: $Flow > 0])
  FaultNode([FAULT: Handle\\n api: Fault_Handler])
  End([END: Done])

  Start --> LoopNode
  LoopNode --> GetNode
  GetNode --> WaitNode
  WaitNode --> FaultNode
  FaultNode --> End
    `;

    const graph = parser.parse(mermaid);
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      const metadata = extractor.extract(node);
      metadataMap.set(node.id, metadata);
    }

    const dsl = builder.build(graph, metadataMap, 'Demo_Flow', 'Demo Flow');
    const validation = validator.validate(dsl);
    expect(validation.valid).toBe(true);

    const xml = xmlGen.generate(dsl);
    expect(xml).toContain('<loops>');
    expect(xml).toContain('<recordLookups>');
    expect(xml).toContain('<waits>');
    expect(xml).toContain('<faults>');
  });
});
