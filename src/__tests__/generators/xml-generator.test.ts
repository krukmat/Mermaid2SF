import { XMLGenerator } from '../../generators/xml/xml-generator';
import { HeaderGenerator } from '../../generators/xml/components/header-generator';
import { FooterGenerator } from '../../generators/xml/components/footer-generator';
import { ElementGenerator } from '../../generators/xml/components/element-generator';
import { ConnectorGenerator } from '../../generators/xml/components/connector-generator';
import { FlowDSL, FlowElement } from '../../types/flow-dsl';
import {
  ElementStrategy,
  XMLGeneratorContext,
} from '../../generators/xml/strategies/element-strategy';

class DummyStrategy implements ElementStrategy {
  generate(_element: FlowElement, _context: XMLGeneratorContext): string[] {
    return ['    <dummy />'];
  }
}

describe('XMLGenerator', () => {
  it('generates deterministic XML with start connector', () => {
    const elementGenerator = new ElementGenerator(new Map([['Assignment', new DummyStrategy()]]));
    const generator = new XMLGenerator(
      new HeaderGenerator(),
      elementGenerator,
      new ConnectorGenerator(),
      new FooterGenerator(),
    );

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
          assignments: [],
        },
      ],
    };

    const xml = generator.generate(dsl);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');
    expect(xml).toContain('<targetReference>Assign_Api</targetReference>');
    expect(xml).toContain('</Flow>');
  });
});
