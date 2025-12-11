import { describe, it, expect } from 'vitest';

describe('frontend test harness', () => {
  it('provides a DOM', () => {
    expect(typeof document).toBe('object');
    expect(document.body).toBeDefined();
  });
});
