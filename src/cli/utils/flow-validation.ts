import { FlowValidationResult } from '../../validation/flow-rules';
import { logger } from '../../utils/logger';

export function logFlowValidationResult(
  result: FlowValidationResult,
  label = 'Flow validation',
): void {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    logger.info(`✓ ${label}: no issues`);
    return;
  }

  if (result.errors.length > 0) {
    logger.error(`${label} errors (${result.errors.length}):`);
    result.errors.forEach((error) => {
      logger.error(`  - ${error.code}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    logger.warn(`${label} warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning) => {
      logger.warn(`  - ${warning.code}: ${warning.message}`);
    });
  }
}

export function ensureFlowValidationPasses(result: FlowValidationResult, strict = false): void {
  if (!result.isValid) {
    throw new Error('Flow validation failed');
  }
  if (strict && result.warnings.length > 0) {
    throw new Error('Flow validation warnings treated as errors (strict mode)');
  }
}
