export interface FlowElementVisitor {
  visit(element: any): void;
  canVisit(element: any): boolean;
}
