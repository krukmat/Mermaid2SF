import { ValidationStrategy } from './ValidationStrategy';
import { FlowElement } from '../../elements/FlowElement';
import { LoopElement } from '../../elements/LoopElement';

export class LoopValidationStrategy implements ValidationStrategy {
  canHandle(element: FlowElement): boolean {
    return element instanceof LoopElement;
  }

  validate(element: FlowElement): void {
    const loop = element as LoopElement;
    if (!loop.getCondition() || loop.getCondition().trim() === '') {
      throw new Error('Loop condition is required');
    }

    const iterations = loop.getIterations();
    if (iterations && !Array.isArray(iterations)) {
      throw new Error('Loop iterations must be an array');
    }
  }
}
