/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');
const path = require('path');

const { MermaidParser } = require(path.join(__dirname, '../../dist/parser/mermaid-parser'));
const { MetadataExtractor } = require(path.join(__dirname, '../../dist/extractor/metadata-extractor'));
const {
  IntermediateModelBuilder,
} = require(path.join(__dirname, '../../dist/dsl/intermediate-model-builder'));
const { FlowValidator } = require(path.join(__dirname, '../../dist/validator/flow-validator'));
const {
  FlowXmlGenerator,
} = require(path.join(__dirname, '../../dist/generators/flow-xml-generator'));
const {
  MermaidGenerator,
} = require(path.join(__dirname, '../../dist/generators/mermaid-generator'));
const { parseFlowXmlText } = require(path.join(__dirname, '../../dist/reverse/xml-parser'));
const {
  flowSemanticSnapshot,
} = require(path.join(__dirname, '../../dist/utils/flow-semantic'));

const CONTRACT_VERSION = '1';
const SUPPORTED_OPERATIONS = new Set([
  'salesforce.flow.import',
  'salesforce.flow.export',
  'salesforce.flow.validate',
  'salesforce.flow.compare',
]);

function executeFenixFlowRequest(request) {
  const providerReference = crypto.randomUUID();

  try {
    validateRequest(request);
    switch (request.operation) {
      case 'salesforce.flow.import':
        return importFlow(request, providerReference);
      case 'salesforce.flow.export':
        return exportFlow(request, providerReference);
      case 'salesforce.flow.validate':
        return validateFlow(request, providerReference);
      case 'salesforce.flow.compare':
        return compareFlow(request, providerReference);
      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }
  } catch (error) {
    return rejectedResult(request, providerReference, error);
  }
}

function validateRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error('Request must be a JSON object.');
  }
  if (request.contract_version !== CONTRACT_VERSION) {
    throw new Error('Unsupported contract_version.');
  }
  if (!SUPPORTED_OPERATIONS.has(request.operation)) {
    throw new Error('Unsupported operation.');
  }
  validateArtifact(request.input);
  if (request.operation === 'salesforce.flow.compare') {
    if (!request.compare_to) {
      throw new Error('compare_to is required for compare.');
    }
    validateArtifact(request.compare_to);
  } else if (request.compare_to) {
    throw new Error('compare_to is only valid for compare.');
  }
}

function validateArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('Artifact is required.');
  }
  if (!['mermaid', 'salesforce_flow_xml', 'flowir_v2'].includes(artifact.format)) {
    throw new Error(`Unsupported artifact format: ${artifact.format}`);
  }
  if (typeof artifact.content !== 'string' || artifact.content.trim() === '') {
    throw new Error('Artifact content must be a non-empty string.');
  }
}

function importFlow(request, providerReference) {
  if (request.input.format !== 'salesforce_flow_xml') {
    throw new Error('Import requires salesforce_flow_xml input.');
  }
  const dsl = artifactToDSL(request.input);
  const validation = validateDSL(dsl);
  const mermaid = new MermaidGenerator().generate(dsl);
  return semanticResult(
    request,
    providerReference,
    dsl,
    validation,
    [
      artifact('flowir_v2', dsl.flowApiName, JSON.stringify(dsl)),
      artifact('mermaid', dsl.flowApiName, mermaid),
    ],
  );
}

function exportFlow(request, providerReference) {
  if (!['mermaid', 'flowir_v2'].includes(request.input.format)) {
    throw new Error('Export requires mermaid or flowir_v2 input.');
  }
  const dsl = artifactToDSL(request.input);
  const validation = validateDSL(dsl);
  const artifacts = [artifact('flowir_v2', dsl.flowApiName, JSON.stringify(dsl))];
  if (validation.valid) {
    artifacts.unshift(
      artifact(
        'salesforce_flow_xml',
        dsl.flowApiName,
        new FlowXmlGenerator().generate(dsl),
      ),
    );
  }
  return semanticResult(request, providerReference, dsl, validation, artifacts);
}

function validateFlow(request, providerReference) {
  if (!['mermaid', 'flowir_v2'].includes(request.input.format)) {
    throw new Error('Validate requires mermaid or flowir_v2 input.');
  }
  const dsl = artifactToDSL(request.input);
  const validation = validateDSL(dsl);
  return semanticResult(request, providerReference, dsl, validation, []);
}

function compareFlow(request, providerReference) {
  const expected = artifactToDSL(request.input);
  const actual = artifactToDSL(request.compare_to);
  const expectedValidation = validateDSL(expected);
  const actualValidation = validateDSL(actual);
  const validation = {
    valid: expectedValidation.valid && actualValidation.valid,
    errors: [...expectedValidation.errors, ...actualValidation.errors],
    warnings: [...expectedValidation.warnings, ...actualValidation.warnings],
  };
  const before = flowSemanticSnapshot(expected);
  const after = flowSemanticSnapshot(actual);
  const changes = semanticChanges(before, after);
  const result = semanticResult(request, providerReference, expected, validation, []);
  result.diff = { equal: changes.length === 0, changes };
  return result;
}

function artifactToDSL(input) {
  switch (input.format) {
    case 'salesforce_flow_xml':
      return parseFlowXmlText(input.content, input.name || 'Flow');
    case 'flowir_v2':
      return parseFlowIR(input.content);
    case 'mermaid':
      return mermaidToDSL(input.content, input.name || 'Flow');
    default:
      throw new Error(`Unsupported artifact format: ${input.format}`);
  }
}

function parseFlowIR(content) {
  const dsl = JSON.parse(content);
  if (!dsl || typeof dsl !== 'object' || dsl.version !== 2) {
    throw new Error('flowir_v2 content must contain FlowIR version 2.');
  }
  return dsl;
}

function mermaidToDSL(mermaidText, requestedName) {
  const parser = new MermaidParser();
  const graph = parser.parse(mermaidText);
  const extractor = new MetadataExtractor();
  const metadataMap = new Map();
  for (const node of graph.nodes) {
    metadataMap.set(node.id, extractor.extract(node));
  }
  const flowApiName = normalizeName(requestedName);
  return new IntermediateModelBuilder().build(
    graph,
    metadataMap,
    flowApiName,
    flowApiName.replace(/_/g, ' '),
  );
}

function normalizeName(name) {
  const base = String(name || 'Flow')
    .replace(/\.flow-meta\.xml$/i, '')
    .replace(/\.mmd$/i, '')
    .replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z]/.test(base) ? base : `Flow_${base}`;
}

function validateDSL(dsl) {
  return new FlowValidator().validate(dsl);
}

function semanticResult(request, providerReference, dsl, validation, artifacts) {
  const family = flowFamily(dsl);
  const fidelity = fidelityReport(family, validation);
  return {
    contract_version: CONTRACT_VERSION,
    operation: request.operation,
    status: validation.valid ? 'succeeded' : 'rejected',
    artifacts: validation.valid ? artifacts : [],
    fidelity,
    semantic_metadata: {
      flow_family: family,
      flow_api_name: dsl.flowApiName || '',
      api_version: dsl.apiVersion || '',
    },
    diagnostics: diagnostics(validation),
    provider_reference: providerReference,
  };
}

function rejectedResult(request, providerReference, error) {
  return {
    contract_version: CONTRACT_VERSION,
    operation:
      request && SUPPORTED_OPERATIONS.has(request.operation)
        ? request.operation
        : 'salesforce.flow.validate',
    status: 'rejected',
    artifacts: [],
    fidelity: {
      contract_version: CONTRACT_VERSION,
      level: 'unsupported',
      flow_family: 'orchestrated',
      unsupported_features: ['provider_request'],
      warnings: [],
      verification_scopes: [],
    },
    diagnostics: [
      {
        code: 'M2SF-PROVIDER-001',
        severity: 'error',
        stage: 'provider',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      },
    ],
    provider_reference: providerReference,
  };
}

function diagnostics(validation) {
  const errors = (validation.errors || []).map((item) =>
    diagnostic(item, 'error'),
  );
  const warnings = (validation.warnings || []).map((item) =>
    diagnostic(item, 'warning'),
  );
  return [...errors, ...warnings];
}

function diagnostic(item, severity) {
  return {
    code: item.code || 'M2SF-PROVIDER-002',
    severity,
    stage: 'validate',
    message: item.message || 'Provider validation message.',
    element_id: item.elementId || undefined,
    recoverable: severity !== 'error',
  };
}

function fidelityReport(family, validation) {
  const known = family !== 'orchestrated';
  const hasWarnings = (validation.warnings || []).length > 0;
  let level = 'guaranteed';
  if (!known) level = 'unsupported';
  else if (!validation.valid || hasWarnings) level = 'partial';

  return {
    contract_version: CONTRACT_VERSION,
    level,
    flow_family: family,
    supported_features: level === 'unsupported' ? [] : ['flowir_v2'],
    unsupported_features:
      level === 'unsupported' ? ['flow_family'] : [],
    warnings: (validation.warnings || []).map((item) => item.message),
    verification_scopes:
      level === 'guaranteed'
        ? ['semantic_roundtrip', 'canonical_fixture_org_dry_run']
        : [],
  };
}

function flowFamily(dsl) {
  const kind = dsl.flowKind || dsl.processType;
  switch (kind) {
    case 'Autolaunched':
    case 'AutoLaunchedFlow':
      return 'autolaunched';
    case 'Screen':
    case 'Flow':
      return 'screen';
    case 'ScheduleTriggered':
      return 'schedule_triggered';
    case 'PlatformEventTriggered':
      return 'platform_event_triggered';
    case 'RecordTriggered':
      switch (dsl.trigger && dsl.trigger.triggerType) {
        case 'RecordBeforeSave':
          return 'record_triggered_before_save';
        case 'RecordBeforeDelete':
          return 'record_triggered_before_delete';
        default:
          return 'record_triggered_after_save';
      }
    default:
      return 'orchestrated';
  }
}

function artifact(format, name, content) {
  return { format, name: name || '', content };
}

function semanticChanges(before, after, pathPrefix = '$') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];

  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => {
      const pathName = `${pathPrefix}.${key}`;
      if (!(key in before)) {
        return [change(pathName, 'added', undefined, after[key])];
      }
      if (!(key in after)) {
        return [change(pathName, 'removed', before[key], undefined)];
      }
      return semanticChanges(before[key], after[key], pathName);
    });
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const size = Math.max(before.length, after.length);
    const changes = [];
    for (let index = 0; index < size; index += 1) {
      const pathName = `${pathPrefix}[${index}]`;
      if (index >= before.length) {
        changes.push(change(pathName, 'added', undefined, after[index]));
      } else if (index >= after.length) {
        changes.push(change(pathName, 'removed', before[index], undefined));
      } else {
        changes.push(...semanticChanges(before[index], after[index], pathName));
      }
    }
    return changes;
  }

  return [change(pathPrefix, 'changed', before, after)];
}

function change(pathName, kind, before, after) {
  const item = { path: pathName, kind };
  if (before !== undefined) item.before = before;
  if (after !== undefined) item.after = after;
  return item;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  executeFenixFlowRequest,
};
