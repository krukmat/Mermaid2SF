import { describe, expect, it, vi } from 'vitest';
import { ExportManager } from '../modules/export-manager.js';

describe('ExportManager', () => {
  it('sanitizes name and persists it', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    const manager = new ExportManager({ storage, defaultName: 'Flow' });
    manager.setFilename('My Flow!');
    expect(manager.getBaseName()).toBe('My_Flow_');
    expect(storage.setItem).toHaveBeenCalledWith('mermaid2sf-export-flow-name', 'My_Flow_');
  });

  it('falls back to default name when input is empty', () => {
    const manager = new ExportManager({ storage: null, defaultName: 'BaseFlow' });
    manager.setFilename('   ');
    expect(manager.getBaseName()).toBe('BaseFlow');
  });

  it('downloads files with the configured name', () => {
    const downloadMock = vi.fn();
    const manager = new ExportManager({ storage: null, defaultName: 'TestFlow', downloadImpl: downloadMock });
    manager.setFilename('CustomName');
    manager.exportMermaid('flowchart');
    expect(downloadMock).toHaveBeenCalledWith('flowchart', 'CustomName.mmd', 'text/plain');
    manager.exportDsl({ foo: 'bar' });
    expect(downloadMock).toHaveBeenCalledWith(expect.stringContaining('"foo": "bar"'), 'CustomName.dsl.json', 'application/json');
    manager.exportXml('<xml></xml>');
    expect(downloadMock).toHaveBeenCalledWith('<xml></xml>', 'CustomName.flow-meta.xml', 'application/xml');
  });
});
