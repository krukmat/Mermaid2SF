/** Canonical FlowIR v2 types. */
import {
  DEFAULT_API_VERSION,
  DEFAULT_FLOW_STATUS,
  FlowKind,
  FlowStatus,
} from './flow-kind';
import { FlowCondition, FlowOperator, FlowValueLike } from './flow-value';

export { DEFAULT_API_VERSION, DEFAULT_FLOW_STATUS, FlowKind, FlowStatus } from './flow-kind';
export {
  FlowCondition,
  FlowOperator,
  FlowValue,
  FlowValueLike,
  normalizeFlowValue,
  parseConditionExpression,
  reference,
} from './flow-value';

export type ElementType =
  | 'Start'
  | 'End'
  | 'Assignment'
  | 'Decision'
  | 'Screen'
  | 'RecordCreate'
  | 'RecordUpdate'
  | 'Subflow'
  | 'Loop'
  | 'Wait'
  | 'GetRecords'
  | 'Fault';

export interface FlowVariable {
  name: string;
  dataType: string;
  isCollection: boolean;
  isInput: boolean;
  isOutput: boolean;
  objectType?: string;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  apiName?: string;
  label?: string;
  next?: string;
  layout?: { x: number; y: number };
}

export interface StartElement extends BaseElement { type: 'Start' }
export interface EndElement extends BaseElement { type: 'End' }

export interface AssignmentElement extends BaseElement {
  type: 'Assignment';
  assignments: Assignment[];
}
export interface Assignment {
  variable: string;
  value: FlowValueLike;
}

export interface DecisionElement extends BaseElement {
  type: 'Decision';
  outcomes: DecisionOutcome[];
  conditionLogic?: string;
}
export interface DecisionOutcome {
  name: string;
  /** v1 compatibility input; v2 uses `conditions`. */
  condition?: string;
  conditions?: FlowCondition[];
  conditionLogic?: 'and' | 'or' | string;
  isDefault?: boolean;
  next: string;
}

export interface ScreenElement extends BaseElement {
  type: 'Screen';
  components: ScreenComponent[];
  allowBack?: boolean;
  allowFinish?: boolean;
}
export interface ScreenComponent {
  type: 'Field' | 'DisplayText' | 'DisplayImage';
  name: string;
  dataType?: string;
  target?: string;
  text?: string;
  required?: boolean;
}

export interface RecordFilter {
  field: string;
  operator: FlowOperator;
  value: FlowValueLike;
}

export interface RecordCreateElement extends BaseElement {
  type: 'RecordCreate';
  object: string;
  fields: Record<string, FlowValueLike>;
  storeOutputAutomatically?: boolean;
  assignRecordIdToReference?: string;
}

export interface RecordUpdateElement extends BaseElement {
  type: 'RecordUpdate';
  object: string;
  fields: Record<string, FlowValueLike>;
  filters?: RecordFilter[];
  updateMode?: 'single' | 'all';
  filterLogic?: string;
}

export interface SubflowElement extends BaseElement {
  type: 'Subflow';
  flowName: string;
  inputAssignments?: VariableMapping[];
  outputAssignments?: VariableMapping[];
}
export interface VariableMapping {
  name: string;
  value: FlowValueLike;
}

export interface LoopElement extends BaseElement {
  type: 'Loop';
  collection: string;
  next?: string;
}

export interface WaitElement extends BaseElement {
  type: 'Wait';
  waitType?: 'condition' | 'duration' | 'event';
  condition?: string;
  durationValue?: number;
  durationUnit?: 'Seconds' | 'Minutes' | 'Hours' | 'Days';
  eventName?: string;
  next?: string;
}

export interface GetRecordsElement extends BaseElement {
  type: 'GetRecords';
  object: string;
  filters?: RecordFilter[];
  fields?: string[];
  sortField?: string;
  sortDirection?: 'Ascending' | 'Descending';
  next?: string;
}

export interface FaultElement extends BaseElement { type: 'Fault'; next?: string }

export type FlowElement =
  | StartElement
  | EndElement
  | AssignmentElement
  | DecisionElement
  | ScreenElement
  | RecordCreateElement
  | RecordUpdateElement
  | SubflowElement
  | LoopElement
  | WaitElement
  | GetRecordsElement
  | FaultElement;

/** @deprecated Use FlowKind. Kept for v1 compatibility. */
export type ProcessType = FlowKind;
export type RecordTriggerType = 'Create' | 'Update' | 'CreateAndUpdate';
export type RecordTriggerExecution = 'RecordBeforeSave' | 'RecordAfterSave';

export interface RecordTriggerConfig {
  object: string;
  triggerType: RecordTriggerExecution;
  recordTriggerType: RecordTriggerType;
  filters?: RecordFilter[];
  filterLogic?: string;
  doesRequireRecordChangedToMeetCriteria?: boolean;
}

export interface FlowDSL {
  version: number;
  flowApiName: string;
  label: string;
  flowKind?: FlowKind;
  processType: ProcessType;
  apiVersion?: string;
  status?: FlowStatus;
  trigger?: RecordTriggerConfig;
  startElement: string;
  variables?: FlowVariable[];
  elements: FlowElement[];
}

export interface FlowBuildOptions {
  flowKind?: FlowKind;
  apiVersion?: string;
  status?: FlowStatus;
  trigger?: RecordTriggerConfig;
  variables?: FlowVariable[];
}

export function resolveFlowKind(dsl: Pick<FlowDSL, 'flowKind' | 'processType'>): FlowKind {
  return dsl.flowKind || dsl.processType;
}

export function withFlowDefaults(dsl: FlowDSL): FlowDSL {
  return {
    ...dsl,
    apiVersion: dsl.apiVersion || DEFAULT_API_VERSION,
    status: dsl.status || DEFAULT_FLOW_STATUS,
    flowKind: resolveFlowKind(dsl),
  };
}

export function isScreenElement(element: FlowElement): element is ScreenElement { return element.type === 'Screen' }
export function isRecordCreateElement(element: FlowElement): element is RecordCreateElement { return element.type === 'RecordCreate' }
export function isRecordUpdateElement(element: FlowElement): element is RecordUpdateElement { return element.type === 'RecordUpdate' }
export function isSubflowElement(element: FlowElement): element is SubflowElement { return element.type === 'Subflow' }
export function isAssignmentElement(element: FlowElement): element is AssignmentElement { return element.type === 'Assignment' }
export function isDecisionElement(element: FlowElement): element is DecisionElement { return element.type === 'Decision' }
