import { ScreenElement } from './elements/ScreenElement';
import { AssignmentElement } from './elements/AssignmentElement';
import { DecisionElement } from './elements/DecisionElement';
import { LoopElement } from './elements/LoopElement';
import { ValidationVisitor } from './visitors/ValidationVisitor';
import { FlowElement } from './elements/FlowElement';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FlowValidatorVisitor {
  private visitor: ValidationVisitor;

  constructor() {
    this.visitor = new ValidationVisitor();
  }

  public validate(elements: any[]): ValidationResult {
    // Convert raw elements to FlowElement objects
    const flowElements = elements.map(element => this.createFlowElement(element));
    
    // Apply visitor to each element
    flowElements.forEach(element => {
      if (element) {
        element.accept(this.visitor);
      }
    });

    return {
      valid: this.visitor.isValid(),
      errors: this.visitor.getErrors(),
      warnings: [] // Could be extended with warning logic
    };
  }

  public validateElement(element: any): ValidationResult {
    const flowElement = this.createFlowElement(element);
    
    if (!flowElement) {
      return {
        valid: false,
        errors: [`Unsupported element type: ${element?.type || 'unknown'}`],
        warnings: []
      };
    }

    // Apply visitor
    flowElement.accept(this.visitor);

    return {
      valid: this.visitor.isValid(),
      errors: this.visitor.getErrors(),
      warnings: []
    };
  }

  private createFlowElement(element: any): FlowElement | null {
    if (!element || !element.type) {
      return null;
    }

    switch (element.type) {
      case 'Screen':
        return new ScreenElement(
          element.id || element.name,
          element.label || element.id,
          element.components,
          {
            x: parseInt(element.locationX) || 0,
            y: parseInt(element.locationY) || 0
          }
        );

      case 'Assignment':
        return new AssignmentElement(
          element.id || element.name,
          element.label || element.id,
          element.leftSide || element.leftSideReference,
          element.rightSide || element.rightSideReference,
          element.value
        );

      case 'Decision':
        return new DecisionElement(
          element.id || element.name,
          element.label || element.id,
          element.condition || element.description,
          element.paths || element.rules || []
        );

      case 'Loop':
        return new LoopElement(
          element.id || element.name,
          element.label || element.id,
          element.condition,
          element.iterations || []
        );

      default:
        return null;
    }
  }
}
