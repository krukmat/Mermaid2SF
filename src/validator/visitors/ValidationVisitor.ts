import { FlowElementVisitor } from './FlowElementVisitor';
import { ScreenElement } from '../elements/ScreenElement';
import { AssignmentElement } from '../elements/AssignmentElement';
import { DecisionElement } from '../elements/DecisionElement';
import { LoopElement } from '../elements/LoopElement';

export class ValidationVisitor implements FlowElementVisitor {
  private validationResults: { [key: string]: boolean } = {};
  private errors: string[] = [];

  public canVisit(element: any): boolean {
    return element.getType && 
           ['Screen', 'Assignment', 'Decision', 'Loop'].includes(element.getType());
  }

  public visit(element: any): void {
    const elementId = element.getId();
    
    try {
      if (element instanceof ScreenElement) {
        this.validateScreen(element);
      } else if (element instanceof AssignmentElement) {
        this.validateAssignment(element);
      } else if (element instanceof DecisionElement) {
        this.validateDecision(element);
      } else if (element instanceof LoopElement) {
        this.validateLoop(element);
      }
      
      this.validationResults[elementId] = true;
    } catch (error) {
      this.validationResults[elementId] = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(`${elementId}: ${errorMessage}`);
    }
  }

  private validateScreen(screen: ScreenElement): void {
    if (!screen.getLabel() || screen.getLabel().trim() === '') {
      throw new Error('Screen label is required');
    }
    
    const components = screen.getComponents();
    if (components && !Array.isArray(components)) {
      throw new Error('Screen components must be an array');
    }
  }

  private validateAssignment(assignment: AssignmentElement): void {
    if (!assignment.getLeftSide() || assignment.getLeftSide().trim() === '') {
      throw new Error('Assignment left side is required');
    }
    
    if (assignment.getRightSide() === undefined || assignment.getRightSide() === null) {
      throw new Error('Assignment right side is required');
    }
  }

  private validateDecision(decision: DecisionElement): void {
    if (!decision.getCondition() || decision.getCondition().trim() === '') {
      throw new Error('Decision condition is required');
    }
    
    const paths = decision.getPaths();
    if (paths && !Array.isArray(paths)) {
      throw new Error('Decision paths must be an array');
    }
  }

  private validateLoop(loop: LoopElement): void {
    if (!loop.getCondition() || loop.getCondition().trim() === '') {
      throw new Error('Loop condition is required');
    }
    
    const iterations = loop.getIterations();
    if (iterations && !Array.isArray(iterations)) {
      throw new Error('Loop iterations must be an array');
    }
  }

  public getValidationResults(): { [key: string]: boolean } {
    return this.validationResults;
  }

  public getErrors(): string[] {
    return this.errors;
  }

  public isValid(): boolean {
    return this.errors.length === 0;
  }
}
