/* eslint-env browser */
const FIELD_MAP = {
  default: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Friendly label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'API_NAME' },
    { name: 'next', label: 'Next Node ID', type: 'text', placeholder: 'Optional next element ID' },
  ],
  Decision: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Decision label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'Decision_API' },
    { name: 'yesNext', label: 'Yes outcome', type: 'text', placeholder: 'Yes target ID' },
    {
      name: 'noNext',
      label: 'No / default outcome',
      type: 'text',
      placeholder: 'No/default target ID',
    },
  ],
  Assignment: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Assignment label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'Assignment_API' },
    {
      name: 'assignments',
      label: 'Assignments',
      type: 'textarea',
      placeholder: 'v_Flag = true; v_Count = v_Count + 1',
    },
    { name: 'next', label: 'Next node', type: 'text', placeholder: 'Next element ID' },
  ],
  Loop: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Loop label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'Loop_API' },
    { name: 'loopCondition', label: 'Condition', type: 'text', placeholder: 'Loop condition' },
    { name: 'iterationCount', label: 'Iterations', type: 'number', placeholder: 'max iterations' },
    { name: 'next', label: 'Next node', type: 'text', placeholder: 'Next element ID' },
  ],
  Wait: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Wait label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'Wait_API' },
    { name: 'waitFor', label: 'Wait signal/event', type: 'text', placeholder: 'Signal name' },
    { name: 'waitDuration', label: 'Duration', type: 'text', placeholder: 'e.g. 00:05:00' },
    { name: 'next', label: 'Next node', type: 'text', placeholder: 'Next element ID' },
  ],
  Fault: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Fault label' },
    { name: 'apiName', label: 'API Name', type: 'text', placeholder: 'Fault_API' },
    { name: 'faultSource', label: 'Fault source', type: 'text', placeholder: 'Exception name' },
    { name: 'faultMessage', label: 'Fault message', type: 'text', placeholder: 'Friendly message' },
    { name: 'next', label: 'Next node', type: 'text', placeholder: 'Recovery node ID' },
  ],
};

const CONTEXT_MENU_CLASS = 'node-context-menu';

export class NodeEditor {
  constructor(panel, formContainer, onUpdate) {
    this.panel = panel;
    this.formContainer = formContainer;
    this.onUpdate = onUpdate;
    this.currentNode = null;
  }

  open(node) {
    if (!node || !this.panel || !this.formContainer) return;
    this.currentNode = node;
    this.panel.style.display = 'block';
    this.panel.setAttribute('aria-hidden', 'false');
    this.renderForm(node);
  }

  close() {
    this.currentNode = null;
    if (this.panel) {
      this.panel.style.display = 'none';
      this.panel.setAttribute('aria-hidden', 'true');
    }
    if (this.formContainer) {
      this.formContainer.innerHTML = '';
    }
  }

  renderForm(node) {
    if (!this.formContainer) return;
    const fields = this.getFieldsForType(node.type);
    const form = document.createElement('form');
    form.className = 'inline-editor-form';
    fields.forEach((field) => {
      const id = `node-editor-${field.name}`;
      const value = node[field.name] ?? '';
      const input =
        field.type === 'textarea'
          ? `<textarea id="${id}" name="${field.name}" rows="3" placeholder="${field.placeholder}">${value}</textarea>`
          : `<input id="${id}" name="${field.name}" type="${field.type}" placeholder="${field.placeholder}" value="${value}"/>`;
      form.innerHTML += `
        <label for="${id}">${field.label}</label>
        ${input}
      `;
    });
    form.innerHTML += `
      <div class="row" style="gap:0.5rem; margin-top:0.65rem;">
        <button type="submit">Save</button>
        <button type="button" class="secondary" id="cancelNodeBtn">Cancel</button>
      </div>
    `;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit(fields);
    });
    this.formContainer.innerHTML = '';
    this.formContainer.appendChild(form);
    const cancel = form.querySelector('#cancelNodeBtn');
    cancel?.addEventListener('click', () => this.close());
  }

  getFieldsForType(type) {
    return FIELD_MAP[type] ?? FIELD_MAP.default;
  }

  handleSubmit(fields) {
    if (!this.currentNode || !this.formContainer) return;
    const form = this.formContainer.querySelector('form');
    if (!form) return;
    const formData = new FormData(form);
    const updated = { ...this.currentNode };
    fields.forEach((field) => {
      const value = formData.get(field.name);
      if (value === null || value === undefined) return;
      updated[field.name] = field.type === 'number' ? Number(value) : value;
    });
    this.onUpdate?.(updated);
    this.close();
  }
}

export function createContextMenu(node, position, actions = {}) {
  removeContextMenu();
  if (!node || !position) return null;
  const menu = document.createElement('div');
  menu.className = CONTEXT_MENU_CLASS;
  menu.style.left = `${position.x}px`;
  menu.style.top = `${position.y}px`;
  const items = [
    { label: '✏️ Edit', action: () => actions.onEdit?.(node) },
    { label: '📋 Duplicate', action: () => actions.onDuplicate?.(node) },
    { label: '🗑️ Delete', action: () => actions.onDelete?.(node) },
  ];
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      item.action();
      removeContextMenu();
    });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', removeContextMenu, { once: true });
  }, 0);
  return menu;
}

export function removeContextMenu() {
  document.querySelectorAll(`.${CONTEXT_MENU_CLASS}`).forEach((menu) => menu.remove());
}
