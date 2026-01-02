export interface ExtractionHandler {
  setNext(handler: ExtractionHandler): ExtractionHandler;
  handle(element: any): any;
}
