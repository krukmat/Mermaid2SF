/* eslint-env browser */
export const ERROR_CATALOG = {
  'missing-start': {
    title: 'Missing Start Node',
    severity: 'error',
    message: 'Every Flow requires exactly one Start element.',
    remedy: 'Add a Start node from the toolbox or use Auto-fix.',
    autoFixAction: 'ensure-terminals',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-end': {
    title: 'Missing End Node',
    severity: 'error',
    message: 'Flows must finish with at least one End element.',
    remedy: 'Add an End node or apply Auto-fix to append one.',
    autoFixAction: 'ensure-terminals',
    highlightNodes: (error) => error.nodes || [],
  },
  'multiple-starts': {
    title: 'Multiple Start Nodes',
    severity: 'error',
    message: 'Flow cannot contain more than one Start element.',
    remedy: 'Remove extra Start nodes so only one remains.',
    highlightNodes: (error) => error.nodes || [],
  },
  'duplicate-api-name': {
    title: 'Duplicate API Names',
    severity: 'error',
    message: 'Two nodes share the same API name.',
    remedy: 'Rename one of the conflicting nodes so API names are unique.',
    highlightNodes: (error) => error.nodes || [],
  },
  'invalid-api-name': {
    title: 'Invalid API Name',
    severity: 'error',
    message: 'A node uses characters in its API name that are not allowed.',
    remedy: 'Use alphanumeric characters and underscores only.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-next': {
    title: 'Missing Next Reference',
    severity: 'error',
    message: 'A node needs to point to the next element in the flow.',
    remedy: 'Connect this node to another element on the canvas.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-decision-paths': {
    title: 'Decision Requires Outcomes',
    severity: 'error',
    message: 'Decision nodes must define at least one outcome.',
    remedy: 'Draw edges from the Decision node to other nodes.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-default-outcome': {
    title: 'Decision Needs a Default Outcome',
    severity: 'error',
    message: 'Every decision must define a default outcome.',
    remedy: 'Mark one of the Decision outcomes as default (e.g., connector label "No").',
    highlightNodes: (error) => error.nodes || [],
  },
  'multiple-default-outcomes': {
    title: 'Multiple Defaults on Decision',
    severity: 'error',
    message: 'Only one outcome can be marked as default for a Decision.',
    remedy: 'Keep one default connector and change the others.',
    highlightNodes: (error) => error.nodes || [],
  },
  'unreachable-node': {
    title: 'Unreachable Node',
    severity: 'error',
    message: 'This node cannot be reached from the Start element.',
    remedy: 'Connect it to the flow or remove it.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-target': {
    title: 'Missing Target Element',
    severity: 'error',
    message: 'A connector points to a node that does not exist.',
    remedy: 'Reconnect the edge to a valid node.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-loop-condition': {
    title: 'Loop Lacks Condition',
    severity: 'warning',
    message: 'Loop nodes benefit from a loopCondition to avoid infinite retries.',
    remedy: 'Define a loopCondition or duration for clarity.',
    highlightNodes: (error) => error.nodes || [],
  },
  'missing-loop-iterations': {
    title: 'Loop Lacks Iteration Limit',
    severity: 'warning',
    message: 'An iterationCount prevents runaway loops.',
    remedy: 'Set an iterationCount on the Loop node.',
    highlightNodes: (error) => error.nodes || [],
  },
  'wait-metadata-warning': {
    title: 'Wait Node Needs Metadata',
    severity: 'warning',
    message: 'Document either a waitFor signal or waitDuration.',
    remedy: 'Add the missing wait metadata.',
    highlightNodes: (error) => error.nodes || [],
  },
  'fault-metadata-warning': {
    title: 'Fault Node Missing Details',
    severity: 'warning',
    message: 'Fault nodes should register a source and message.',
    remedy: 'Fill out faultSource and faultMessage.',
    highlightNodes: (error) => error.nodes || [],
  },
};

function fallbackTemplate(error) {
  return {
    title: 'Validation Issue',
    message: error.message || 'Validation failed.',
    remedy: 'Inspect the highlighted nodes.',
    severity: error.severity || 'error',
    highlightNodes: (err) => err.nodes || [],
    autoFixAction: null,
  };
}

export function formatValidationError(error = {}) {
  const template = ERROR_CATALOG[error.code] ?? fallbackTemplate(error);
  const message =
    typeof template.message === 'function' ? template.message(error) : template.message;
  const remedy = typeof template.remedy === 'function' ? template.remedy(error) : template.remedy;
  const highlightNodes = template.highlightNodes
    ? template.highlightNodes(error)
    : error.nodes || [];
  return {
    code: template.code || error.code,
    title: template.title,
    message,
    remedy,
    severity: template.severity || error.severity || 'error',
    highlightNodes,
    autoFixAction: template.autoFixAction || null,
    canAutoFix: Boolean(template.autoFixAction),
  };
}

export function renderValidationCards(
  container,
  formattedErrors,
  { onAutoFix, onHighlight, onClearHighlight } = {},
) {
  if (!container) return;
  container.innerHTML = '';
  if (!formattedErrors.length) {
    const placeholder = document.createElement('p');
    placeholder.className = 'inline-status success';
    placeholder.textContent = '[OK] No validation issues detected.';
    container.appendChild(placeholder);
    return;
  }
  formattedErrors.forEach((error, index) => {
    const autoFixHtml = error.canAutoFix
      ? '      <button class="auto-fix-btn" type="button">Auto-fix</button>'
      : '';
    const card = document.createElement('div');
    card.className = `validation-error-card ${error.severity}`;
    card.dataset.index = index;
    card.innerHTML = `
      <div class="error-header">
        <span class="error-code">${error.code}</span>
        <strong>${error.title}</strong>
      </div>
      <p class="error-message">${error.message}</p>
      <p class="error-remedy"><strong>Fix:</strong> ${error.remedy}</p>
${autoFixHtml}
    `;
    const autoFixBtn = card.querySelector('.auto-fix-btn');
    if (autoFixBtn) {
      autoFixBtn.addEventListener('click', () => onAutoFix?.(error.autoFixAction, error));
    }
    card.addEventListener('mouseenter', () => onHighlight?.(error.highlightNodes));
    card.addEventListener('mouseleave', () => onClearHighlight?.());
    container.appendChild(card);
  });
}
