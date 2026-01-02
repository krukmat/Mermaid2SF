import { FlowElement } from './FlowElement';
import { FlowElementVisitor } from '../visitors/FlowElementVisitor';

export abstract class BaseFlowElement implements FlowElement {
  constructor(
    protected id: string,
    protected type: string,
    protected label: string
  ) {}

  public accept(visitor: FlowElementVisitor): void {
    if (visitor.canVisit(this)) {
      visitor.visit(this);
    }
  }

  public getType(): string {
    return this.type;
  }

  public getId(): string {
    return this.id;
  }

  protected abstract validateSpecific(): boolean;
}
