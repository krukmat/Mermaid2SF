import { BaseXMLParser } from './BaseXMLParser';

export class ScreenXMLParser extends BaseXMLParser {
  protected isCorrectType(xmlElement: any): boolean {
    return xmlElement?.screens !== undefined || xmlElement?.type === 'Screen';
  }

  protected extract(xmlElement: any): any {
    const screens = xmlElement.screens || xmlElement;
    
    return {
      type: 'Screen',
      id: screens.name,
      apiName: screens.name,
      label: screens.label,
      locationX: screens.locationX || '0',
      locationY: screens.locationY || '0',
      fields: this.parseFields(screens.fields),
      connectors: this.parseConnectors(screens.connector || screens.connections)
    };
  }

  private parseFields(fields: any[]): any[] {
    if (!Array.isArray(fields)) return [];
    
    return fields.map(field => ({
      name: field.name,
      fieldType: field.fieldType,
      dataType: field.dataType,
      fieldReference: field.fieldReference,
      fieldText: field.fieldText,
      isRequired: field.isRequired === 'true'
    }));
  }

  private parseConnectors(connectors: any[]): any[] {
    if (!Array.isArray(connectors)) return [];
    
    return connectors.map(conn => ({
      target: conn.targetRef || conn.target,
      label: conn.label || ''
    }));
  }
}
