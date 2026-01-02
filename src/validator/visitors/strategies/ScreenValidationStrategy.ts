import { ValidationStrategy } from './ValidationStrategy';
import { FlowElement } from '../../elements/FlowElement';
import { ScreenElement } from '../../elements/ScreenElement';

export class ScreenValidationStrategy implements ValidationStrategy {
  canHandle(element: FlowElement): boolean {
    return element instanceof ScreenElement;
  }

  validate(element: FlowElement): void {
    const screen = element as ScreenElement;
    if (!screen.getLabel() || screen.getLabel().trim() === '') {
      throw new Error('Screen label is required');
    }

    const components = screen.getComponents();
    if (components && !Array.isArray(components)) {
      throw new Error('Screen components must be an array');
    }
  }
}
