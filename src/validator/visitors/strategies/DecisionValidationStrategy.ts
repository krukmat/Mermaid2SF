import { ValidationStrategy } from './ValidationStrategy';
import { FlowElement } from '../../elements/FlowElement';
import { DecisionElement } from '../../elements/DecisionElement';

export class DecisionValidationStrategy implements ValidationStrategy {
  canHandle(element: FlowElement): boolean {
    return element instanceof DecisionElement;
  }

  validate(element: FlowElement): void {
    const decision = element as DecisionElement;
    if (!decision.getCondition() || decision.getCondition().trim() === '') {
      throw new Error('Decision condition is required');
    }

    const paths = decision.getPaths();
    if (paths && !Array.isArray(paths)) {
      throw new Error('Decision paths must be an array');
    }
  }
}
