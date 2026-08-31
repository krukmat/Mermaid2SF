export type FlowKind = 'Autolaunched' | 'RecordTriggered' | 'Screen';
export type SalesforceProcessType = 'AutoLaunchedFlow' | 'Flow';
export type FlowStatus = 'Draft' | 'Active' | 'Obsolete';

export const DEFAULT_API_VERSION = '67.0';
export const DEFAULT_FLOW_STATUS: FlowStatus = 'Draft';

export function toSalesforceProcessType(kind: FlowKind): SalesforceProcessType {
  return kind === 'Screen' ? 'Flow' : 'AutoLaunchedFlow';
}
