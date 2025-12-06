import { MermaidParser } from '../parser/mermaid-parser';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { FlowValidator } from '../validator/flow-validator';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';

describe('Performance and large flows', () => {
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const validator = new FlowValidator();
  const xmlGen = new FlowXmlGenerator();

  const generateLargeMermaid = (assignmentCount: number) => {
    const lines: string[] = [];
    lines.push('flowchart TD');
    lines.push('  Start([START: Perf Flow])');
    lines.push('  LoopNode[[LOOP: Iterate\\n api: Loop_1\\n collection: coll_Items]]');
    lines.push('  WaitNode([WAIT: Pause\\n api: Wait_1\\n duration: 5m])');
    lines.push(
      "  GetNode[GET: Accounts\\n api: Get_Accounts\\n object: Account\\n field: Id\\n filter: Name = 'Test'\\n sort: Name desc]",
    );
    for (let i = 1; i <= assignmentCount; i++) {
      lines.push(`  A${i}[ASSIGNMENT: Step ${i}\\n api: Assign_${i}\\n set: v${i} = ${i}]`);
    }
    lines.push('  End([END: Done])');

    lines.push('  Start --> LoopNode');
    lines.push('  LoopNode --> A1');
    lines.push('  A1 --> WaitNode');
    lines.push('  WaitNode --> GetNode');
    for (let i = 1; i < assignmentCount; i++) {
      lines.push(`  A${i} --> A${i + 1}`);
    }
    lines.push(`  A${assignmentCount} --> End`);

    return lines.join('\n');
  };

  it('processes a large flow within a reasonable time', () => {
    const mermaid = generateLargeMermaid(50);
    const startTime = performance.now();

    const graph = parser.parse(mermaid);
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      metadataMap.set(node.id, extractor.extract(node));
    }
    const dsl = builder.build(graph, metadataMap, 'Perf_Flow', 'Performance Flow');
    const validation = validator.validate(dsl);
    const xml = xmlGen.generate(dsl);

    const elapsed = performance.now() - startTime;

    expect(validation.valid).toBe(true);
    expect(dsl.elements.length).toBeGreaterThan(50);
    expect(xml).toContain('<recordLookups>');
    expect(xml).toContain('<waits>');
    expect(elapsed).toBeLessThan(3000); // keep under 3s for 50+ nodes on typical hardware
  });
});
