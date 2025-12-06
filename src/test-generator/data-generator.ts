import { FlowDSL } from '../types/flow-dsl';

export interface GeneratedTestData {
  variables: Record<string, any>;
}

/**
 * Generate mock data for variables based on simple heuristics.
 */
export function generateTestData(dsl: FlowDSL): GeneratedTestData {
  const data: Record<string, any> = {};

  if (dsl.variables) {
    for (const variable of dsl.variables) {
      data[variable.name] = mockValue(variable.dataType, variable.isCollection);
    }
  }

  return { variables: data };
}

function mockValue(dataType: string, isCollection: boolean) {
  let value: any;
  switch (dataType.toLowerCase()) {
    case 'boolean':
      value = true;
      break;
    case 'number':
      value = 1;
      break;
    case 'date':
      value = '2025-01-01';
      break;
    default:
      value = 'Sample';
  }
  return isCollection ? [value] : value;
}
