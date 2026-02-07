// src/__tests__/extractor/strategy-registry.test.ts
// TASK F3.6: Test ExtractionStrategyRegistry

import { ExtractionStrategyRegistry } from '../../extractor/strategy-registry';
import { DecisionExtractionStrategy } from '../../extractor/strategies/decision-strategy';

describe('ExtractionStrategyRegistry', () => {
  let registry: ExtractionStrategyRegistry;

  beforeEach(() => {
    registry = new ExtractionStrategyRegistry();
  });

  describe('register()', () => {
    it('stores a strategy by elementType', () => {
      const strategy = new DecisionExtractionStrategy();
      registry.register(strategy);

      expect(registry.get('Decision')).toBe(strategy);
    });

    it('returns this for method chaining', () => {
      const strategy = new DecisionExtractionStrategy();
      const result = registry.register(strategy);

      expect(result).toBe(registry);
    });
  });

  describe('get()', () => {
    it('returns undefined for unregistered type', () => {
      expect(registry.get('Decision')).toBeUndefined();
    });

    it('returns registered strategy', () => {
      const strategy = new DecisionExtractionStrategy();
      registry.register(strategy);

      expect(registry.get('Decision')).toBe(strategy);
    });
  });

  describe('has()', () => {
    it('returns false for unregistered type', () => {
      expect(registry.has('Decision')).toBe(false);
    });

    it('returns true for registered type', () => {
      const strategy = new DecisionExtractionStrategy();
      registry.register(strategy);
      expect(registry.has('Decision')).toBe(true);
    });
  });

  describe('extractFor()', () => {
    it('calls extract on registered strategy', () => {
      const strategy = new DecisionExtractionStrategy();
      registry.register(strategy);
      const label = 'DECISION: Test\ncondition: x > 0';
      const result = registry.extractFor('Decision', label);
      expect(result.conditions).toEqual(['x > 0']);
    });

    it('returns empty object for unregistered type', () => {
      const label = 'DECISION: Test';
      const result = registry.extractFor('Decision', label);
      expect(result).toEqual({});
    });
  });

  describe('method chaining', () => {
    it('allows registering multiple strategies in chain', () => {
      const decision = new DecisionExtractionStrategy();
      registry.register(decision);
      expect(registry.has('Decision')).toBe(true);
    });
  });

  describe('getAll()', () => {
    it('returns empty iterator when no strategies', () => {
      const result = Array.from(registry.getAll());
      expect(result).toEqual([]);
    });

    it('returns all registered strategies', () => {
      const decision = new DecisionExtractionStrategy();
      registry.register(decision);

      const result = Array.from(registry.getAll());
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('Decision');
      expect(result[0][1]).toBe(decision);
    });
  });

  describe('findSupporting()', () => {
    it('returns undefined when no strategy supports label', () => {
      const result = registry.findSupporting('SCREEN: Test');
      expect(result).toBeUndefined();
    });

    it('returns strategy that supports label', () => {
      const decision = new DecisionExtractionStrategy();
      registry.register(decision);

      const result = registry.findSupporting('DECISION: Test');
      expect(result).toBe(decision);
    });

    it('returns first matching strategy', () => {
      const decision = new DecisionExtractionStrategy();
      registry.register(decision);

      const result = registry.findSupporting('DECISION: Check Age\ncondition: x > 0');
      expect(result).toBe(decision);
    });
  });
});
