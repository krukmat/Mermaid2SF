import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { FlowDSL } from '../types/flow-dsl';

function baseDsl(kind: 'Screen' | 'Autolaunched' | 'RecordTriggered'): FlowDSL {
  return {
    version: 2,
    flowApiName: 'Family_Test',
    label: 'Family Test',
    flowKind: kind,
    processType: kind,
    apiVersion: '67.0',
    status: 'Draft',
    startElement: 'Start',
    elements: [
      { id: 'Start', type: 'Start', next: 'End' },
      { id: 'End', type: 'End' },
    ],
  };
}

describe('Salesforce correctness baseline', () => {
  it('maps Screen Flow to Salesforce processType Flow', () => {
    const dsl = baseDsl('Screen');
    dsl.elements.splice(1, 0, {
      id: 'Welcome',
      apiName: 'Welcome',
      type: 'Screen',
      components: [],
      next: 'End',
    });
    (dsl.elements[0] as any).next = 'Welcome';

    const xml = new FlowXmlGenerator().generate(dsl);
    expect(xml).toContain('<processType>Flow</processType>');
    expect(xml).toContain('<status>Draft</status>');
    expect(xml).not.toContain('<targetReference>End</targetReference>');
  });

  it('maps Autolaunched Flow to AutoLaunchedFlow', () => {
    const xml = new FlowXmlGenerator().generate(baseDsl('Autolaunched'));
    expect(xml).toContain('<processType>AutoLaunchedFlow</processType>');
    expect(xml).not.toContain('<targetReference>End</targetReference>');
  });

  it('serializes record-triggered start metadata', () => {
    const dsl = baseDsl('RecordTriggered');
    dsl.trigger = {
      object: 'Account',
      recordTriggerType: 'CreateAndUpdate',
      triggerType: 'RecordAfterSave',
    };

    const xml = new FlowXmlGenerator().generate(dsl);
    expect(xml).toContain('<processType>AutoLaunchedFlow</processType>');
    expect(xml).toContain('<object>Account</object>');
    expect(xml).toContain('<recordTriggerType>CreateAndUpdate</recordTriggerType>');
    expect(xml).toContain('<triggerType>RecordAfterSave</triggerType>');
  });
});
