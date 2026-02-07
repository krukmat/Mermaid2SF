import { FlowDSL } from '../types/flow-dsl';
import { XMLGenerator, createXMLGenerator } from './xml/xml-generator';

export class FlowXmlGenerator {
  private readonly generator: XMLGenerator;

  constructor(generator: XMLGenerator = createXMLGenerator()) {
    this.generator = generator;
  }

  /**
   * Generate Salesforce Flow XML from DSL
   * @param dsl - Flow DSL
   * @returns XML string
   */
  generate(dsl: FlowDSL): string {
    return this.generator.generate(dsl);
  }
}
