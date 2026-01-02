import { FlowElement } from '../../elements/FlowElement';

export interface ValidationStrategy {
  canHandle(element: FlowElement): boolean;
  validate(element: FlowElement): void;
}
