import { MermaidGraph, MermaidNode, MermaidEdge, NodeShape, ArrowType } from '../types/mermaid';

export class MermaidParser {
  /**
   * Parse Mermaid flowchart text into a graph structure
   * @param text - Mermaid flowchart text
   * @returns Parsed graph
   */
  parse(text: string): MermaidGraph {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty Mermaid diagram');
    }

    const lines = this.preprocessText(text);
    const direction = this.extractDirection(lines);
    const nodes = this.extractNodes(lines);
    const edges = this.extractEdges(lines);

    // Validate edges reference existing nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`Edge references unknown node: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`Edge references unknown node: ${edge.to}`);
      }
    }

    return {
      direction,
      nodes,
      edges,
    };
  }

  private preprocessText(text: string): string[] {
    // Remove comments, trim lines, filter empty
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('%%'));
  }

  private extractDirection(lines: string[]): 'TD' | 'LR' | 'TB' | 'RL' {
    const flowchartLine = lines.find((line) => line.startsWith('flowchart'));
    if (!flowchartLine) {
      throw new Error('Missing "flowchart" declaration');
    }
    const match = flowchartLine.match(/flowchart\s+(TD|LR|TB|RL)/);
    return (match?.[1] as 'TD' | 'LR' | 'TB' | 'RL') || 'TD';
  }

  private extractNodes(lines: string[]): MermaidNode[] {
    const nodeMap = new Map<string, MermaidNode>();

    for (const line of lines) {
      // Match node definitions: ID[Label], ID([Label]), ID{Label}, etc.
      // Handle multi-line labels by collecting consecutive lines
      const nodeRegex = /(\w+)([\[\(\{]+)([^\]\)\}]+)([\]\)\}]+)/g;
      let match;

      while ((match = nodeRegex.exec(line)) !== null) {
        const [, id, openBracket, label, closeBracket] = match;
        const shape = this.detectShape(openBracket, closeBracket);

        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            label: label.trim(),
            shape,
          });
        }
      }
    }

    // Sort nodes by ID for deterministic output
    return Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  private detectShape(open: string, close: string): NodeShape {
    const combined = open + close;

    // Handle different bracket combinations
    if (combined === '([])') return 'round';
    if (combined === '[]') return 'square';
    if (combined === '{}') return 'diamond';
    if (combined === '[[]]') return 'subroutine';
    if (combined === '[()]') return 'cylinder';
    if (combined === '(())') return 'circle';

    // Default to square
    return 'square';
  }

  private extractEdges(lines: string[]): MermaidEdge[] {
    const edges: MermaidEdge[] = [];

    for (const line of lines) {
      // Match edges: A --> B, A -->|Label| B, etc.
      const edgeRegex = /(\w+)\s*(-->|\.\.>|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)/g;
      let match;

      while ((match = edgeRegex.exec(line)) !== null) {
        const [, from, arrowType, label, to] = match;

        edges.push({
          from,
          to,
          label: label?.trim(),
          arrowType: this.detectArrowType(arrowType),
        });
      }
    }

    // Sort edges for deterministic output (by from, then to)
    return edges.sort((a, b) => {
      if (a.from !== b.from) return a.from.localeCompare(b.from);
      return a.to.localeCompare(b.to);
    });
  }

  private detectArrowType(arrow: string): ArrowType {
    if (arrow === '-->') return 'solid';
    if (arrow === '..>') return 'dotted';
    if (arrow === '==>') return 'thick';
    return 'solid';
  }
}
