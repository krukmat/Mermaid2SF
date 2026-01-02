import { FlowElementVisitor } from '../visitors/FlowElementVisitor';

export interface FlowElement {
  accept(visitor: FlowElementVisitor): void;
  getType(): string;
  getId(): string;
}
