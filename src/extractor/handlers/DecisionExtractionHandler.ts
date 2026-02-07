import { BaseExtractionHandler } from './BaseExtractionHandler';

export class DecisionExtractionHandler extends BaseExtractionHandler {
  protected canHandle(element: any): boolean {
    return element.type === 'Decision';
  }

  protected extract(element: any): any {
    return {
      type: 'Decision',
      id: element.id,
      apiName: element.apiName || element.id,
      label: element.label || element.id,
      condition: element.condition || '',
      paths: element.paths || {},
      metadata: {
        complexity: 'high',
        category: 'control-flow'
      }
    };
  }
}
