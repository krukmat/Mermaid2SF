export class StateManager {
  constructor(maxHistory = 20) {
    this.maxHistory = maxHistory;
    this.history = [];
    this.currentIndex = -1;
    this.debounceTimer = null;
    this.listeners = new Set();
  }

  captureState(state, description = 'Flow edit') {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this._saveState(state, description);
    }, 2000);
  }

  captureStateNow(state, description = 'Flow edit') {
    clearTimeout(this.debounceTimer);
    this._saveState(state, description);
  }

  _saveState(state = {}, description) {
    if (!state) return;
    const serialized = JSON.parse(JSON.stringify(state));
    const entry = {
      state: serialized,
      description,
      timestamp: Date.now(),
    };

    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push(entry);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.currentIndex = this.history.length - 1;
    this._notifyListeners();
  }

  undo() {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    this._notifyListeners();
    return this.history[this.currentIndex]?.state || null;
  }

  redo() {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    this._notifyListeners();
    return this.history[this.currentIndex]?.state || null;
  }

  canUndo() {
    return this.currentIndex > 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  getUndoDescription() {
    return this.history[this.currentIndex - 1]?.description || '';
  }

  getRedoDescription() {
    return this.history[this.currentIndex + 1]?.description || '';
  }

  reset() {
    this.history = [];
    this.currentIndex = -1;
    clearTimeout(this.debounceTimer);
    this._notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this._buildState());
    return () => this.listeners.delete(listener);
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  _notifyListeners() {
    const snapshot = this._buildState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  _buildState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.getUndoDescription(),
      redoDescription: this.getRedoDescription(),
    };
  }
}
