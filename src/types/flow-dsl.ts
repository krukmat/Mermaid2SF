/**
 * Supported Flow element types in v1
 */
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

/**
 * Flow variable definition
 */
export interface FlowVariable {
  name: string;
  dataType: string;
  isCollection: boolean;
  isInput: boolean;
  isOutput: boolean;
}

/**
 * Base interface for all Flow elements
 */
export interface BaseElement {
  /** Unique ID in the DSL */
  id: string;
  /** Type of element */
  type: ElementType;
  /** Salesforce API name */
  apiName?: string;
  /** Display label */
  label?: string;
  /** Next element ID (for linear flow) */
  next?: string;
}

/**
 * Start element - beginning of the Flow
 */
export interface StartElement extends BaseElement {
  type: 'Start';
}

/**
 * End element - termination of the Flow
 */
export interface EndElement extends BaseElement {
  type: 'End';
}

/**
 * Assignment element - sets variable values
 */
export interface AssignmentElement extends BaseElement {
  type: 'Assignment';
  /** List of variable assignments */
  assignments: Assignment[];
}

export interface Assignment {
  /** Variable name to assign to */
  variable: string;
  /** Value or expression */
  value: string;
}

/**
 * Decision element - conditional branching
 */
export interface DecisionElement extends BaseElement {
  type: 'Decision';
  /** List of possible outcomes */
  outcomes: DecisionOutcome[];
}

export interface DecisionOutcome {
  /** Outcome name (e.g., "Yes", "No") */
  name: string;
  /** Condition formula (optional if default) */
  condition?: string;
  /** Whether this is the default outcome */
  isDefault?: boolean;
  /** Next element ID for this outcome */
  next: string;
}

/**
 * Screen element - displays UI to users
 */
export interface ScreenElement extends BaseElement {
  type: 'Screen';
  /** Screen components (fields, displays, etc.) */
  components: ScreenComponent[];
  /** Allow back navigation */
  allowBack?: boolean;
  /** Allow finish button */
  allowFinish?: boolean;
}

export interface ScreenComponent {
  /** Component type */
  type: 'Field' | 'DisplayText' | 'DisplayImage';
  /** Component name */
  name: string;
  /** Data type for Field components */
  dataType?: string;
  /** Target binding (e.g., $Record.Field__c) */
  target?: string;
  /** Display text content */
  text?: string;
  /** Required field */
  required?: boolean;
}

/**
 * RecordCreate element - creates Salesforce records
 */
export interface RecordCreateElement extends BaseElement {
  type: 'RecordCreate';
  /** Object API name */
  object: string;
  /** Field assignments */
  fields: Record<string, string>;
  /** Store output automatically */
  storeOutputAutomatically?: boolean;
  /** Variable to store created record ID */
  assignRecordIdToReference?: string;
}

/**
 * RecordUpdate element - updates Salesforce records
 */
export interface RecordUpdateElement extends BaseElement {
  type: 'RecordUpdate';
  /** Object API name */
  object: string;
  /** Field updates */
  fields: Record<string, string>;
  /** Filter conditions */
  filters?: RecordFilter[];
  /** Update mode: 'single' or 'all' */
  updateMode?: 'single' | 'all';
}

export interface RecordFilter {
  /** Field name */
  field: string;
  /** Operator */
  operator: 'EqualTo' | 'NotEqualTo' | 'GreaterThan' | 'LessThan';
  /** Value */
  value: string;
}

/**
 * Subflow element - invokes another flow
 */
export interface SubflowElement extends BaseElement {
  type: 'Subflow';
  /** Flow API name to invoke */
  flowName: string;
  /** Input variable mappings */
  inputAssignments?: VariableMapping[];
  /** Output variable mappings */
  outputAssignments?: VariableMapping[];
}

export interface VariableMapping {
  /** Target variable name */
  name: string;
  /** Source value or reference */
  value: string;
}

export interface LoopElement extends BaseElement {
  type: 'Loop';
  /** Collection variable to iterate */
  collection: string;
  /** Next element when loop body runs */
  next?: string;
}

export interface WaitElement extends BaseElement {
  type: 'Wait';
  /** Wait mode */
  waitType?: 'condition' | 'duration' | 'event';
  /** Condition logic (for condition/event waits) */
  condition?: string;
  /** Duration value (numeric) */
  durationValue?: number;
  /** Duration unit */
  durationUnit?: 'Seconds' | 'Minutes' | 'Hours' | 'Days';
  /** Platform event API name for event waits */
  eventName?: string;
  /** Next element after wait */
  next?: string;
}

export interface GetRecordsElement extends BaseElement {
  type: 'GetRecords';
  /** Object API name */
  object: string;
  /** Filters for query */
  filters?: RecordFilter[];
  /** Fields to return */
  fields?: string[];
  /** Next element */
  next?: string;
}

export interface FaultElement extends BaseElement {
  type: 'Fault';
  /** Target element for fault handling */
  next?: string;
}

/**
 * Union type of all Flow elements
 */
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

/**
 * Process type for the Flow
 */
export type ProcessType = 'Autolaunched' | 'RecordTriggered' | 'Screen';

/**
 * Complete Flow DSL structure
 */
export interface FlowDSL {
  /** DSL schema version */
  version: number;
  /** Salesforce Flow API name */
  flowApiName: string;
  /** Display label */
  label: string;
  /** Type of Flow process */
  processType: ProcessType;
  /** Salesforce API version (e.g., 60.0) */
  apiVersion?: string;
  /** ID of the start element */
  startElement: string;
  /** Flow variables (optional) */
  variables?: FlowVariable[];
  /** All Flow elements */
  elements: FlowElement[];
}

/**
 * Default API version for Salesforce
 */
export const DEFAULT_API_VERSION = '60.0';

/**
 * Type guards for Flow elements
 */
export function isScreenElement(element: FlowElement): element is ScreenElement {
  return element.type === 'Screen';
}

export function isRecordCreateElement(element: FlowElement): element is RecordCreateElement {
  return element.type === 'RecordCreate';
}

export function isRecordUpdateElement(element: FlowElement): element is RecordUpdateElement {
  return element.type === 'RecordUpdate';
}

export function isSubflowElement(element: FlowElement): element is SubflowElement {
  return element.type === 'Subflow';
}

export function isAssignmentElement(element: FlowElement): element is AssignmentElement {
  return element.type === 'Assignment';
}

export function isDecisionElement(element: FlowElement): element is DecisionElement {
  return element.type === 'Decision';
}
