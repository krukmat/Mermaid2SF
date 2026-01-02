import { BaseXMLParser } from './BaseXMLParser';

export class DecisionXMLParser extends BaseXMLParser {
  protected isCorrectType(xmlElement: any): boolean {
    return xmlElement?.decisions !== undefined || xmlElement?.type === 'Decision';
  }

  protected extract(xmlElement: any): any {
    const decisions = xmlElement.decisions || xmlElement;
    
    return {
      type: 'Decision',
      id: decisions.name,
      apiName: decisions.name,
      label: decisions.label,
      condition: decisions.description || decisions.condition,
      rules: this.parseRules(decisions.rule),
      connectors: this.parseConnectors(decisions.connector)
    };
  }

  private parseRules(rules: any[]): any[] {
    if (!Array.isArray(rules)) return [];
    
    return rules.map(rule => ({
      condition: rule.condition,
      connector: this.parseConnector(rule.connector)
    }));
  }

  private parseConnectors(connectors: any[]): any[] {
    if (!Array.isArray(connectors)) return [];
    
    return connectors.map(conn => ({
      target: conn.targetRef || conn.target,
      label: conn.label || ''
    }));
  }

  private parseConnector(connector: any): any {
    if (!connector) return null;
    
    return {
      target: connector.targetRef || connector.target,
      label: connector.label || ''
    };
  }
}
