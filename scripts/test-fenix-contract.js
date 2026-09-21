/* eslint-env node */
const assert = require('assert');
const { executeFenixFlowRequest } = require('../web/server/fenix-contract');

const flowIR = {
  version: 2,
  flowApiName: 'Demo',
  label: 'Demo',
  flowKind: 'Autolaunched',
  processType: 'Autolaunched',
  apiVersion: '67.0',
  status: 'Draft',
  startElement: 'Start',
  elements: [
    { id: 'Start', apiName: 'Start', type: 'Start', next: 'End' },
    { id: 'End', apiName: 'End', type: 'End' },
  ],
};

const artifact = {
  format: 'flowir_v2',
  name: 'Demo',
  content: JSON.stringify(flowIR),
};

const validate = executeFenixFlowRequest({
  contract_version: '1',
  operation: 'salesforce.flow.validate',
  input: artifact,
});

assert.equal(validate.contract_version, '1');
assert.equal(validate.operation, 'salesforce.flow.validate');
assert.equal(validate.status, 'succeeded');
assert.equal(validate.semantic_metadata.flow_family, 'autolaunched');
assert.ok(validate.provider_reference);

const compare = executeFenixFlowRequest({
  contract_version: '1',
  operation: 'salesforce.flow.compare',
  input: artifact,
  compare_to: artifact,
});

assert.equal(compare.status, 'succeeded');
assert.equal(compare.diff.equal, true);
assert.deepEqual(compare.diff.changes, []);

const rejected = executeFenixFlowRequest({
  contract_version: '1',
  operation: 'salesforce.flow.export',
  input: { format: 'salesforce_flow_xml', content: '<Flow />' },
});

assert.equal(rejected.status, 'rejected');
assert.equal(rejected.diagnostics[0].stage, 'provider');

console.log('Fenix contract smoke: PASS');
