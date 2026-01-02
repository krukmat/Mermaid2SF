import { FlowElementVisitor } from './FlowElementVisitor';
import { FlowElement } from '../elements/FlowElement';
import { ValidationRegistry } from './ValidationRegistry';

export class ValidationVisitor implements FlowElementVisitor {
  private validationResults: { [key: string]: boolean } = {};
  private errors: string[] = [];
  constructor(private registry: ValidationRegistry = new ValidationRegistry()) {}

  public canVisit(element: any): boolean {
    return Boolean(element && this.registry.canHandle(element as FlowElement));
  }

  public visit(element: any): void {
    const typedElement = element as FlowElement;
    const elementId = typedElement.getId();
    try {
      const strategy = this.registry.getStrategy(typedElement);
      if (!strategy) {
        throw new Error(`Unsupported element type: ${typedElement.getType()}`);
      }
      strategy.validate(typedElement);
      this.validationResults[elementId] = true;
    } catch (error) {
      this.handleValidationError(elementId, error);
    }
  }

  private handleValidationError(elementId: string, error: unknown): void {
    this.validationResults[elementId] = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.errors.push(`${elementId}: ${errorMessage}`);
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
