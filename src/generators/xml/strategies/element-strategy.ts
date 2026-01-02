import { FlowElement } from '../../../types/flow-dsl';

export interface XMLGeneratorContext {
  idToApiName: Map<string, string>;
  escapeXml: (text: string) => string;
  resolveTargetReference: (targetId: string | undefined) => string | undefined;
  generateConnectorLines: (
    targetId: string | undefined,
    indentLevel?: number,
    tagName?: string,
  ) => string[];
}

export interface ElementStrategy<T extends FlowElement = FlowElement> {
  generate(element: T, context: XMLGeneratorContext): string[];
}
