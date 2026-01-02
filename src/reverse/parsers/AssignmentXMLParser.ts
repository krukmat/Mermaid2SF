import { BaseXMLParser } from './BaseXMLParser';

export class AssignmentXMLParser extends BaseXMLParser {
  protected isCorrectType(xmlElement: any): boolean {
    return xmlElement?.assignments !== undefined || xmlElement?.type === 'Assignment';
  }

  protected extract(xmlElement: any): any {
    const assignments = xmlElement.assignments || xmlElement;
    
    return {
      type: 'Assignment',
      id: assignments.name,
      apiName: assignments.name,
      label: assignments.label,
      leftSide: assignments.leftSideReference,
      rightSide: assignments.rightSideReference,
      value: assignments.value,
      connector: this.parseConnector(assignments.connector)
    };
  }

  private parseConnector(connector: any): any {
    if (!connector) return null;
    
    return {
      target: connector.targetRef || connector.target,
      label: connector.label || ''
    };
  }
}
