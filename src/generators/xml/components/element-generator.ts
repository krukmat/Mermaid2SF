import { FlowElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from '../strategies/element-strategy';

export class ElementGenerator {
  constructor(private readonly strategies: Map<FlowElement['type'], ElementStrategy>) {}

  generate(element: FlowElement, context: XMLGeneratorContext): string[] {
    const strategy = this.strategies.get(element.type);
    if (!strategy) {
      return [];
    }

    return strategy.generate(element as never, context);
  }
}
