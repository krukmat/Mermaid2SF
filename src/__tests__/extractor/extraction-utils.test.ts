// src/__tests__/extractor/extraction-utils.test.ts
// TASK F3.1: Create extraction utilities for reusable parsing logic

import { extractLayout, parseLines, COMMON_PATTERNS } from '../../extractor/extraction-utils';

describe('extractLayout', () => {
  it('extracts layout from valid line', () => {
    const lines = ['api: Test', 'layout: pos: 120,240'];
    expect(extractLayout(lines)).toEqual({ x: 120, y: 240 });
  });

  it('returns undefined when no layout', () => {
    expect(extractLayout(['api: Test'])).toBeUndefined();
  });

  it('handles spaces', () => {
    expect(extractLayout(['layout: pos:  120 , 240 '])).toEqual({ x: 120, y: 240 });
  });
});

describe('parseLines', () => {
  it('splits and trims', () => {
    const result = parseLines('DECISION: Test\n  api: Dec\n  condition: x > 0');
    expect(result).toEqual(['DECISION: Test', 'api: Dec', 'condition: x > 0']);
  });

  it('handles escaped newlines', () => {
    expect(parseLines('A\\nB')).toEqual(['A', 'B']);
  });
});
