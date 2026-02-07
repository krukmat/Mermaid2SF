import { BaseExtractionHandler } from './BaseExtractionHandler';

export class LoopExtractionHandler extends BaseExtractionHandler {
  protected canHandle(element: any): boolean {
    return element.type === 'Loop';
  }

  protected extract(element: any): any {
    return {
      type: 'Loop',
      id: element.id,
      apiName: element.apiName || element.id,
      label: element.label || element.id,
      condition: element.condition || '',
      iterations: element.iterations || [],
      metadata: {
        complexity: 'medium-high',
        category: 'control-flow'
      }
    };
  }
}
