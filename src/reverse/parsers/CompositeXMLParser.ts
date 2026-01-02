import { XMLParseable } from './XMLParseable';
import { ScreenXMLParser } from './ScreenXMLParser';
import { AssignmentXMLParser } from './AssignmentXMLParser';
import { DecisionXMLParser } from './DecisionXMLParser';

export class CompositeXMLParser {
  private parsers: XMLParseable[] = [];

  constructor() {
    // Initialize parsers
    this.parsers = [
      new ScreenXMLParser(),
      new AssignmentXMLParser(),
      new DecisionXMLParser()
    ];
  }

  public parseXML(xmlElement: any): any {
    const parser = this.findCompatibleParser(xmlElement);
    
    if (!parser) {
      throw new Error(`No parser found for element type: ${xmlElement?.type || 'unknown'}`);
    }
    
    return parser.parse(xmlElement);
  }

  public parseXMLBatch(xmlElements: any[]): any[] {
    return xmlElements.map(element => this.parseXML(element));
  }

  public parseCompositeElement(xmlElement: any): any {
    const result = this.parseXML(xmlElement);
    
    // Parse child elements if they exist
    if (xmlElement.childElements && Array.isArray(xmlElement.childElements)) {
      result.children = this.parseXMLBatch(xmlElement.childElements);
    }
    
    return result;
  }

  private findCompatibleParser(xmlElement: any): XMLParseable | null {
    return this.parsers.find(parser => parser.canParse(xmlElement)) || null;
  }

  public addParser(parser: XMLParseable): void {
    this.parsers.push(parser);
  }

  public getParsers(): XMLParseable[] {
    return [...this.parsers];
  }
}
