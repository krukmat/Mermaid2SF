import * as fs from 'fs';
import { FlowDSL, FlowElement } from '../types/flow-dsl';
import { DEFAULT_API_VERSION } from '../types/flow-dsl';

/**
 * Parse a Salesforce Flow XML file into a DSL-like structure.
 * Note: this is a simplified parser based on regex/string searches; not a full XML parser.
 */
export function parseFlowXml(filePath: string): FlowDSL {
  const text = fs.readFileSync(filePath, 'utf-8');
  const elements: FlowElement[] = [];

  const apiVersion = extractValue(text, /<apiVersion>(.*?)<\/apiVersion>/);
  const label = extractValue(text, /<label>(.*?)<\/label>/) || 'Flow';
  const processType = (extractValue(text, /<processType>(.*?)<\/processType>/) ||
    'Autolaunched') as FlowDSL['processType'];

  parseAssignments(text, elements);
  parseDecisions(text, elements);
  parseScreens(text, elements);
  parseRecordCreates(text, elements);
  parseRecordUpdates(text, elements);
  parseSubflows(text, elements);
  parseLoops(text, elements);
  parseWaits(text, elements);
  parseLookups(text, elements);
  parseFaults(text, elements);

  // Start element reference
  const startNext = extractValue(text, /<start>[\s\S]*?<targetReference>(.*?)<\/targetReference>[\s\S]*?<\/start>/);
  elements.push({
    id: 'Start',
    type: 'Start',
    apiName: 'Start',
    next: startNext || undefined,
  } as any);

  // Ensure End element exists; if none found and startNext empty, synthesize End
  if (!elements.some((e) => e.type === 'End')) {
    const endId = 'End';
    if (!elements.some((e) => e.id === endId)) {
      elements.push({ id: endId, type: 'End', apiName: endId } as any);
    }
    if (startNext === undefined) {
      const start = elements.find((e) => e.type === 'Start');
      if (start && 'next' in start) {
        (start as any).next = endId;
      }
    }
  }

  // Ensure End element exists
  if (!elements.some((e) => e.type === 'End')) {
    elements.push({ id: 'End', type: 'End', apiName: 'End' } as any);
  }

  return {
    version: 1,
    flowApiName: filePath.split('/').pop()?.replace('.flow-meta.xml', '') || 'Flow',
    label,
    processType,
    apiVersion: apiVersion || DEFAULT_API_VERSION,
    startElement: 'Start',
    elements,
  };
}

function extractValue(text: string, regex: RegExp): string | undefined {
  const match = text.match(regex);
  return match ? match[1] : undefined;
}

function parseAssignments(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<assignments>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</assignments>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const assignments = [];
    const itemRegex = /<assignToReference>(.*?)<\/assignToReference>[\s\S]*?<stringValue>(.*?)<\/stringValue>/g;
    let im;
    while ((im = itemRegex.exec(segment)) !== null) {
      assignments.push({ variable: im[1], value: im[2] });
    }
    const next = extractValue(segment, /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Assignment',
      assignments,
      next: next || undefined,
    } as any);
  }
}

function parseDecisions(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<decisions>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</decisions>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const outcomes = [];
    const ruleRegex = /<rules>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>[\s\S]*?<\/connector>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<\/rules>/g;
    let rm;
    while ((rm = ruleRegex.exec(segment)) !== null) {
      outcomes.push({ name: rm[1], next: rm[2], condition: rm[3], isDefault: false });
    }
    const defNext = extractValue(segment, /<defaultConnector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/);
    if (defNext) {
      outcomes.push({ name: 'Default', next: defNext, isDefault: true });
    }
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Decision',
      outcomes,
    } as any);
  }
}

function parseScreens(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<screens>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</screens>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const next = extractValue(segment, /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Screen',
      components: [],
      next: next || undefined,
    } as any);
  }
}

function parseRecordCreates(xml: string, elements: FlowElement[]) {
  const regex = /<recordCreates>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<object>(.*?)<\/object>[\s\S]*?(<inputAssignments>[\s\S]*?<\/inputAssignments>)*[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const object = m[3];
    const inputBlock = m[4] || '';
    const connectorBlock = m[5] || '';
    const fields: Record<string, string> = {};
    const inputRegex = /<inputAssignments>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/inputAssignments>/g;
    let im;
    while ((im = inputRegex.exec(inputBlock)) !== null) {
      fields[im[1]] = im[2];
    }
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'RecordCreate',
      object,
      fields,
      next: next || undefined,
    } as any);
  }
}

function parseRecordUpdates(xml: string, elements: FlowElement[]) {
  const regex = /<recordUpdates>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<object>(.*?)<\/object>[\s\S]*?(<inputAssignments>[\s\S]*?<\/inputAssignments>)*[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const object = m[3];
    const inputBlock = m[4] || '';
    const connectorBlock = m[5] || '';
    const fields: Record<string, string> = {};
    const inputRegex = /<inputAssignments>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/inputAssignments>/g;
    let im;
    while ((im = inputRegex.exec(inputBlock)) !== null) {
      fields[im[1]] = im[2];
    }
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'RecordUpdate',
      object,
      fields,
      next: next || undefined,
    } as any);
  }
}

function parseSubflows(xml: string, elements: FlowElement[]) {
  const regex = /<subflows>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<flowName>(.*?)<\/flowName>[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const flowName = m[3];
    const connectorBlock = m[4] || '';
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Subflow',
      flowName,
      next: next || undefined,
    } as any);
  }
}

function parseLoops(xml: string, elements: FlowElement[]) {
  const regex = /<loops>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<collectionReference>(.*?)<\/collectionReference>[\s\S]*?(<nextValueConnector>[\s\S]*?<\/nextValueConnector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const collection = m[3];
    const connectorBlock = m[4] || '';
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Loop',
      collection,
      next: next || undefined,
    } as any);
  }
}

function parseWaits(xml: string, elements: FlowElement[]) {
  const regex = /<waits>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?(<waitEvents>[\s\S]*?<\/waitEvents>)?[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const eventsBlock = m[3] || '';
    const connectorBlock = m[4] || '';
    const condition = extractValue(eventsBlock, /<conditionLogic>(.*?)<\/conditionLogic>/);
    const eventType = extractValue(eventsBlock, /<eventType>(.*?)<\/eventType>/);
    const platformEventName = extractValue(eventsBlock, /<platformEventName>(.*?)<\/platformEventName>/);
    const offsetNumber = extractValue(eventsBlock, /<offsetNumber>(.*?)<\/offsetNumber>/);
    const offsetUnit = extractValue(eventsBlock, /<offsetUnit>(.*?)<\/offsetUnit>/);
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    let waitType: 'condition' | 'duration' | 'event' | undefined;
    let durationValue: number | undefined;
    let durationUnit: string | undefined;

    if (offsetNumber) {
      waitType = 'duration';
      durationValue = parseFloat(offsetNumber);
      durationUnit = offsetUnit || 'Seconds';
    } else if (platformEventName) {
      waitType = 'event';
    } else if (condition) {
      waitType = 'condition';
    }

    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Wait',
      waitType,
      condition: condition || undefined,
      durationValue,
      durationUnit: (durationUnit as any) || undefined,
      eventName: platformEventName || undefined,
      next: next || undefined,
    } as any);
  }
}

function parseLookups(xml: string, elements: FlowElement[]) {
  const regex = /<recordLookups>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<object>(.*?)<\/object>[\s\S]*?(<filters>[\s\S]*?<\/filters>)*[\s\S]*?(<sortField>[\s\S]*?<\/sortField>)?[\s\S]*?(<sortOrder>[\s\S]*?<\/sortOrder>)?[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const object = m[3];
    const filtersBlock = m[4] || '';
    const sortFieldBlock = m[5] || '';
    const sortOrderBlock = m[6] || '';
    const connectorBlock = m[7] || '';
    const filters: any[] = [];
    const fRegex = /<filters>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<operator>(.*?)<\/operator>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/filters>/g;
    let fm;
    while ((fm = fRegex.exec(filtersBlock)) !== null) {
      filters.push({ field: fm[1], operator: fm[2], value: fm[3] });
    }
    const sortField = extractValue(sortFieldBlock, /<sortField>(.*?)<\/sortField>/);
    const sortOrder = extractValue(sortOrderBlock, /<sortOrder>(.*?)<\/sortOrder>/);
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'GetRecords',
      object,
      filters,
      sortField: sortField || undefined,
      sortDirection: (sortOrder as any) || undefined,
      next: next || undefined,
    } as any);
  }
}

function parseFaults(xml: string, elements: FlowElement[]) {
  const regex = /<faults>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?(<connector>[\s\S]*?<\/connector>)?/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const apiName = m[1];
    const label = m[2];
    const connectorBlock = m[3] || '';
    const next = extractValue(connectorBlock, /<targetReference>(.*?)<\/targetReference>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Fault',
      next: next || undefined,
    } as any);
  }
}
