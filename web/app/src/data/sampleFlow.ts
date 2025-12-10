export interface VisualNode {
  id: string;
  type: string;
  label: string;
  apiName: string;
  next?: string;
  yesNext?: string;
  noNext?: string;
  loopCondition?: string;
  iterationCount?: string;
  waitFor?: string;
  waitDuration?: string;
  faultSource?: string;
  faultMessage?: string;
  x: number;
  y: number;
}

export const sampleNodes: VisualNode[] = [
  { id: 'Start_1', type: 'Start', label: 'Start', apiName: 'Start_1', next: 'Screen_1', x: 80, y: 60 },
  { id: 'Screen_1', type: 'Screen', label: 'Collect Data', apiName: 'Screen_1', next: 'Decision_1', x: 300, y: 60 },
  { id: 'Decision_1', type: 'Decision', label: 'Route', apiName: 'Decision_1', yesNext: 'Assign_1', noNext: 'Loop_1', x: 520, y: 60 },
  { id: 'Assign_1', type: 'Assignment', label: 'Set Flag', apiName: 'Assign_1', next: 'Get_1', x: 720, y: 20 },
  { id: 'Get_1', type: 'GetRecords', label: 'Lookup Lead', apiName: 'Get_1', next: 'Wait_1', x: 940, y: 80 },
  { id: 'Wait_1', type: 'Wait', label: 'Await Signal', apiName: 'Wait_1', next: 'Loop_1', waitFor: 'External signal', waitDuration: '00:01:00', x: 1140, y: 80 },
  { id: 'Loop_1', type: 'Loop', label: 'Retry Loop', apiName: 'Loop_1', next: 'End_1', loopCondition: 'Retry < 3', iterationCount: '3', x: 520, y: 200 },
  { id: 'End_1', type: 'End', label: 'Complete', apiName: 'End_1', x: 720, y: 200 },
  { id: 'Fault_1', type: 'Fault', label: 'Catch Error', apiName: 'Fault_1', next: 'End_1', faultSource: 'API', faultMessage: 'Retry required', x: 300, y: 200 },
];
