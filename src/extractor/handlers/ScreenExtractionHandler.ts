import { BaseExtractionHandler } from './BaseExtractionHandler';

export class ScreenExtractionHandler extends BaseExtractionHandler {
  protected canHandle(element: any): boolean {
    return element.type === 'Screen';
  }

  protected extract(element: any): any {
    return {
      type: 'Screen',
      id: element.id,
      apiName: element.apiName || element.id,
      label: element.label || element.id,
      components: element.components || [],
      metadata: {
        complexity: 'medium',
        category: 'user-interface'
      }
    };
  }
}
