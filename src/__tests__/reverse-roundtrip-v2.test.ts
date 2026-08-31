import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { parseFlowXmlText } from '../reverse/xml-parser';
import { FlowDSL } from '../types/flow-dsl';
import { semanticDiff } from '../utils/flow-semantic';

describe('M5 semantic reverse fidelity', () => {
  it('round-trips the guaranteed non-screen compiler subset', () => {
    const dsl: FlowDSL = {
      version: 2,
      flowApiName: 'RoundTrip_Core',
      label: 'RoundTrip Core',
      flowKind: 'Autolaunched',
      processType: 'Autolaunched',
      apiVersion: '67.0',
      status: 'Draft',
      startElement: 'Start',
      variables: [
        { name: 'flag', dataType: 'Boolean', isCollection: false, isInput: false, isOutput: false },
        { name: 'accountId', dataType: 'String', isCollection: false, isInput: true, isOutput: false },
      ],
      elements: [
        { id: 'Start', type: 'Start', next: 'Assign' },
        { id: 'Assign', type: 'Assignment', label: 'Set Flag', assignments: [{ variable: 'flag', value: true }], next: 'Decision' },
        {
          id: 'Decision', type: 'Decision', label: 'Route', outcomes: [
            { name: 'Create', conditions: [{ left: { kind: 'reference', name: 'flag' }, operator: 'EqualTo', right: true }], next: 'Create' },
            { name: 'Lookup', isDefault: true, next: 'Lookup' },
          ],
        },
        { id: 'Create', type: 'RecordCreate', label: 'Create Account', object: 'Account', fields: { Name: 'Acme', Active__c: true, AnnualRevenue: 42 }, next: 'Update' },
        { id: 'Update', type: 'RecordUpdate', label: 'Update Account', object: 'Account', filters: [{ field: 'Id', operator: 'EqualTo', value: { kind: 'reference', name: 'accountId' } }], fields: { Name: 'Updated' }, next: 'Subflow' },
        { id: 'Lookup', type: 'GetRecords', label: 'Get Account', object: 'Account', filters: [{ field: 'Id', operator: 'EqualTo', value: { kind: 'reference', name: 'accountId' } }], fields: ['Id', 'Name'], sortField: 'Name', sortDirection: 'Ascending', next: 'Subflow' },
        { id: 'Subflow', type: 'Subflow', label: 'Child', flowName: 'Child_Flow', inputAssignments: [{ name: 'message', value: 'hello' }], next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };

    const xml = new FlowXmlGenerator().generate(dsl);
    const imported = parseFlowXmlText(xml, dsl.flowApiName);
    const diff = semanticDiff(dsl, imported);
    expect(diff.equal).toBe(true);
  });

  it('round-trips basic Screen metadata and components', () => {
    const dsl: FlowDSL = {
      version: 2,
      flowApiName: 'RoundTrip_Screen',
      label: 'RoundTrip Screen',
      flowKind: 'Screen',
      processType: 'Screen',
      apiVersion: '67.0',
      status: 'Draft',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'Screen' },
        { id: 'Screen', type: 'Screen', label: 'Input', allowBack: true, allowFinish: false, components: [{ type: 'DisplayText', name: 'Intro', text: 'Hello <world>' }], next: 'End' },
        { id: 'End', type: 'End' },
      ],
    };
    const imported = parseFlowXmlText(new FlowXmlGenerator().generate(dsl), dsl.flowApiName);
    expect(semanticDiff(dsl, imported).equal).toBe(true);
  });
});
