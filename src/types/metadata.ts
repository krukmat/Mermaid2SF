import { ElementType } from './flow-dsl';

/**
 * Metadata extracted from a Mermaid node
 */
export interface ExtractedMetadata {
  /** Type of Flow element */
  type: ElementType;
  /** Salesforce API name */
  apiName?: string;
  /** Display label */
  label?: string;
  /** Element-specific properties */
  properties: Record<string, any>;
}
