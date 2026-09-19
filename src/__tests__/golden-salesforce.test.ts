import * as fs from 'fs';
import * as path from 'path';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { MermaidGenerator } from '../generators/mermaid-generator';
import { MermaidParser } from '../parser/mermaid-parser';
import { parseFlowXmlText } from '../reverse/xml-parser';
import { FlowDSL } from '../types/flow-dsl';
import { semanticDiff } from '../utils/flow-semantic';
import { canonicalizeXml } from '../utils/xml-tree';

const fixtureDir = path.join(
  __dirname,
  '../../test/salesforce-project/force-app/main/default/flows',
);
const waveFixtureDir = path.join(__dirname, '../../test/fixtures');

function fixture(name: string): string {
  return fs.readFileSync(path.join(fixtureDir, `${name}.flow-meta.xml`), 'utf-8');
}

function waveFixture(name: string): string {
  return fs.readFileSync(path.join(waveFixtureDir, `${name}.flow-meta.xml`), 'utf-8');
}

function parseMermaidToFlowIr(mermaid: string, flowApiName: string, flowLabel: string): FlowDSL {
  const graph = new MermaidParser().parse(mermaid);
  const extractor = new MetadataExtractor();
  const metadataMap = new Map(
    graph.nodes.map((node) => [node.id, extractor.extract(node)]),
  );
  return new IntermediateModelBuilder().build(graph, metadataMap, flowApiName, flowLabel);
}

const autolaunched: FlowDSL = {
  version: 2,
  flowApiName: 'Golden_Autolaunched',
  label: 'Golden Autolaunched',
  flowKind: 'Autolaunched',
  processType: 'Autolaunched',
  apiVersion: '67.0',
  status: 'Draft',
  startElement: 'Start',
  variables: [
    { name: 'flag', dataType: 'Boolean', isCollection: false, isInput: false, isOutput: false },
  ],
  elements: [
    { id: 'Start', type: 'Start', next: 'Set_Flag' },
    {
      id: 'Set_Flag',
      type: 'Assignment',
      label: 'Set Flag',
      assignments: [{ variable: 'flag', value: true }],
      next: 'End',
    },
    { id: 'End', type: 'End' },
  ],
};

const screen: FlowDSL = {
  version: 2,
  flowApiName: 'Golden_Screen',
  label: 'Golden Screen',
  flowKind: 'Screen',
  processType: 'Screen',
  apiVersion: '67.0',
  status: 'Draft',
  startElement: 'Start',
  elements: [
    { id: 'Start', type: 'Start', next: 'Welcome' },
    {
      id: 'Welcome',
      type: 'Screen',
      label: 'Welcome',
      allowBack: true,
      allowFinish: true,
      components: [{ type: 'DisplayText', name: 'Message', text: 'Hello' }],
      next: 'End',
    },
    { id: 'End', type: 'End' },
  ],
};

const recordTriggered: FlowDSL = {
  version: 2,
  flowApiName: 'Golden_RecordTriggered',
  label: 'Golden Record Triggered',
  flowKind: 'RecordTriggered',
  processType: 'RecordTriggered',
  apiVersion: '67.0',
  status: 'Draft',
  trigger: {
    object: 'Account',
    recordTriggerType: 'CreateAndUpdate',
    triggerType: 'RecordAfterSave',
  },
  startElement: 'Start',
  elements: [
    { id: 'Start', type: 'Start', next: 'End' },
    { id: 'End', type: 'End' },
  ],
};

const cases: Array<[string, FlowDSL]> = [
  ['Golden_Autolaunched', autolaunched],
  ['Golden_Screen', screen],
  ['Golden_RecordTriggered', recordTriggered],
];

describe('M4 Salesforce correctness gates', () => {
  const generator = new FlowXmlGenerator();
  const mermaidGenerator = new MermaidGenerator();

  it.each(cases)('%s matches normalized golden metadata', (name, dsl) => {
    const generated = canonicalizeXml(generator.generate(dsl));
    const expected = canonicalizeXml(fixture(name));
    expect(generated).toEqual(expected);
  });

  it.each(cases)('%s survives XML semantic round-trip', (name, dsl) => {
    const xml = generator.generate(dsl);
    const imported = parseFlowXmlText(xml, name);
    const diff = semanticDiff(dsl, imported);
    expect(diff.equal).toBe(true);
  });

  it('Autolaunched survives Salesforce XML -> FlowIR -> Mermaid -> FlowIR -> Salesforce XML', () => {
    const sourceXml = fixture('Golden_Autolaunched');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_Autolaunched');
    const mermaid = mermaidGenerator.generate(sourceIr);
    const reparsedIr = parseMermaidToFlowIr(
      mermaid,
      sourceIr.flowApiName,
      sourceIr.label,
    );

    expect(semanticDiff(sourceIr, reparsedIr).equal).toBe(true);
    expect(canonicalizeXml(generator.generate(reparsedIr))).toEqual(canonicalizeXml(sourceXml));
  });

  it('rich Autolaunched preserves business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_Autolaunched_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_Autolaunched_Rich');
    const mermaid = mermaidGenerator.generate(sourceIr);
    const mermaidIr = parseMermaidToFlowIr(mermaid, sourceIr.flowApiName, sourceIr.label);
    const regeneratedXml = generator.generate(mermaidIr);
    const finalIr = parseFlowXmlText(regeneratedXml, sourceIr.flowApiName);

    expect(semanticDiff(sourceIr, mermaidIr).equal).toBe(true);
    expect(semanticDiff(sourceIr, finalIr).equal).toBe(true);
  });

  it('Wave 2A Salesforce validation fixture is canonical compiler output', () => {
    const sourceXml = fixture('Golden_RecordTriggered_AfterSave');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_AfterSave');
    const regeneratedXml = generator.generate(sourceIr);

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger?.triggerType).toBe('RecordAfterSave');
    expect(canonicalizeXml(regeneratedXml)).toEqual(canonicalizeXml(sourceXml));
  });

  it('Wave 2A rich After Save preserves trigger and business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_RecordTriggered_AfterSave_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_AfterSave_Rich');

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger).toEqual(expect.objectContaining({
      object: 'Account',
      triggerType: 'RecordAfterSave',
      recordTriggerType: 'CreateAndUpdate',
      filterLogic: 'and',
      doesRequireRecordChangedToMeetCriteria: false,
    }));

    const mermaid = mermaidGenerator.generate(sourceIr);
    expect(mermaid).toContain('flow: record-triggered');
    expect(mermaid).toContain('object: Account');
    expect(mermaid).toContain('trigger: after-save');
    expect(mermaid).toContain('record-trigger: create-and-update');
    expect(mermaid).toContain('filter-logic: and');
    expect(mermaid).toContain('filter: Industry = Technology');
    expect(mermaid).toContain('require-changed-to-meet-criteria: false');

    const mermaidIr = parseMermaidToFlowIr(mermaid, sourceIr.flowApiName, sourceIr.label);
    const regeneratedXml = generator.generate(mermaidIr);
    const finalIr = parseFlowXmlText(regeneratedXml, sourceIr.flowApiName);

    expect(semanticDiff(sourceIr, mermaidIr).equal).toBe(true);
    expect(semanticDiff(sourceIr, finalIr).equal).toBe(true);
  });

  it.each([
    ['create', 'Create'],
    ['update', 'Update'],
    ['create-and-update', 'CreateAndUpdate'],
  ] as const)('Wave 2A canonical Mermaid preserves %s trigger mode', (_mermaidMode, recordTriggerType) => {
    const source: FlowDSL = {
      version: 2,
      flowApiName: `AfterSave_${recordTriggerType}`,
      label: `After Save ${recordTriggerType}`,
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      apiVersion: '67.0',
      status: 'Draft',
      trigger: {
        object: 'Account',
        triggerType: 'RecordAfterSave',
        recordTriggerType,
      },
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };

    const mermaid = mermaidGenerator.generate(source);
    const reparsed = parseMermaidToFlowIr(mermaid, source.flowApiName, source.label);

    expect(reparsed.trigger?.triggerType).toBe('RecordAfterSave');
    expect(reparsed.trigger?.recordTriggerType).toBe(recordTriggerType);
    expect(semanticDiff(source, reparsed).equal).toBe(true);
  });

  it('XML canonicalization ignores formatting but not metadata structure', () => {
    const original = fixture('Golden_RecordTriggered');
    const compact = original.replace(/>\s+</g, '><').trim();
    expect(canonicalizeXml(compact)).toEqual(canonicalizeXml(original));
    expect(canonicalizeXml(original)).not.toEqual(
      canonicalizeXml(original.replace('<object>Account</object>', '<object>Contact</object>')),
    );
  });
});
