import { XMLParseable } from './XMLParseable';
import { ScreenXMLParser } from './ScreenXMLParser';
import { AssignmentXMLParser } from './AssignmentXMLParser';
import { DecisionXMLParser } from './DecisionXMLParser';
import { ParserRegistry } from './ParserRegistry';

export class CompositeXMLParser {
  constructor(
    private registry: ParserRegistry = new ParserRegistry([
      new ScreenXMLParser(),
      new AssignmentXMLParser(),
      new DecisionXMLParser(),
    ]),
  ) {}

  public parseXML(xmlElement: any): any {
    const parser = this.registry.findParser(xmlElement);
    if (!parser) throw new Error(`No parser found for element type: ${xmlElement?.type || 'unknown'}`);
    return parser.parse(xmlElement);
  }

  public parseXMLBatch(xmlElements: any[]): any[] { return xmlElements.map((element) => this.parseXML(element)); }

  public parseCompositeElement(xmlElement: any): any {
    const result = this.parseXML(xmlElement);
    if (xmlElement.childElements && Array.isArray(xmlElement.childElements)) result.children = this.parseXMLBatch(xmlElement.childElements);
    return result;
  }

  public addParser(parser: XMLParseable): void { this.registry.addParser(parser); }

  public getParsers(): XMLParseable[] { return this.registry.getParsers(); }
}
