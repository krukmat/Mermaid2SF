import { BaseFlowElement } from './BaseFlowElement';

export class DecisionElement extends BaseFlowElement {
  constructor(
    id: string,
    label: string,
    private condition: string = '',
    private paths: any[] = []
  ) {
    super(id, 'Decision', label);
  }

  protected validateSpecific(): boolean {
    // Decision-specific validation logic
    if (!this.condition || this.condition.trim() === '') {
      return false;
    }
    
    if (this.paths && !Array.isArray(this.paths)) {
      return false;
    }
    
    return true;
  }

  public getCondition(): string {
    return this.condition;
  }

  public getPaths(): any[] {
    return this.paths;
  }

  public getLabel(): string {
    return this.label;
  }
}
