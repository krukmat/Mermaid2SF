import {
  normalizeFlowValue,
  parseConditionExpression,
} from '../types/flow-dsl';
import { serializeFlowValueXml } from '../types/flow-value';

const escapeXml = (value: string) => value;

describe('FlowIR typed values', () => {
  it('normalizes primitive-looking authoring values', () => {
    expect(normalizeFlowValue('true')).toEqual({ kind: 'boolean', value: true });
    expect(normalizeFlowValue('42')).toEqual({ kind: 'number', value: 42 });
    expect(normalizeFlowValue("'Acme'")).toEqual({ kind: 'string', value: 'Acme' });
    expect(normalizeFlowValue('{!AccountId}')).toEqual({ kind: 'reference', name: 'AccountId' });
    expect(normalizeFlowValue('ref:AccountId')).toEqual({ kind: 'reference', name: 'AccountId' });
    expect(normalizeFlowValue('$Record.Id')).toEqual({ kind: 'reference', name: '$Record.Id' });
  });

  it('parses structured decision expressions', () => {
    expect(parseConditionExpression('$Record.Status__c = "Active"')).toEqual({
      left: { kind: 'reference', name: '$Record.Status__c' },
      operator: 'EqualTo',
      right: { kind: 'string', value: 'Active' },
    });
    expect(parseConditionExpression('{!Count} >= 3')).toEqual({
      left: { kind: 'reference', name: 'Count' },
      operator: 'GreaterThanOrEqualTo',
      right: { kind: 'number', value: 3 },
    });
  });

  it('serializes the correct Salesforce value tag', () => {
    expect(serializeFlowValueXml(true, escapeXml, 0)).toEqual(['<booleanValue>true</booleanValue>']);
    expect(serializeFlowValueXml(3.5, escapeXml, 0)).toEqual(['<numberValue>3.5</numberValue>']);
    expect(serializeFlowValueXml('{!AccountId}', escapeXml, 0)).toEqual([
      '<elementReference>AccountId</elementReference>',
    ]);
    expect(serializeFlowValueXml('ref:AccountId', escapeXml, 0)).toEqual([
      '<elementReference>AccountId</elementReference>',
    ]);
    expect(serializeFlowValueXml('hello', escapeXml, 0)).toEqual(['<stringValue>hello</stringValue>']);
  });
});
