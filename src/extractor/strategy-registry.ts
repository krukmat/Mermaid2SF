// src/extractor/strategy-registry.ts
// TASK F3.6: ExtractionStrategyRegistry

import { ElementType } from '../types/flow-dsl';
import { ExtractionStrategy } from './extraction-strategy';

export class ExtractionStrategyRegistry {
  private readonly strategies = new Map<ElementType, ExtractionStrategy>();

  register(strategy: ExtractionStrategy): this {
    this.strategies.set(strategy.elementType, strategy);
    return this;
  }

  get(type: ElementType): ExtractionStrategy | undefined {
    return this.strategies.get(type);
  }

  has(type: ElementType): boolean {
    return this.strategies.has(type);
  }

  extractFor(type: ElementType, label: string): Record<string, any> {
    const strategy = this.get(type);
    return strategy ? strategy.extract(label) : {};
  }

  // Returns iterator for all registered strategies
  *getAll(): IterableIterator<[ElementType, ExtractionStrategy]> {
    yield* this.strategies.entries();
  }

  // Find first strategy that supports the label
  findSupporting(label: string): ExtractionStrategy | undefined {
    for (const strategy of this.strategies.values()) {
      if (strategy.supports(label)) {
        return strategy;
      }
    }
    return undefined;
  }
}
