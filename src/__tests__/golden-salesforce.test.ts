import * as fs from 'fs';
import * as path from 'path';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { parseFlowXmlText } from '../reverse/xml-parser';
import { FlowDSL } from '../types/flow-dsl';
import { semanticDiff } from '../utils/flow-semantic';
import { canonicalizeXml } from '../utils/xml-tree';

const fixtureDir = path.join(
  __dirname,
  '../../test/salesforce-project/force-app/main/default/flows',
);

function fixture(name: string): string {
  return fs.readFileSync(path.join(fixtureDir, `${name}.flow-meta.xml`), 'utf-8');
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

  it('XML canonicalization ignores formatting but not metadata structure', () => {
    const original = fixture('Golden_RecordTriggered');
    const compact = original.replace(/>\s+</g, '><').trim();
    expect(canonicalizeXml(compact)).toEqual(canonicalizeXml(original));
    expect(canonicalizeXml(original)).not.toEqual(
      canonicalizeXml(original.replace('<object>Account</object>', '<object>Contact</object>')),
    );
  });
});
