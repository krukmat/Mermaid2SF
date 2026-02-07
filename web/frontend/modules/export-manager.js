/* eslint-env browser */
const STORAGE_KEY = 'mermaid2sf-export-flow-name';

const defaultDownload = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

export class ExportManager {
  constructor(options = {}) {
    const {
      storage = typeof window !== 'undefined' ? window.sessionStorage : null,
      defaultName = 'Flow',
      downloadImpl = defaultDownload,
    } = options;
    this.storage = storage;
    this.defaultName = defaultName;
    this.downloadImpl = downloadImpl;
    this.filename = this.storage?.getItem(STORAGE_KEY) || this.defaultName;
  }

  getBaseName() {
    return this.filename;
  }

  setFilename(value) {
    const sanitized = this.sanitize(value);
    this.filename = sanitized;
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, sanitized);
      } catch {
        // ignore storage quota errors
      }
    }
  }

  sanitize(value) {
    if (!value || !value.toString().trim()) return this.defaultName;
    const base = value.toString().trim();
    return base.replace(/[^A-Za-z0-9_-]/g, '_');
  }

  buildFilename(extension) {
    return `${this.filename}.${extension}`;
  }

  download(content, extension, type) {
    const filename = this.buildFilename(extension);
    this.downloadImpl(content, filename, type);
  }

  exportMermaid(mermaidText) {
    this.download(mermaidText, 'mmd', 'text/plain');
  }

  exportDsl(jsonPayload) {
    const text =
      typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload, null, 2);
    this.download(text, 'dsl.json', 'application/json');
  }

  exportXml(xmlText) {
    this.download(xmlText, 'flow-meta.xml', 'application/xml');
  }
}
