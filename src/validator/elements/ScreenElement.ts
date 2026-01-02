import { BaseFlowElement } from './BaseFlowElement';

export class ScreenElement extends BaseFlowElement {
  constructor(
    id: string,
    label: string,
    private components: any[] = [],
    private location: { x: number; y: number } = { x: 0, y: 0 }
  ) {
    super(id, 'Screen', label);
  }

  protected validateSpecific(): boolean {
    // Screen-specific validation logic
    if (!this.label || this.label.trim() === '') {
      return false;
    }
    
    if (this.components && !Array.isArray(this.components)) {
      return false;
    }
    
    return true;
  }

  public getComponents(): any[] {
    return this.components;
  }

  public getLocation(): { x: number; y: number } {
    return this.location;
  }
  public getLabel(): string {
    return this.label;
  }
}
