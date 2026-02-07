// src/extractor/extraction-utils.ts
// TASK F3.1: Reusable extraction utilities to reduce code duplication

/**
 * Common regex patterns used across all extractors
 * These patterns parse metadata from Mermaid node labels
 */
export const COMMON_PATTERNS = {
  layout: /layout:\s*pos:\s*(\d+)\s*,\s*(\d+)/i,
  apiName: /api:\s*(\w+)/i,
  condition: /condition:\s*(.+)/i,
  conditionLogic: /conditionLogic:\s*(\w+)/i,
  filterLogic: /filterLogic:\s*(\w+)/i,
  assignment: /set:\s*(\w+)\s*=\s*(.+)/i,
  operator: /op:\s*(\w+)\s*=\s*(\w+)/i,
  valueType: /valueType:\s*(\w+)\s*=\s*(\w+)/i,
} as const;

/**
 * Parses a multi-line label string into an array of trimmed lines
 * Handles both real newlines (\n) and escaped newlines (\\n)
 *
 * @param label - Raw label text from Mermaid node
 * @returns Array of trimmed, non-empty lines
 *
 * @example
 * parseLines('DECISION: Test\n  api: Dec\n  condition: x > 0')
 * // Returns: ['DECISION: Test', 'api: Dec', 'condition: x > 0']
 */
export function parseLines(label: string): string[] {
  return label
    .replace(/\\n/g, '\n') // Convert escaped \n to real newlines
    .split('\n') // Split by newlines
    .map((l) => l.trim()) // Remove leading/trailing spaces
    .filter(Boolean); // Remove empty lines
}

/**
 * Extracts layout coordinates from lines containing "layout: pos: x,y"
 * Returns undefined if no layout is found
 *
 * @param lines - Array of parsed lines from a node label
 * @returns Layout object with x,y coordinates or undefined
 *
 * @example
 * extractLayout(['api: Test', 'layout: pos: 120,240'])
 * // Returns: { x: 120, y: 240 }
 */
export function extractLayout(lines: string[]): { x: number; y: number } | undefined {
  for (const line of lines) {
    const match = line.match(COMMON_PATTERNS.layout);
    if (match) {
      return {
        x: parseInt(match[1], 10),
        y: parseInt(match[2], 10),
      };
    }
  }
  return undefined;
}

/**
 * Generic pattern extraction helper
 * Searches through lines for a pattern and returns the first captured group
 *
 * @param lines - Array of parsed lines
 * @param pattern - Regex pattern to match (must have a capture group)
 * @returns First captured group trimmed, or undefined
 *
 * @example
 * extractPattern(['api: MyFlow'], COMMON_PATTERNS.apiName)
 * // Returns: 'MyFlow'
 */
export function extractPattern(lines: string[], pattern: RegExp): string | undefined {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}
