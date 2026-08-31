import { parseFlowXmlText } from '../reverse/xml-parser';

describe('XML tree reverse adapter', () => {
  it('maps Salesforce processType into canonical FlowIR v2', () => {
    const dsl = parseFlowXmlText(`<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion>
  <label>Test Flow</label>
  <processType>AutoLaunchedFlow</processType>
  <start><locationX>0</locationX><locationY>0</locationY></start>
  <status>Draft</status>
</Flow>`);
    expect(dsl.version).toBe(2);
    expect(dsl.apiVersion).toBe('67.0');
    expect(dsl.label).toBe('Test Flow');
    expect(dsl.flowKind).toBe('Autolaunched');
    expect(dsl.processType).toBe('Autolaunched');
    expect(dsl.elements.some((element) => element.type === 'End')).toBe(true);
  });

  it('rejects malformed or incomplete metadata rather than fabricating a Flow', () => {
    expect(() => parseFlowXmlText('invalid xml content')).toThrow('Malformed XML');
    expect(() => parseFlowXmlText('<Flow><label>Missing Start</label></Flow>')).toThrow('<start>');
  });

  it('preserves layout and typed Assignment values', () => {
    const dsl = parseFlowXmlText(`
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion><label>Assignments</label><processType>AutoLaunchedFlow</processType>
  <assignments>
    <name>Assign_1</name><label>Initialize</label><locationX>100</locationX><locationY>200</locationY>
    <assignmentItems><assignToReference>flag</assignToReference><operator>Assign</operator><value><booleanValue>true</booleanValue></value></assignmentItems>
    <assignmentItems><assignToReference>count</assignToReference><operator>Assign</operator><value><numberValue>3</numberValue></value></assignmentItems>
  </assignments>
  <start><locationX>50</locationX><locationY>0</locationY><connector><targetReference>Assign_1</targetReference></connector></start><status>Draft</status>
</Flow>`);
    const assignment = dsl.elements.find((element) => element.type === 'Assignment');
    expect(assignment?.layout).toEqual({ x: 100, y: 200 });
    if (assignment?.type === 'Assignment') {
      expect(assignment.assignments[0].value).toEqual({ kind: 'boolean', value: true });
      expect(assignment.assignments[1].value).toEqual({ kind: 'number', value: 3 });
      expect(assignment.next).toBe('End');
    }
  });

  it('preserves Decision conditions and RecordUpdate filters', () => {
    const dsl = parseFlowXmlText(`
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion><label>Structured</label><processType>AutoLaunchedFlow</processType>
  <decisions>
    <name>Route</name><label>Route</label>
    <rules><name>Active</name><conditionLogic>and</conditionLogic><conditions><leftValueReference>status</leftValueReference><operator>EqualTo</operator><rightValue><stringValue>Active</stringValue></rightValue></conditions><connector><targetReference>Update</targetReference></connector><label>Active</label></rules>
    <defaultConnectorLabel>Default</defaultConnectorLabel>
  </decisions>
  <recordUpdates>
    <name>Update</name><label>Update</label><filterLogic>and</filterLogic>
    <filters><field>Id</field><operator>EqualTo</operator><value><elementReference>accountId</elementReference></value></filters>
    <inputAssignments><field>Active__c</field><value><booleanValue>true</booleanValue></value></inputAssignments>
    <object>Account</object>
  </recordUpdates>
  <start><connector><targetReference>Route</targetReference></connector></start><status>Draft</status>
</Flow>`);
    const decision = dsl.elements.find((element) => element.type === 'Decision');
    const update = dsl.elements.find((element) => element.type === 'RecordUpdate');
    if (decision?.type === 'Decision') {
      expect(decision.outcomes[0].conditions?.[0].right).toEqual({ kind: 'string', value: 'Active' });
      expect(decision.outcomes.some((outcome) => outcome.isDefault)).toBe(true);
    }
    if (update?.type === 'RecordUpdate') {
      expect(update.filterLogic).toBe('and');
      expect(update.filters?.[0].value).toEqual({ kind: 'reference', name: 'accountId' });
      expect(update.fields.Active__c).toEqual({ kind: 'boolean', value: true });
    }
  });

  it('preserves Screen fields and record-triggered Start metadata', () => {
    const screen = parseFlowXmlText(`
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion><label>Screen</label><processType>Flow</processType>
  <screens><name>Welcome</name><label>Welcome</label><allowBack>true</allowBack><allowFinish>true</allowFinish><fields><name>Message</name><fieldText>Hello &amp; welcome</fieldText><fieldType>DisplayText</fieldType></fields></screens>
  <start><connector><targetReference>Welcome</targetReference></connector></start><status>Draft</status>
</Flow>`);
    const screenElement = screen.elements.find((element) => element.type === 'Screen');
    if (screenElement?.type === 'Screen') {
      expect(screenElement.allowBack).toBe(true);
      expect(screenElement.allowFinish).toBe(true);
      expect(screenElement.components[0].text).toBe('Hello & welcome');
    }

    const triggered = parseFlowXmlText(`
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>67.0</apiVersion><label>Triggered</label><processType>AutoLaunchedFlow</processType>
  <start><object>Account</object><recordTriggerType>CreateAndUpdate</recordTriggerType><triggerType>RecordAfterSave</triggerType></start><status>Draft</status>
</Flow>`);
    expect(triggered.flowKind).toBe('RecordTriggered');
    expect(triggered.trigger?.object).toBe('Account');
    expect(triggered.trigger?.recordTriggerType).toBe('CreateAndUpdate');
    expect(triggered.trigger?.triggerType).toBe('RecordAfterSave');
  });
});
