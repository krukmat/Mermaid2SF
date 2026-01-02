import { DocsGenerator } from '../../generators/docs-generator';
import { FlowDSL } from '../../types/flow-dsl';

describe('DocsGenerator', () => {
  it('generates documentation using template pipeline', () => {
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
          label: 'Assign',
          assignments: [{ variable: 'v1', value: 'true' }],
          next: 'End_Id',
        },
        { id: 'End_Id', type: 'End', apiName: 'End_Api' },
      ],
      variables: [
        {
          name: 'v1',
          dataType: 'Boolean',
          isCollection: false,
          isInput: false,
          isOutput: true,
        },
      ],
    };

    const generator = new DocsGenerator();
    const markdown = generator.generateMarkdown(dsl, {
      includeDiagram: true,
      includeElementDetails: true,
      includeVariables: true,
      includeMetadata: true,
    });

    expect(markdown).toContain('# Test Flow');
    expect(markdown).toContain('## Flow Diagram');
    expect(markdown).toContain('```mermaid');
    expect(markdown).toContain('## Variables');
    expect(markdown).toContain('## Flow Elements');
  });
});
