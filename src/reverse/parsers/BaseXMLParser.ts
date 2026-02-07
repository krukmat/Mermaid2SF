import { XMLParseable } from './XMLParseable';

export abstract class BaseXMLParser implements XMLParseable {
  public parse(xmlElement: any): any {
    if (!this.canParse(xmlElement)) {
      throw new Error(`Parser cannot handle element type: ${xmlElement?.type || 'unknown'}`);
    }
    
    return this.extract(xmlElement);
  }

  public canParse(xmlElement: any): boolean {
    return this.isCorrectType(xmlElement);
  }

  protected abstract isCorrectType(xmlElement: any): boolean;
  protected abstract extract(xmlElement: any): any;
}
