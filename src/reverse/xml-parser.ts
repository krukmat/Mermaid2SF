import * as fs from 'fs';
import {
  Assignment,
  DecisionOutcome,
  FlowCondition,
  FlowDSL,
  FlowElement,
  FlowKind,
  FlowOperator,
  FlowValue,
  FlowVariable,
  RecordFilter,
  DEFAULT_API_VERSION,
  DEFAULT_FLOW_STATUS,
  reference,
} from '../types/flow-dsl';
import {
  XmlNode,
  parseXmlTree,
  xmlChild,
  xmlChildren,
  xmlChildText,
  xmlText,
} from '../utils/xml-tree';
import { CompositeXMLParser } from './parsers/CompositeXMLParser';

function layout(node: XmlNode): { x: number; y: number } | undefined {
  const x = xmlChildText(node, 'locationX');
  const y = xmlChildText(node, 'locationY');
  if (x === undefined || y === undefined) return undefined;
  const parsedX = Number.parseInt(x, 10);
  const parsedY = Number.parseInt(y, 10);
  return Number.isFinite(parsedX) && Number.isFinite(parsedY)
    ? { x: parsedX, y: parsedY }
    : undefined;
}

function connectorTarget(node: XmlNode, connectorName = 'connector'): string | undefined {
  const connector = xmlChild(node, connectorName);
  return connector ? xmlChildText(connector, 'targetReference') : undefined;
}

function valueContainer(node: XmlNode): XmlNode {
  return xmlChild(node, 'value') || xmlChild(node, 'rightValue') || node;
}

function parseFlowValue(node: XmlNode | undefined): FlowValue {
  if (!node) return { kind: 'null' };
  const container = valueContainer(node);
  const stringValue = xmlChildText(container, 'stringValue');
  if (stringValue !== undefined) return { kind: 'string', value: stringValue };
  const booleanValue = xmlChildText(container, 'booleanValue');
  if (booleanValue !== undefined) return { kind: 'boolean', value: booleanValue === 'true' };
  const numberValue = xmlChildText(container, 'numberValue');
  if (numberValue !== undefined) return { kind: 'number', value: Number(numberValue) };
  const dateValue = xmlChildText(container, 'dateValue');
  if (dateValue !== undefined) return { kind: 'date', value: dateValue };
  const dateTimeValue = xmlChildText(container, 'dateTimeValue');
  if (dateTimeValue !== undefined) return { kind: 'datetime', value: dateTimeValue };
  const elementReference = xmlChildText(container, 'elementReference');
  if (elementReference !== undefined) {
    return elementReference === '$GlobalConstant.Null'
      ? { kind: 'null' }
      : reference(elementReference);
  }

  // Accept older fixtures that placed typed value tags directly beneath the wrapper.
  const directText = xmlText(container);
  return directText ? { kind: 'string', value: directText } : { kind: 'null' };
}

function parseFilter(node: XmlNode): RecordFilter | undefined {
  const field = xmlChildText(node, 'field');
  const operator = xmlChildText(node, 'operator') as FlowOperator | undefined;
  if (!field || !operator) return undefined;
  return { field, operator, value: parseFlowValue(node) };
}

function parseFilters(node: XmlNode): RecordFilter[] {
  return xmlChildren(node, 'filters')
    .map(parseFilter)
    .filter((filter): filter is RecordFilter => Boolean(filter));
}

function terminalTarget(target: string | undefined): string {
  return target || 'End';
}

function parseAssignments(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'assignments').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Assignment';
    const assignments: Assignment[] = [];
    const wrappers = xmlChildren(node, 'assignmentItems');

    for (const wrapper of wrappers) {
      const variable = xmlChildText(wrapper, 'assignToReference');
      if (variable) assignments.push({ variable, value: parseFlowValue(wrapper) });
    }

    // Compatibility with the old simplified fixtures.
    if (wrappers.length === 0) {
      const variable = xmlChildText(node, 'assignToReference');
      if (variable) assignments.push({ variable, value: parseFlowValue(node) });
    }

    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Assignment',
      assignments,
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseConditions(rule: XmlNode): FlowCondition[] {
  return xmlChildren(rule, 'conditions')
    .map((node) => {
      const left = xmlChildText(node, 'leftValueReference');
      const operator = xmlChildText(node, 'operator') as FlowOperator | undefined;
      if (!left || !operator) return undefined;
      return {
        left: reference(left),
        operator,
        right: parseFlowValue(xmlChild(node, 'rightValue') || node),
      };
    })
    .filter((condition): condition is FlowCondition => Boolean(condition));
}

function parseDecisionOutcomes(node: XmlNode): DecisionOutcome[] {
  const outcomes: DecisionOutcome[] = xmlChildren(node, 'rules').map((rule) => {
    const name = xmlChildText(rule, 'name') || xmlChildText(rule, 'label') || 'Outcome';
    const conditions = parseConditions(rule);
    return {
      name,
      next: terminalTarget(connectorTarget(rule)),
      conditions: conditions.length > 0 ? conditions : undefined,
      conditionLogic: xmlChildText(rule, 'conditionLogic') || undefined,
      isDefault: false,
    };
  });

  const defaultConnector = connectorTarget(node, 'defaultConnector');
  const defaultLabel = xmlChildText(node, 'defaultConnectorLabel');
  if (defaultConnector || defaultLabel) {
    outcomes.push({
      name: defaultLabel || 'Default',
      next: terminalTarget(defaultConnector),
      isDefault: true,
    });
  }
  return outcomes;
}

function parseDecisions(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'decisions').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Decision';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Decision',
      outcomes: parseDecisionOutcomes(node),
      conditionLogic: xmlChildText(node, 'conditionLogic') || undefined,
      layout: layout(node),
    };
  });
}

function parseScreens(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'screens').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Screen';
    const components = xmlChildren(node, 'fields').map((field, index) => ({
      type: (xmlChildText(field, 'fieldType') || 'Field') as 'Field' | 'DisplayText' | 'DisplayImage',
      name: xmlChildText(field, 'name') || `Field_${index + 1}`,
      dataType: xmlChildText(field, 'dataType'),
      target: xmlChildText(field, 'fieldReference'),
      text: xmlChildText(field, 'fieldText'),
      required: xmlChildText(field, 'isRequired') === undefined
        ? undefined
        : xmlChildText(field, 'isRequired') === 'true',
    }));
    const allowBack = xmlChildText(node, 'allowBack');
    const allowFinish = xmlChildText(node, 'allowFinish');
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Screen',
      components,
      allowBack: allowBack === undefined ? undefined : allowBack === 'true',
      allowFinish: allowFinish === undefined ? undefined : allowFinish === 'true',
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseInputAssignments(node: XmlNode): Record<string, FlowValue> {
  const fields: Record<string, FlowValue> = {};
  for (const assignment of xmlChildren(node, 'inputAssignments')) {
    const field = xmlChildText(assignment, 'field');
    if (field) fields[field] = parseFlowValue(assignment);
  }
  return fields;
}

function parseRecordCreates(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'recordCreates').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'RecordCreate';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'RecordCreate',
      object: xmlChildText(node, 'object') || '',
      fields: parseInputAssignments(node),
      assignRecordIdToReference: xmlChildText(node, 'assignRecordIdToReference'),
      storeOutputAutomatically: xmlChildText(node, 'storeOutputAutomatically') === undefined
        ? undefined
        : xmlChildText(node, 'storeOutputAutomatically') === 'true',
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseRecordUpdates(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'recordUpdates').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'RecordUpdate';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'RecordUpdate',
      object: xmlChildText(node, 'object') || '',
      fields: parseInputAssignments(node),
      filters: parseFilters(node),
      filterLogic: xmlChildText(node, 'filterLogic'),
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseSubflows(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'subflows').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Subflow';
    const inputAssignments = xmlChildren(node, 'inputAssignments').map((assignment) => ({
      name: xmlChildText(assignment, 'name') || 'input',
      value: parseFlowValue(assignment),
    }));
    const outputAssignments = xmlChildren(node, 'outputAssignments').map((assignment) => ({
      name: xmlChildText(assignment, 'assignToReference') || 'output',
      value: reference(xmlChildText(assignment, 'name') || 'output'),
    }));
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Subflow',
      flowName: xmlChildText(node, 'flowName') || '',
      inputAssignments,
      outputAssignments,
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseGetRecords(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'recordLookups').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'GetRecords';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'GetRecords',
      object: xmlChildText(node, 'object') || '',
      filters: parseFilters(node),
      fields: xmlChildren(node, 'queriedFields').map((field) => xmlText(field) || '').filter(Boolean),
      sortField: xmlChildText(node, 'sortField'),
      sortDirection: xmlChildText(node, 'sortOrder') as 'Ascending' | 'Descending' | undefined,
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseLoops(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'loops').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Loop';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Loop',
      collection: xmlChildText(node, 'collectionReference') || '',
      layout: layout(node),
      next: terminalTarget(connectorTarget(node, 'nextValueConnector')),
    };
  });
}

function parseWaits(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'waits').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Wait';
    const waitEvent = xmlChild(node, 'waitEvents') || node;
    const offset = xmlChildText(waitEvent, 'offsetNumber');
    const eventName = xmlChildText(waitEvent, 'platformEventName');
    const condition = xmlChildText(waitEvent, 'conditionLogic');
    const waitType = offset !== undefined ? 'duration' : eventName ? 'event' : 'condition';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Wait',
      waitType,
      durationValue: offset === undefined ? undefined : Number(offset),
      durationUnit: xmlChildText(waitEvent, 'offsetUnit') as 'Seconds' | 'Minutes' | 'Hours' | 'Days' | undefined,
      eventName,
      condition,
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseFaults(root: XmlNode): FlowElement[] {
  return xmlChildren(root, 'faults').map((node) => {
    const apiName = xmlChildText(node, 'name') || 'Fault';
    return {
      id: apiName,
      apiName,
      label: xmlChildText(node, 'label'),
      type: 'Fault',
      layout: layout(node),
      next: terminalTarget(connectorTarget(node)),
    };
  });
}

function parseVariables(root: XmlNode): FlowVariable[] {
  return xmlChildren(root, 'variables').map((node) => ({
    name: xmlChildText(node, 'name') || 'Variable',
    dataType: xmlChildText(node, 'dataType') || 'String',
    isCollection: xmlChildText(node, 'isCollection') === 'true',
    isInput: xmlChildText(node, 'isInput') === 'true',
    isOutput: xmlChildText(node, 'isOutput') === 'true',
    objectType: xmlChildText(node, 'objectType'),
  }));
}

function resolveFlowKind(root: XmlNode, start: XmlNode): FlowKind {
  const processType = xmlChildText(root, 'processType') || 'AutoLaunchedFlow';
  if (processType === 'Flow') return 'Screen';
  if (
    xmlChildText(start, 'object') ||
    xmlChildText(start, 'triggerType') ||
    xmlChildText(start, 'recordTriggerType')
  ) return 'RecordTriggered';
  return 'Autolaunched';
}

function parseTrigger(start: XmlNode, kind: FlowKind): FlowDSL['trigger'] {
  if (kind !== 'RecordTriggered') return undefined;
  return {
    object: xmlChildText(start, 'object') || '',
    triggerType: (xmlChildText(start, 'triggerType') || 'RecordAfterSave') as 'RecordBeforeSave' | 'RecordAfterSave',
    recordTriggerType: (xmlChildText(start, 'recordTriggerType') || 'CreateAndUpdate') as 'Create' | 'Update' | 'CreateAndUpdate',
    filters: parseFilters(start),
    filterLogic: xmlChildText(start, 'filterLogic'),
    doesRequireRecordChangedToMeetCriteria: xmlChildText(start, 'doesRequireRecordChangedToMeetCriteria') === undefined
      ? undefined
      : xmlChildText(start, 'doesRequireRecordChangedToMeetCriteria') === 'true',
  };
}

/** Parse Salesforce Flow Metadata XML into canonical FlowIR v2. */
export function parseFlowXmlText(text: string, flowName = 'Flow'): FlowDSL {
  const root = parseXmlTree(text);
  if (root.name !== 'Flow') throw new Error(`Expected <Flow> root but found <${root.name}>`);

  const startNode = xmlChild(root, 'start');
  if (!startNode) throw new Error('Salesforce Flow metadata requires a <start> element');
  const kind = resolveFlowKind(root, startNode);
  const start: FlowElement = {
    id: 'Start',
    apiName: 'Start',
    type: 'Start',
    layout: layout(startNode),
    next: terminalTarget(connectorTarget(startNode)),
  };
  const end: FlowElement = { id: 'End', apiName: 'End', type: 'End' };

  const elements: FlowElement[] = [
    start,
    ...parseAssignments(root),
    ...parseDecisions(root),
    ...parseScreens(root),
    ...parseRecordCreates(root),
    ...parseRecordUpdates(root),
    ...parseSubflows(root),
    ...parseGetRecords(root),
    ...parseLoops(root),
    ...parseWaits(root),
    ...parseFaults(root),
    end,
  ];

  const variables = parseVariables(root);
  return {
    version: 2,
    flowApiName: flowName,
    label: xmlChildText(root, 'label') || flowName,
    flowKind: kind,
    processType: kind,
    apiVersion: xmlChildText(root, 'apiVersion') || DEFAULT_API_VERSION,
    status: (xmlChildText(root, 'status') || DEFAULT_FLOW_STATUS) as FlowDSL['status'],
    trigger: parseTrigger(startNode, kind),
    startElement: 'Start',
    variables: variables.length > 0 ? variables : undefined,
    elements,
  };
}

export function parseFlowXml(filePath: string): FlowDSL {
  const text = fs.readFileSync(filePath, 'utf-8');
  const inferredName = filePath.split('/').pop()?.replace('.flow-meta.xml', '') || 'Flow';
  return parseFlowXmlText(text, inferredName);
}

// Compatibility facade for callers that use the older strategy parser directly.
export { CompositeXMLParser as XMLParser };
export { ScreenXMLParser } from './parsers/ScreenXMLParser';
export { AssignmentXMLParser } from './parsers/AssignmentXMLParser';
export { DecisionXMLParser } from './parsers/DecisionXMLParser';
