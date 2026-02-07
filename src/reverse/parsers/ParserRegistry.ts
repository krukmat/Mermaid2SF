import { XMLParseable } from './XMLParseable';

export class ParserRegistry {
  private parsers: XMLParseable[];

  constructor(parsers: XMLParseable[]) {
    this.parsers = [...parsers];
  }

  public findParser(xmlElement: any): XMLParseable | undefined {
    return this.parsers.find((parser) => parser.canParse(xmlElement));
  }

  public addParser(parser: XMLParseable): void {
    this.parsers.push(parser);
  }

  public getParsers(): XMLParseable[] {
    return [...this.parsers];
  }
}
