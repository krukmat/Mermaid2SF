import * as fs from 'fs';
import { FlowDSL, FlowElement } from '../types/flow-dsl';
import { DEFAULT_API_VERSION } from '../types/flow-dsl';
import { CompositeXMLParser } from './parsers/CompositeXMLParser';

/**
 * Parse a Salesforce Flow XML file into a DSL-like structure.
 * Note: this is a simplified parser based on regex/string searches; not a full XML parser.
 */
export function parseFlowXmlText(text: string, flowName?: string): FlowDSL {
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
  const startNext = extractValue(
    text,
    /<start>[\s\S]*?<targetReference>(.*?)<\/targetReference>[\s\S]*?<\/start>/,
  );
  // TASK F5.1: Parse layout from Start element
  const startSegment = text.match(/<start>[\s\S]*?<\/start>/)?.[0] || '';
  const startLayout = parseLayout(startSegment);
  elements.push({
    id: 'Start',
    type: 'Start',
    apiName: 'Start',
    layout: startLayout,
    next: startNext || undefined,
  } as any);

  // Ensure End element exists and link if needed
  ensureEndElement(elements, startNext);

  return {
    version: 1,
    flowApiName: flowName || 'Flow',
    label,
    processType,
    apiVersion: apiVersion || DEFAULT_API_VERSION,
    startElement: 'Start',
    elements,
  };
}

export function parseFlowXml(filePath: string): FlowDSL {
  const text = fs.readFileSync(filePath, 'utf-8');
  const inferredName = filePath.split('/').pop()?.replace('.flow-meta.xml', '') || 'Flow';
  return parseFlowXmlText(text, inferredName);
}

// Export as facade to maintain compatibility
export { CompositeXMLParser as XMLParser };

// Re-export specific parsers for direct access
export { ScreenXMLParser } from './parsers/ScreenXMLParser';
export { AssignmentXMLParser } from './parsers/AssignmentXMLParser';
export { DecisionXMLParser } from './parsers/DecisionXMLParser';

// TASK: Reduce CC in parseFlowXmlText - extract End element logic
function ensureEndElement(elements: FlowElement[], startNext: string | undefined): void {
  if (!elements.some((e) => e.type === 'End')) {
    const endId = 'End';
    elements.push({ id: endId, type: 'End', apiName: endId } as any);
    // Link Start to End if no next reference found
    if (startNext === undefined) {
      const start = elements.find((e) => e.type === 'Start');
      if (start && 'next' in start) {
        (start as any).next = endId;
      }
    }
  }
}

function extractValue(text: string, regex: RegExp): string | undefined {
  const match = text.match(regex);
  return match ? match[1] : undefined;
}

// TASK F5.1: Parse layout coordinates from locationX and locationY
function parseLayout(segment: string): { x: number; y: number } | undefined {
  const x = extractValue(segment, /<locationX>(.*?)<\/locationX>/);
  const y = extractValue(segment, /<locationY>(.*?)<\/locationY>/);
  if (x && y) {
    return { x: parseInt(x, 10), y: parseInt(y, 10) };
  }
  return undefined;
}

function parseAssignments(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<assignments>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</assignments>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const assignments = [];
    const itemRegex =
      /<assignToReference>(.*?)<\/assignToReference>[\s\S]*?<stringValue>(.*?)<\/stringValue>/g;
    let im;
    while ((im = itemRegex.exec(segment)) !== null) {
      assignments.push({ variable: im[1], value: im[2] });
    }
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Assignment',
      assignments,
      layout,
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
    // TASK: Reduce CC in parseDecisions - extract outcome building
    const outcomes = buildDecisionOutcomes(segment);
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    // TASK F5.2: Parse and include conditionLogic
    const conditionLogic = extractValue(segment, /<conditionLogic>(.*?)<\/conditionLogic>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Decision',
      outcomes,
      layout,
      conditionLogic: conditionLogic || undefined,
    } as any);
  }
}

// TASK: Reduce CC in parseDecisions - helper for outcome extraction
function buildDecisionOutcomes(segment: string): any[] {
  const outcomes = [];
  const ruleRegex =
    /<rules>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>[\s\S]*?<\/connector>[\s\S]*?<label>(.*?)<\/label>[\s\S]*?<\/rules>/g;
  let rm;
  while ((rm = ruleRegex.exec(segment)) !== null) {
    outcomes.push({ name: rm[1], next: rm[2], condition: rm[3], isDefault: false });
  }
  const defNext = extractValue(
    segment,
    /<defaultConnector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
  );
  if (defNext) {
    outcomes.push({ name: 'Default', next: defNext, isDefault: true });
  }
  return outcomes;
}

function parseScreens(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<screens>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</screens>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Screen',
      components: [],
      layout,
      next: next || undefined,
    } as any);
  }
}

function parseRecordCreates(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<recordCreates>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</recordCreates>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    const object = extractValue(segment, /<object>(.*?)<\/object>/);
    if (!apiName) continue;
    const fields: Record<string, string> = {};
    const inputRegex =
      /<inputAssignments>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/inputAssignments>/g;
    let im;
    while ((im = inputRegex.exec(segment)) !== null) {
      fields[im[1]] = im[2];
    }
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'RecordCreate',
      object,
      fields,
      layout,
      next: next || undefined,
    } as any);
  }
}

function parseRecordUpdates(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<recordUpdates>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</recordUpdates>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    const object = extractValue(segment, /<object>(.*?)<\/object>/);
    if (!apiName) continue;
    const fields: Record<string, string> = {};
    const inputRegex =
      /<inputAssignments>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/inputAssignments>/g;
    let im;
    while ((im = inputRegex.exec(segment)) !== null) {
      fields[im[1]] = im[2];
    }
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    // TASK F5.3: Parse and include filterLogic
    const filterLogic = extractValue(segment, /<filterLogic>(.*?)<\/filterLogic>/);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'RecordUpdate',
      object,
      fields,
      layout,
      filterLogic: filterLogic || undefined,
      next: next || undefined,
    } as any);
  }
}

function parseSubflows(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<subflows>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</subflows>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    const flowName = extractValue(segment, /<flowName>(.*?)<\/flowName>/);
    if (!apiName) continue;
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Subflow',
      flowName,
      layout,
      next: next || undefined,
    } as any);
  }
}

function parseLoops(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<loops>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</loops>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    const collection = extractValue(segment, /<collectionReference>(.*?)<\/collectionReference>/);
    if (!apiName) continue;
    const next = extractValue(
      segment,
      /<nextValueConnector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Loop',
      collection,
      layout,
      next: next || undefined,
    } as any);
  }
}

function parseWaits(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<waits>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</waits>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const condition = extractValue(segment, /<conditionLogic>(.*?)<\/conditionLogic>/);
    const platformEventName = extractValue(
      segment,
      /<platformEventName>(.*?)<\/platformEventName>/,
    );
    const offsetNumber = extractValue(segment, /<offsetNumber>(.*?)<\/offsetNumber>/);
    const offsetUnit = extractValue(segment, /<offsetUnit>(.*?)<\/offsetUnit>/);
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK: Reduce CC in parseWaits - extract waitType determination
    const { waitType, durationValue, durationUnit: resolvedUnit } = determineWaitType(
      offsetNumber,
      offsetUnit,
      platformEventName,
      condition,
    );

    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Wait',
      waitType,
      condition: condition || undefined,
      durationValue,
      durationUnit: (resolvedUnit as any) || undefined,
      eventName: platformEventName || undefined,
      layout,
      next: next || undefined,
    } as any);
  }
}

// TASK: Reduce CC in parseWaits - helper for waitType determination
function determineWaitType(
  offsetNumber: string | undefined,
  offsetUnit: string | undefined,
  platformEventName: string | undefined,
  condition: string | undefined,
): {
  waitType: 'condition' | 'duration' | 'event' | undefined;
  durationValue: number | undefined;
  durationUnit: string | undefined;
} {
  if (offsetNumber) {
    return {
      waitType: 'duration',
      durationValue: parseFloat(offsetNumber),
      durationUnit: offsetUnit || 'Seconds',
    };
  }
  if (platformEventName) {
    return { waitType: 'event', durationValue: undefined, durationUnit: undefined };
  }
  if (condition) {
    return { waitType: 'condition', durationValue: undefined, durationUnit: undefined };
  }
  return { waitType: undefined, durationValue: undefined, durationUnit: undefined };
}

function parseLookups(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<recordLookups>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</recordLookups>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    const object = extractValue(segment, /<object>(.*?)<\/object>/);
    if (!apiName) continue;
    // TASK: Reduce CC in parseLookups - extract filter building
    const filters = buildLookupFilters(segment);
    const sortField = extractValue(segment, /<sortField>(.*?)<\/sortField>/);
    const sortOrder = extractValue(segment, /<sortOrder>(.*?)<\/sortOrder>/);
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'GetRecords',
      object,
      filters,
      sortField: sortField || undefined,
      sortDirection: (sortOrder as any) || undefined,
      layout,
      next: next || undefined,
    } as any);
  }
}

// TASK: Reduce CC in parseLookups - helper for filter extraction
function buildLookupFilters(segment: string): any[] {
  const filters: any[] = [];
  const fRegex =
    /<filters>[\s\S]*?<field>(.*?)<\/field>[\s\S]*?<operator>(.*?)<\/operator>[\s\S]*?<stringValue>(.*?)<\/stringValue>[\s\S]*?<\/filters>/g;
  let fm;
  while ((fm = fRegex.exec(segment)) !== null) {
    filters.push({ field: fm[1], operator: fm[2], value: fm[3] });
  }
  return filters;
}

function parseFaults(xml: string, elements: FlowElement[]) {
  const blocks = xml.split('<faults>').slice(1);
  for (const block of blocks) {
    const segment = block.split('</faults>')[0];
    const apiName = extractValue(segment, /<name>(.*?)<\/name>/);
    const label = extractValue(segment, /<label>(.*?)<\/label>/);
    if (!apiName) continue;
    const next = extractValue(
      segment,
      /<connector>[\s\S]*?<targetReference>(.*?)<\/targetReference>/,
    );
    // TASK F5.1: Parse and include layout
    const layout = parseLayout(segment);
    elements.push({
      id: apiName,
      apiName,
      label,
      type: 'Fault',
      layout,
      next: next || undefined,
    } as any);
  }
}
