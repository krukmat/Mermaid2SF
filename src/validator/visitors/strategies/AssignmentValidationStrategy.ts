import { ValidationStrategy } from './ValidationStrategy';
import { FlowElement } from '../../elements/FlowElement';
import { AssignmentElement } from '../../elements/AssignmentElement';

export class AssignmentValidationStrategy implements ValidationStrategy {
  canHandle(element: FlowElement): boolean {
    return element instanceof AssignmentElement;
  }

  validate(element: FlowElement): void {
    const assignment = element as AssignmentElement;
    if (!assignment.getLeftSide() || assignment.getLeftSide().trim() === '') {
      throw new Error('Assignment left side is required');
    }

    if (assignment.getRightSide() === undefined || assignment.getRightSide() === null) {
      throw new Error('Assignment right side is required');
    }
  }
}
