import { BaseFlowElement } from './BaseFlowElement';

export class AssignmentElement extends BaseFlowElement {
  constructor(
    id: string,
    label: string,
    private leftSide: string = '',
    private rightSide: string = '',
    private value: any = null
  ) {
    super(id, 'Assignment', label);
  }

  protected validateSpecific(): boolean {
    // Assignment-specific validation logic
    if (!this.leftSide || this.leftSide.trim() === '') {
      return false;
    }
    
    if (this.rightSide === undefined || this.rightSide === null) {
      return false;
    }
    
    return true;
  }

  public getLeftSide(): string {
    return this.leftSide;
  }

  public getRightSide(): string {
    return this.rightSide;
  }

  public getValue(): any {
    return this.value;
  }

  public getLabel(): string {
    return this.label;
  }
}
