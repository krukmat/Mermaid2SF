import { buildAsciiPreview } from '../cli/commands/interactive';
import { FlowDSL } from '../types/flow-dsl';

describe('interactive helpers', () => {
  it('renders ASCII preview using apiNames for connectors', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'Ascii',
      label: 'Ascii',
      processType: 'Autolaunched',
      apiVersion: '60.0',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', apiName: 'Start_Api', next: 'Assign' },
        { id: 'Assign', type: 'Assignment', apiName: 'Assign_Api', label: 'Assign', assignments: [], next: 'End' },
        { id: 'End', type: 'End', apiName: 'End_Api' },
      ],
    };

    const lines = buildAsciiPreview(dsl);
    expect(lines.find((l) => l.includes('Assign_Api'))).toBeDefined();
    expect(lines.find((l) => l.includes('End_Api'))).toBeDefined();
  });
});
