import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../modules/state-manager.mjs';

const snapshot = (value = 0) => ({
  nodes: [{ id: 'node', value }],
  panX: value,
  panY: value,
  scale: 1,
  selectedId: 'node',
});

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager(3);
  });

  it('captures immediate state and reports availability', () => {
    stateManager.captureStateNow(snapshot(1), 'first');

    expect(stateManager.canUndo()).toBe(false);
    expect(stateManager.canRedo()).toBe(false);
    expect(stateManager.getUndoDescription()).toBe('');
  });

  it('allows undo and redo', () => {
    stateManager.captureStateNow(snapshot(1), 'first');
    stateManager.captureStateNow(snapshot(2), 'second');

    expect(stateManager.canUndo()).toBe(true);
    const previous = stateManager.undo();
    expect(previous.nodes[0].value).toBe(1);
    expect(stateManager.canRedo()).toBe(true);

    const next = stateManager.redo();
    expect(next.nodes[0].value).toBe(2);
  });

  it('limits history size to maxHistory', () => {
    stateManager.captureStateNow(snapshot(1), 'one');
    stateManager.captureStateNow(snapshot(2), 'two');
    stateManager.captureStateNow(snapshot(3), 'three');
    stateManager.captureStateNow(snapshot(4), 'four');

    expect(stateManager.canUndo()).toBe(true);
    const previous = stateManager.undo();
    expect(previous.nodes[0].value).toBe(3);
    expect(stateManager.getUndoDescription()).toBe('two');
  });

  it('clears future states after new capture', () => {
    stateManager.captureStateNow(snapshot(1), 'one');
    stateManager.captureStateNow(snapshot(2), 'two');
    stateManager.undo();
    stateManager.captureStateNow(snapshot(3), 'three');

    expect(stateManager.canRedo()).toBe(false);
    expect(stateManager.getUndoDescription()).toBe('one');
  });

  it('notifies subscribers about availability', () => {
    let notified = null;
    stateManager.subscribe((state) => {
      notified = state;
    });

    stateManager.captureStateNow(snapshot(1), 'first');
    expect(notified.canUndo).toBe(false);
    expect(stateManager.canUndo()).toBe(false);
  });

  it('reset clears history', () => {
    stateManager.captureStateNow(snapshot(1), 'first');
    stateManager.reset();
    expect(stateManager.canUndo()).toBe(false);
    expect(stateManager.canRedo()).toBe(false);
  });
});
