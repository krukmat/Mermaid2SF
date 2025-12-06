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
});

describe('yamlStringify', () => {
  it('emits YAML when yaml format is requested', () => {
    const yaml = yamlStringify({ name: 'Flow', steps: ['one', 'two'] });

    expect(yaml.includes('{')).toBe(false);
    expect(yaml).toContain('name: Flow');
    expect(yaml).toContain('- one');
  });
});
