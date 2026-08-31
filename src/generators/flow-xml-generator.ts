import { FlowDSL } from '../types/flow-dsl';
import { FlowValidator } from '../validator/flow-validator';
import { XMLGenerator, createXMLGenerator } from './xml/xml-generator';

export class FlowXmlGenerator {
  private readonly generator: XMLGenerator;
  private readonly validator: FlowValidator;

  constructor(generator: XMLGenerator = createXMLGenerator(), validator: FlowValidator = new FlowValidator()) {
    this.generator = generator;
    this.validator = validator;
  }

  /**
   * Generate Salesforce Flow XML from FlowIR.
   * FlowIR v2 is always Salesforce-semantically validated before serialization.
   * v1 remains available as a compatibility path for legacy fixtures/callers.
   */
  generate(dsl: FlowDSL): string {
    if (dsl.version >= 2) {
      const result = this.validator.validate(dsl);
      if (!result.valid) {
        const summary = result.errors
          .map((error) => `${error.code}${error.elementId ? ` [${error.elementId}]` : ''}: ${error.message}`)
          .join('; ');
        throw new Error(`Salesforce semantic validation failed: ${summary}`);
      }
    }
    return this.generator.generate(dsl);
  }
}
