import { ExtractionHandler } from './ExtractionHandler';

export abstract class BaseExtractionHandler implements ExtractionHandler {
  private nextHandler: ExtractionHandler | null = null;

  public setNext(handler: ExtractionHandler): ExtractionHandler {
    this.nextHandler = handler;
    return handler;
  }

  public handle(element: any): any {
    if (this.canHandle(element)) {
      return this.extract(element);
    }
    
    if (this.nextHandler) {
      return this.nextHandler.handle(element);
    }
    
    return null;
  }

  protected abstract canHandle(element: any): boolean;
  protected abstract extract(element: any): any;
}
