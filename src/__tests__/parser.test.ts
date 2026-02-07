import { MermaidParser } from '../parser/mermaid-parser';

describe('MermaidParser', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  test('should throw error on empty diagram', () => {
    expect(() => parser.parse('')).toThrow('Empty Mermaid diagram');
  });

  test('should throw error on missing flowchart keyword', () => {
    expect(() => parser.parse('A --> B')).toThrow('Missing "flowchart"');
  });

  test('should parse simple diagram with 2 nodes and 1 edge', () => {
    const input = `
      flowchart TD
      A[Start]
      B[End]
      A --> B
    `;
    const result = parser.parse(input);

    expect(result.direction).toBe('TD');
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].id).toBe('A');
    expect(result.nodes[1].id).toBe('B');
  });

  test('should parse nodes with different shapes', () => {
    const input = `
      flowchart TD
      A([Round])
      B[Square]
      C{Diamond}
    `;
    const result = parser.parse(input);

    expect(result.nodes[0].shape).toBe('round');
    expect(result.nodes[1].shape).toBe('square');
    expect(result.nodes[2].shape).toBe('diamond');
  });

  test('should parse edges with labels', () => {
    const input = `
      flowchart TD
      A[Node A]
      B[Node B]
      C[Node C]
      A --> B
      B -->|Yes| C
    `;
    const result = parser.parse(input);

    expect(result.edges[0].label).toBeUndefined();
    expect(result.edges[1].label).toBe('Yes');
  });

  test('should order nodes and edges deterministically', () => {
    const input = `
      flowchart TD
      Z --> A
      B --> C
      A[Node A]
      C[Node C]
      Z[Node Z]
      B[Node B]
    `;
    const result1 = parser.parse(input);
    const result2 = parser.parse(input);

    // Same input should produce identical output
    expect(result1).toEqual(result2);

    // Nodes should be alphabetically ordered
    expect(result1.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C', 'Z']);

    // Edges should be ordered by (from, to)
    expect(result1.edges[0].from).toBe('B');
    expect(result1.edges[1].from).toBe('Z');
  });

  test('should throw on edge to unknown node', () => {
    const input = `
      flowchart TD
      A[Start]
      A --> UnknownNode
    `;
    expect(() => parser.parse(input)).toThrow('unknown node');
  });

  test('should throw on edge from unknown node', () => {
    const input = `
      flowchart TD
      B[End]
      Unknown --> B
    `;
    expect(() => parser.parse(input)).toThrow('unknown node');
  });

  test('should handle node labels with special characters', () => {
    const input = `
      flowchart TD
      A[Multi Line Label]
      B[Label: With Colon]
      C[Label-With-Dash]
    `;
    const result = parser.parse(input);

    expect(result.nodes[0].label).toBe('Multi Line Label');
    expect(result.nodes[1].label).toBe('Label: With Colon');
    expect(result.nodes[2].label).toBe('Label-With-Dash');
  });

  test('should parse additional shapes and arrow types', () => {
    const input = `
      flowchart TD
      A[[Subroutine]]
      B[(Cylinder)]
      C((Circle))
      D[Square]
      A ..> B
      B ==> C
      C --> D
    `;

    const result = parser.parse(input);
    expect(result.nodes.find((n) => n.id === 'A')?.shape).toBe('subroutine');
    expect(result.nodes.find((n) => n.id === 'B')?.shape).toBe('cylinder');
    expect(result.nodes.find((n) => n.id === 'C')?.shape).toBe('circle');

    expect(result.edges.find((e) => e.from === 'A' && e.to === 'B')?.arrowType).toBe('dotted');
    expect(result.edges.find((e) => e.from === 'B' && e.to === 'C')?.arrowType).toBe('thick');
    expect(result.edges.find((e) => e.from === 'C' && e.to === 'D')?.arrowType).toBe('solid');
  });

  test('should default direction to TD when omitted and ignore comments', () => {
    const input = `
      %% this is a comment
      flowchart
      A[Start]
      %% another comment
      B[End]
      A --> B
    `;

    const result = parser.parse(input);
    expect(result.direction).toBe('TD');
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });
});
