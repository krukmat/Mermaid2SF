import { BaseFlowElement } from './BaseFlowElement';

export class LoopElement extends BaseFlowElement {
  constructor(
    id: string,
    label: string,
    private condition: string = '',
    private iterations: any[] = []
  ) {
    super(id, 'Loop', label);
  }

  protected validateSpecific(): boolean {
    // Loop-specific validation logic
    if (!this.condition || this.condition.trim() === '') {
      return false;
    }
    
    if (this.iterations && !Array.isArray(this.iterations)) {
      return false;
    }
    
    return true;
  }

  public getCondition(): string {
    return this.condition;
  }

  public getIterations(): any[] {
    return this.iterations;
  }
  public getLabel(): string {
    return this.label;
  }
}
