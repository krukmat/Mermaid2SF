import { BaseExtractionHandler } from './BaseExtractionHandler';

export class AssignmentExtractionHandler extends BaseExtractionHandler {
  protected canHandle(element: any): boolean {
    return element.type === 'Assignment';
  }

  protected extract(element: any): any {
    return {
      type: 'Assignment',
      id: element.id,
      apiName: element.apiName || element.id,
      label: element.label || element.id,
      leftSide: element.leftSide || '',
      rightSide: element.rightSide || '',
      metadata: {
        complexity: 'low',
        category: 'data-operation'
      }
    };
  }
}
