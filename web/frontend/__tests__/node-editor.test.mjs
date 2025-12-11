import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeEditor, createContextMenu, removeContextMenu } from '../modules/node-editor.js';

describe('NodeEditor', () => {
  let panel;
  let formContainer;
  let updated;

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel" style="display:none;"><div id="form"></div></div>';
    panel = document.getElementById('panel');
    formContainer = document.getElementById('form');
    updated = null;
  });

  it('opens, renders fields, and dispatches update payload', () => {
    const node = { id: 'Screen_1', type: 'Screen', label: 'Screen', apiName: 'Screen_1', next: 'Decision_1' };
    const onUpdate = vi.fn((payload) => {
      updated = payload;
    });
    const editor = new NodeEditor(panel, formContainer, onUpdate);
    editor.open(node);
    const form = formContainer.querySelector('.inline-editor-form');
    expect(form).toBeTruthy();
    const labelInput = document.getElementById('node-editor-label');
    labelInput.value = 'Updated Label';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(onUpdate).toHaveBeenCalled();
    expect(updated.label).toBe('Updated Label');
    expect(panel.style.display).toBe('none');
  });
});

describe('Node context menu', () => {
  afterEach(() => {
    removeContextMenu();
  });

  it('renders menu and fires callbacks', () => {
    const node = { id: 'Start_1', type: 'Start' };
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const menu = createContextMenu(node, { x: 10, y: 20 }, { onEdit, onDuplicate, onDelete });
    expect(menu).toBeTruthy();
    const buttons = menu.querySelectorAll('button');
    buttons[0].click();
    expect(onEdit).toHaveBeenCalledWith(node);
    buttons[1].click();
    expect(onDuplicate).toHaveBeenCalledWith(node);
    buttons[2].click();
    expect(onDelete).toHaveBeenCalledWith(node);
  });
});
