// src/__tests__/extractor/strategies/decision-strategy.test.ts
// TASK F3.5: Test DecisionExtractionStrategy

import { DecisionExtractionStrategy } from '../../../extractor/strategies/decision-strategy';

describe('DecisionExtractionStrategy', () => {
  const strategy = new DecisionExtractionStrategy();

  describe('supports()', () => {
    it('supports DECISION: prefix', () => {
      expect(strategy.supports('DECISION: Test')).toBe(true);
    });

    it('rejects other prefixes', () => {
      expect(strategy.supports('SCREEN: Test')).toBe(false);
      expect(strategy.supports('ASSIGNMENT: Test')).toBe(false);
      expect(strategy.supports('CREATE: Test')).toBe(false);
    });

    it('handles case insensitivity', () => {
      expect(strategy.supports('decision: Test')).toBe(true);
      expect(strategy.supports('Decision: Test')).toBe(true);
    });

    it('handles whitespace', () => {
      expect(strategy.supports('  DECISION: Test')).toBe(true);
    });
  });

  describe('extract()', () => {
    it('extracts single condition', () => {
      const label = 'DECISION: Check Age\ncondition: age > 18';
      const result = strategy.extract(label);

      expect(result.conditions).toEqual(['age > 18']);
      expect(result.conditionLogic).toBeUndefined();
      expect(result.layout).toBeUndefined();
    });

    it('extracts multiple conditions', () => {
      const label = 'DECISION: Complex\ncondition: x > 0\ncondition: y < 100\nconditionLogic: or';
      const result = strategy.extract(label);

      expect(result.conditions).toEqual(['x > 0', 'y < 100']);
      expect(result.conditionLogic).toBe('or');
    });

    it('extracts conditionLogic', () => {
      const label = 'DECISION: Test\ncondition: x > 0\nconditionLogic: and';
      const result = strategy.extract(label);

      expect(result.conditionLogic).toBe('and');
    });

    it('extracts layout', () => {
      const label = 'DECISION: Test\ncondition: x > 0\nlayout: pos: 100,150';
      const result = strategy.extract(label);

      expect(result.layout).toEqual({ x: 100, y: 150 });
    });

    it('extracts all properties together', () => {
      const label =
        'DECISION: Complex Check\ncondition: x > 0\ncondition: y < 100\nconditionLogic: or\nlayout: pos: 200,300';
      const result = strategy.extract(label);

      expect(result).toEqual({
        conditions: ['x > 0', 'y < 100'],
        conditionLogic: 'or',
        layout: { x: 200, y: 300 },
      });
    });

    it('handles empty conditions gracefully', () => {
      const label = 'DECISION: No Conditions';
      const result = strategy.extract(label);

      expect(result.conditions).toEqual([]);
      expect(result.conditionLogic).toBeUndefined();
      expect(result.layout).toBeUndefined();
    });

    it('handles escaped newlines', () => {
      const label = 'DECISION: Test\\ncondition: x > 0\\nconditionLogic: and';
      const result = strategy.extract(label);

      expect(result.conditions).toEqual(['x > 0']);
      expect(result.conditionLogic).toBe('and');
    });
  });

  describe('elementType property', () => {
    it('has elementType = "Decision"', () => {
      expect(strategy.elementType).toBe('Decision');
    });
  });
});
