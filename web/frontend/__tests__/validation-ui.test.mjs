import { describe, it, expect, vi } from 'vitest';
import { formatValidationError, renderValidationCards } from '../modules/validation-ui.js';

describe('Validation UI module', () => {
  it('formats known errors with auto-fix metadata', () => {
    const result = formatValidationError({ code: 'missing-start' });
    expect(result.title).toBe('Missing Start Node');
    expect(result.canAutoFix).toBe(true);
    expect(result.autoFixAction).toBe('ensure-terminals');
    expect(result.severity).toBe('error');
  });

  it('returns fallback information for unknown codes', () => {
    const result = formatValidationError({ code: 'unknown', message: 'Unknown issue' });
    expect(result.title).toBe('Validation Issue');
    expect(result.message).toBe('Unknown issue');
    expect(result.canAutoFix).toBe(false);
  });

  it('renders cards and wires callbacks', () => {
    document.body.innerHTML = '<div id="container"></div>';
    const container = document.getElementById('container');
    const formatted = [formatValidationError({ code: 'missing-start' })];
    const onAutoFix = vi.fn();
    const onHighlight = vi.fn();
    const onClear = vi.fn();
    renderValidationCards(container, formatted, {
      onAutoFix,
      onHighlight,
      onClearHighlight: onClear,
    });
    expect(container.querySelectorAll('.validation-error-card').length).toBe(1);
    container.querySelector('.auto-fix-btn')?.click();
    expect(onAutoFix).toHaveBeenCalled();
    const card = container.querySelector('.validation-error-card');
    card?.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onHighlight).toHaveBeenCalled();
    card?.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onClear).toHaveBeenCalled();
  });
});
