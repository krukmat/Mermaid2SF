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

const scheduleTriggered: FlowDSL = {
  version: 2,
  flowApiName: 'Golden_ScheduleTriggered',
  label: 'Golden Schedule Triggered',
  flowKind: 'ScheduleTriggered',
  processType: 'ScheduleTriggered',
  apiVersion: '67.0',
  status: 'Draft',
  schedule: {
    frequency: 'Daily',
    startDate: '2030-01-01',
    startTime: '02:00:00.000Z',
    object: 'Account',
    filterLogic: 'and',
    filters: [
      { field: 'Industry', operator: 'EqualTo', value: { kind: 'string', value: 'Technology' } },
    ],
  },
  startElement: 'Start',
  variables: [
    { name: 'recordName', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
  ],
  elements: [
    { id: 'Start', type: 'Start', next: 'Capture_Record_Name' },
    {
      id: 'Capture_Record_Name',
      type: 'Assignment',
      label: 'Capture Record Name',
      assignments: [{ variable: 'recordName', value: { kind: 'reference', name: '$Record.Name' } }],
      next: 'End',
    },
    { id: 'End', type: 'End' },
  ],
};

const cases: Array<[string, FlowDSL]> = [
  ['Golden_Autolaunched', autolaunched],
  ['Golden_Screen', screen],
  ['Golden_RecordTriggered', recordTriggered],
  ['Golden_ScheduleTriggered', scheduleTriggered],
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

  it('Wave 2B Salesforce validation fixture is canonical compiler output', () => {
    const sourceXml = fixture('Golden_RecordTriggered_BeforeSave');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_BeforeSave');
    const regeneratedXml = generator.generate(sourceIr);

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger?.triggerType).toBe('RecordBeforeSave');
    expect(canonicalizeXml(regeneratedXml)).toEqual(canonicalizeXml(sourceXml));
  });

  it('Wave 2B rich Before Save preserves trigger and business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_RecordTriggered_BeforeSave_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_BeforeSave_Rich');

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger).toEqual(expect.objectContaining({
      object: 'Account',
      triggerType: 'RecordBeforeSave',
      recordTriggerType: 'CreateAndUpdate',
      filterLogic: 'and',
    }));

    const mermaid = mermaidGenerator.generate(sourceIr);
    expect(mermaid).toContain('flow: record-triggered');
    expect(mermaid).toContain('trigger: before-save');
    expect(mermaid).toContain('record-trigger: create-and-update');
    expect(mermaid).toContain('filter: Industry = Technology');
    expect(mermaid).toContain('set: $Record.Description = Validated by Mermaid2SF');

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
  ] as const)('Wave 2B canonical Mermaid preserves %s trigger mode', (_mermaidMode, recordTriggerType) => {
    const source: FlowDSL = {
      version: 2,
      flowApiName: `BeforeSave_${recordTriggerType}`,
      label: `Before Save ${recordTriggerType}`,
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      apiVersion: '67.0',
      status: 'Draft',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeSave',
        recordTriggerType,
      },
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'SetDescription' },
        {
          id: 'SetDescription',
          type: 'Assignment',
          assignments: [{
            variable: '$Record.Description',
            value: { kind: 'string', value: 'Wave 2B' },
          }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    };

    const mermaid = mermaidGenerator.generate(source);
    const reparsed = parseMermaidToFlowIr(mermaid, source.flowApiName, source.label);

    expect(reparsed.trigger?.triggerType).toBe('RecordBeforeSave');
    expect(reparsed.trigger?.recordTriggerType).toBe(recordTriggerType);
    expect(semanticDiff(source, reparsed).equal).toBe(true);
  });

  it('Wave 3 Salesforce validation fixture is canonical compiler output', () => {
    const sourceXml = fixture('Golden_ScheduleTriggered');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_ScheduleTriggered');
    const regeneratedXml = generator.generate(sourceIr);

    expect(sourceIr.flowKind).toBe('ScheduleTriggered');
    expect(sourceIr.schedule).toEqual(expect.objectContaining({
      frequency: 'Daily',
      startDate: '2030-01-01',
      startTime: '02:00:00.000Z',
      object: 'Account',
      filterLogic: 'and',
    }));
    expect(canonicalizeXml(regeneratedXml)).toEqual(canonicalizeXml(sourceXml));
  });

  it('Wave 3 rich Schedule-Triggered preserves schedule and business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_ScheduleTriggered_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_ScheduleTriggered_Rich');

    expect(sourceIr.flowKind).toBe('ScheduleTriggered');
    expect(sourceIr.schedule).toEqual(expect.objectContaining({
      frequency: 'Weekly',
      startDate: '2030-01-07',
      startTime: '03:30:00.000Z',
      object: 'Account',
      filterLogic: 'and',
    }));

    const mermaid = mermaidGenerator.generate(sourceIr);
    expect(mermaid).toContain('flow: schedule-triggered');
    expect(mermaid).toContain('frequency: weekly');
    expect(mermaid).toContain('start-date: 2030-01-07');
    expect(mermaid).toContain('start-time: 03:30:00.000Z');
    expect(mermaid).toContain('object: Account');
    expect(mermaid).toContain('filter: Industry = Technology');
    expect(mermaid).toContain('set: recordName = ref:$Record.Name');

    const mermaidIr = parseMermaidToFlowIr(mermaid, sourceIr.flowApiName, sourceIr.label);
    const regeneratedXml = generator.generate(mermaidIr);
    const finalIr = parseFlowXmlText(regeneratedXml, sourceIr.flowApiName);

    expect(semanticDiff(sourceIr, mermaidIr).equal).toBe(true);
    expect(semanticDiff(sourceIr, finalIr).equal).toBe(true);
  });

  it.each([
    ['once', 'Once'],
    ['daily', 'Daily'],
    ['weekly', 'Weekly'],
  ] as const)('Wave 3 canonical Mermaid preserves %s schedule frequency', (_mermaidFrequency, frequency) => {
    const source: FlowDSL = {
      version: 2,
      flowApiName: `Scheduled_${frequency}`,
      label: `Scheduled ${frequency}`,
      flowKind: 'ScheduleTriggered',
      processType: 'ScheduleTriggered',
      apiVersion: '67.0',
      status: 'Draft',
      schedule: {
        frequency,
        startDate: '2030-01-01',
        startTime: '02:00:00.000Z',
      },
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };

    const mermaid = mermaidGenerator.generate(source);
    const reparsed = parseMermaidToFlowIr(mermaid, source.flowApiName, source.label);

    expect(reparsed.flowKind).toBe('ScheduleTriggered');
    expect(reparsed.schedule?.frequency).toBe(frequency);
    expect(semanticDiff(source, reparsed).equal).toBe(true);
  });

  it('Wave 4 Salesforce validation fixture is canonical compiler output', () => {
    const sourceXml = fixture('Golden_RecordTriggered_BeforeDelete');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_BeforeDelete');
    const regeneratedXml = generator.generate(sourceIr);

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger).toEqual(expect.objectContaining({
      object: 'Account',
      triggerType: 'RecordBeforeDelete',
      recordTriggerType: 'Delete',
      filterLogic: 'and',
    }));
    expect(canonicalizeXml(regeneratedXml)).toEqual(canonicalizeXml(sourceXml));
  });

  it('Wave 4 rich Before Delete preserves trigger and business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_RecordTriggered_BeforeDelete_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_RecordTriggered_BeforeDelete_Rich');

    expect(sourceIr.flowKind).toBe('RecordTriggered');
    expect(sourceIr.trigger).toEqual(expect.objectContaining({
      object: 'Account',
      triggerType: 'RecordBeforeDelete',
      recordTriggerType: 'Delete',
      filterLogic: 'and',
    }));

    const mermaid = mermaidGenerator.generate(sourceIr);
    expect(mermaid).toContain('flow: record-triggered');
    expect(mermaid).toContain('trigger: before-delete');
    expect(mermaid).toContain('record-trigger: delete');
    expect(mermaid).toContain('filter: Industry = Technology');
    expect(mermaid).toContain('set: deletedRecordId = ref:$Record.Id');

    const mermaidIr = parseMermaidToFlowIr(mermaid, sourceIr.flowApiName, sourceIr.label);
    const regeneratedXml = generator.generate(mermaidIr);
    const finalIr = parseFlowXmlText(regeneratedXml, sourceIr.flowApiName);

    expect(semanticDiff(sourceIr, mermaidIr).equal).toBe(true);
    expect(semanticDiff(sourceIr, finalIr).equal).toBe(true);
  });

  it('Wave 4 canonical Mermaid preserves the before-delete/delete trigger pair', () => {
    const source: FlowDSL = {
      version: 2,
      flowApiName: 'BeforeDelete_Account',
      label: 'Before Delete Account',
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      apiVersion: '67.0',
      status: 'Draft',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeDelete',
        recordTriggerType: 'Delete',
      },
      startElement: 'Start',
      variables: [
        { name: 'deletedId', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
      ],
      elements: [
        { id: 'Start', type: 'Start', next: 'Capture' },
        {
          id: 'Capture',
          type: 'Assignment',
          assignments: [{ variable: 'deletedId', value: { kind: 'reference', name: '$Record.Id' } }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    };

    const mermaid = mermaidGenerator.generate(source);
    const reparsed = parseMermaidToFlowIr(mermaid, source.flowApiName, source.label);

    expect(mermaid).toContain('trigger: before-delete');
    expect(mermaid).toContain('record-trigger: delete');
    expect(reparsed.trigger?.triggerType).toBe('RecordBeforeDelete');
    expect(reparsed.trigger?.recordTriggerType).toBe('Delete');
    expect(semanticDiff(source, reparsed).equal).toBe(true);
  });

  it('Wave 5 Salesforce validation fixture is canonical compiler output', () => {
    const sourceXml = fixture('Golden_PlatformEventTriggered');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_PlatformEventTriggered');
    const regeneratedXml = generator.generate(sourceIr);

    expect(sourceIr.flowKind).toBe('PlatformEventTriggered');
    expect(sourceIr.platformEvent).toEqual({
      eventApiName: 'M2SF_Validation_Event__e',
    });
    expect(canonicalizeXml(regeneratedXml)).toEqual(canonicalizeXml(sourceXml));
  });

  it('Wave 5 rich Platform Event preserves event payload and business semantics through Salesforce XML <-> FlowIR <-> Mermaid', () => {
    const sourceXml = waveFixture('Golden_PlatformEventTriggered_Rich');
    const sourceIr = parseFlowXmlText(sourceXml, 'Golden_PlatformEventTriggered_Rich');

    expect(sourceIr.flowKind).toBe('PlatformEventTriggered');
    expect(sourceIr.platformEvent).toEqual({
      eventApiName: 'M2SF_Validation_Event__e',
    });

    const mermaid = mermaidGenerator.generate(sourceIr);
    expect(mermaid).toContain('flow: platform-event-triggered');
    expect(mermaid).toContain('event: M2SF_Validation_Event__e');
    expect(mermaid).toContain('set: eventStatus = ref:$Record.Status__c');

    const mermaidIr = parseMermaidToFlowIr(mermaid, sourceIr.flowApiName, sourceIr.label);
    const regeneratedXml = generator.generate(mermaidIr);
    const finalIr = parseFlowXmlText(regeneratedXml, sourceIr.flowApiName);

    expect(semanticDiff(sourceIr, mermaidIr).equal).toBe(true);
    expect(semanticDiff(sourceIr, finalIr).equal).toBe(true);
  });

  it('Wave 5 canonical Mermaid preserves platform-event trigger metadata', () => {
    const source: FlowDSL = {
      version: 2,
      flowApiName: 'Platform_Event_Test',
      label: 'Platform Event Test',
      flowKind: 'PlatformEventTriggered',
      processType: 'PlatformEventTriggered',
      apiVersion: '67.0',
      status: 'Draft',
      platformEvent: {
        eventApiName: 'M2SF_Validation_Event__e',
      },
      startElement: 'Start',
      variables: [
        { name: 'message', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
      ],
      elements: [
        { id: 'Start', type: 'Start', next: 'Capture' },
        {
          id: 'Capture',
          type: 'Assignment',
          assignments: [{ variable: 'message', value: { kind: 'reference', name: '$Record.Message__c' } }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    };

    const mermaid = mermaidGenerator.generate(source);
    const reparsed = parseMermaidToFlowIr(mermaid, source.flowApiName, source.label);

    expect(mermaid).toContain('flow: platform-event-triggered');
    expect(mermaid).toContain('event: M2SF_Validation_Event__e');
    expect(reparsed.flowKind).toBe('PlatformEventTriggered');
    expect(reparsed.platformEvent?.eventApiName).toBe('M2SF_Validation_Event__e');
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
