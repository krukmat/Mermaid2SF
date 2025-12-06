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
  GetNode[GET: Accounts\\n api: Get_Accounts\\n object: Account\\n field: Id\\n filter: Name = 'Test'\\n sort: Name desc]
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

    const get = dsl.elements.find((e: any) => e.type === 'GetRecords') as any;
    expect(get.sortField).toBe('Name');
    expect(get.sortDirection).toBe('Descending');

    const xml = xmlGen.generate(dsl);
    expect(xml).toContain('<loops>');
    expect(xml).toContain('<recordLookups>');
    expect(xml).toContain('<waits>');
    expect(xml).toContain('<faults>');
    expect(xml).toContain('<sortField>Name</sortField>');
    expect(xml).toContain('<sortOrder>Descending</sortOrder>');
  });

  it('supports Wait duration and event variants', () => {
    const mermaid = `
flowchart TD
  Start([START: Demo])
  WaitDur([WAIT: Delay\\n api: Wait_Dur\\n duration: 5m])
  WaitEvt([WAIT: Event\\n api: Wait_Event\\n event: Order_Event__e\\n condition: Status__c = 'Ready'])
  End([END: Done])

  Start --> WaitDur
  WaitDur --> WaitEvt
  WaitEvt --> End
    `;

    const graph = parser.parse(mermaid);
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      const metadata = extractor.extract(node);
      metadataMap.set(node.id, metadata);
    }

    const dsl = builder.build(graph, metadataMap, 'Demo_Flow', 'Demo Flow');
    const waits = dsl.elements.filter((e: any) => e.type === 'Wait');
    expect(waits.length).toBe(2);

    const waitDur = waits.find((w: any) => w.apiName === 'Wait_Dur') as any;
    expect(waitDur.waitType).toBe('duration');
    expect(waitDur.durationValue).toBe(5);
    expect(waitDur.durationUnit).toBe('Minutes');

    const waitEvt = waits.find((w: any) => w.apiName === 'Wait_Event') as any;
    expect(waitEvt.waitType).toBe('event');
    expect(waitEvt.eventName).toBe('Order_Event__e');
    expect(waitEvt.condition).toBe("Status__c = 'Ready'");

    const xml = xmlGen.generate(dsl);
    expect(xml).toContain('<offsetNumber>5</offsetNumber>');
    expect(xml).toContain('<offsetUnit>Minutes</offsetUnit>');
    expect(xml).toContain('<platformEventName>Order_Event__e</platformEventName>');
    expect(xml).toContain('<conditionLogic>Status__c = &apos;Ready&apos;</conditionLogic>');
  });
});
