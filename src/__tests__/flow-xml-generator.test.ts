import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { FlowDSL } from '../types/flow-dsl';
import { yamlStringify } from '../cli/commands/compile';

describe('FlowXmlGenerator', () => {
  it('resolves connectors to element API names when IDs differ', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'TestFlow',
      label: 'Test Flow',
      processType: 'Autolaunched',
      apiVersion: '60.0',
      startElement: 'Start_Id',
      elements: [
        { id: 'Start_Id', type: 'Start', apiName: 'Start_Api', next: 'Assign_Id' },
        {
          id: 'Assign_Id',
          type: 'Assignment',
          apiName: 'Assign_Api',
          label: 'Assign Work',
          assignments: [],
          next: 'End_Id',
        },
        { id: 'End_Id', type: 'End', apiName: 'End_Api' },
      ],
    };

    const generator = new FlowXmlGenerator();
    const xml = generator.generate(dsl);

    expect(xml).toContain('<targetReference>Assign_Api</targetReference>');
    expect(xml).toContain('<targetReference>End_Api</targetReference>');
  });

  it('generates XML for advanced element options and optional branches', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'AdvancedFlow',
      label: 'Advanced Flow',
      processType: 'Autolaunched',
      apiVersion: '60.0',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'A1' },
        {
          id: 'A1',
          type: 'Assignment',
          label: 'Assign',
          assignments: [
            { variable: 'zVar', value: 'z' },
            { variable: 'aVar', value: 'a' },
          ],
          next: 'D1',
        },
        {
          id: 'D1',
          type: 'Decision',
          label: 'Route',
          outcomes: [
            { name: 'Yes', condition: '{!x}', next: 'S1' },
            { name: 'Default', isDefault: true, next: 'RC1' },
          ],
        },
        {
          id: 'S1',
          type: 'Screen',
          label: 'Form',
          components: [
            {
              type: 'Field',
              name: 'Name',
              dataType: 'String',
              target: '{!varName}',
              required: true,
            },
            { type: 'DisplayText', name: 'Msg', text: 'Hello <world>' },
          ],
          next: 'RU1',
        },
        {
          id: 'RC1',
          type: 'RecordCreate',
          object: 'Account',
          fields: { Name: 'Acme', Phone: '123' },
          assignRecordIdToReference: 'varRecordId',
          next: 'RU1',
        },
        {
          id: 'RU1',
          type: 'RecordUpdate',
          object: 'Account',
          fields: { Name: 'Updated' },
          filters: [{ field: 'Id', operator: 'EqualTo', value: '{!varRecordId}' }],
          next: 'SF1',
        },
        {
          id: 'SF1',
          type: 'Subflow',
          flowName: 'ChildFlow',
          inputAssignments: [{ name: 'inVar', value: '{!Name}' }],
          outputAssignments: [{ name: 'outVar', value: '{!Result}' }],
          next: 'L1',
        },
        { id: 'L1', type: 'Loop', collection: 'coll_Items', next: 'W1' },
        {
          id: 'W1',
          type: 'Wait',
          waitType: 'duration',
          durationValue: 5,
          durationUnit: 'Minutes',
          next: 'G1',
        },
        {
          id: 'G1',
          type: 'GetRecords',
          object: 'Account',
          filters: [{ field: 'Name', operator: 'EqualTo', value: 'Acme' }],
          fields: ['Id', 'Name'],
          sortField: 'Name',
          sortDirection: 'Descending',
          next: 'F1',
        },
        { id: 'F1', type: 'Fault', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };

    const xml = new FlowXmlGenerator().generate(dsl);

    expect(xml).toContain('<assignmentItems>');
    expect(xml).toContain('<defaultConnector>');
    expect(xml).toContain('<defaultConnectorLabel>Default</defaultConnectorLabel>');
    expect(xml).toContain('<fieldType>Field</fieldType>');
    expect(xml).toContain('<fieldText>Hello &lt;world&gt;</fieldText>');
    expect(xml).toContain('<assignRecordIdToReference>varRecordId</assignRecordIdToReference>');
    expect(xml).toContain('<filters>');
    expect(xml).toContain('<inputAssignments>');
    expect(xml).toContain('<outputAssignments>');
    expect(xml).toContain('<collectionReference>coll_Items</collectionReference>');
    expect(xml).toContain('<eventType>TimeBased</eventType>');
    expect(xml).toContain('<offsetUnit>Minutes</offsetUnit>');
    expect(xml).toContain('<recordLookups>');
    expect(xml).toContain('<sortOrder>Descending</sortOrder>');
    expect(xml).toContain('<faults>');
  });

  it('handles wait event and wait condition fallback branches', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'WaitFlow',
      label: 'Wait Flow',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'WEvent' },
        {
          id: 'WEvent',
          type: 'Wait',
          waitType: 'event',
          eventName: 'Order_Event__e',
          condition: '{!flag} = true',
          next: 'WCond',
        },
        { id: 'WCond', type: 'Wait', condition: '{!x} > 0', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };

    const xml = new FlowXmlGenerator().generate(dsl);
    expect(xml).toContain('<platformEventName>Order_Event__e</platformEventName>');
    expect(xml).toContain('<conditionLogic>{!flag} = true</conditionLogic>');
    expect(xml).toContain('<conditionLogic>{!x} &gt; 0</conditionLogic>');
  });

  it('ignores unknown element types in generator default case', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'UnknownTypeFlow',
      label: 'Unknown Type Flow',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'U1' },
        { id: 'U1', type: 'UnknownType' as any },
      ] as any,
    };

    const xml = new FlowXmlGenerator().generate(dsl);
    expect(xml).toContain('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');
  });
});

describe('yamlStringify', () => {
  it('emits YAML when yaml format is requested', () => {
    const yaml = yamlStringify({ name: 'Flow', steps: ['one', 'two'] });

    expect(yaml.includes('{')).toBe(false);
    expect(yaml).toContain('name: Flow');
    expect(yaml).toContain('- one');
  });
});
