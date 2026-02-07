export interface XMLParseable {
  parse(xmlElement: any): any;
  canParse(xmlElement: any): boolean;
}
