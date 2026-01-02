import { MermaidParser } from '../parser/mermaid-parser';

describe('MermaidParser.parse() - Direct Tests', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  it('should parse simple flowchart successfully', () => {
    const mermaidText = `flowchart TD
      A[Start] --> B[End]`;

    const result = parser.parse(mermaidText);

    expect(result).toBeDefined();
    expect(result.nodes).toBeDefined();
    expect(result.edges).toBeDefined();
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it('should parse flowchart with decision node', () => {
    const mermaidText = `flowchart TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Yes Path]
      B -->|No| D[No Path]`;

    const result = parser.parse(mermaidText);

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('should parse empty flowchart', () => {
    const mermaidText = `flowchart TD`;

    const result = parser.parse(mermaidText);

    expect(result).toBeDefined();
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.direction).toBe('TD');
  });

  it('should parse flowchart with different directions', () => {
    const mermaidText = `flowchart LR
      A[Start] --> B[End]`;

    const result = parser.parse(mermaidText);

    expect(result.direction).toBe('LR');
  });

  it('should handle malformed mermaid gracefully', () => {
    const mermaidText = `invalid mermaid syntax`;

    expect(() => {
      parser.parse(mermaidText);
    }).toThrow();
  });
});
