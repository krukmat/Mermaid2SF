/**
 * Supported Mermaid node shapes
 */
export type NodeShape =
  | 'round' // ([text])
  | 'square' // [text]
  | 'diamond' // {text}
  | 'stadium' // ([text])
  | 'subroutine' // [[text]]
  | 'cylinder' // [(text)]
  | 'circle'; // ((text))

/**
 * Represents a node in a Mermaid flowchart
 */
export interface MermaidNode {
  /** Unique identifier for the node */
  id: string;
  /** Full label text (may be multi-line) */
  label: string;
  /** Shape of the node: (), [], {}, etc. */
  shape: NodeShape;
}

/**
 * Type of arrow in Mermaid
 */
export type ArrowType = 'solid' | 'dotted' | 'thick';

/**
 * Represents an edge (connection) between nodes
 */
export interface MermaidEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Optional label on the edge */
  label?: string;
  /** Type of arrow */
  arrowType?: ArrowType;
}

/**
 * Represents the complete Mermaid flowchart graph
 */
export interface MermaidGraph {
  /** Direction of the flowchart */
  direction: 'TD' | 'LR' | 'TB' | 'RL';
  /** All nodes in the graph (ordered) */
  nodes: MermaidNode[];
  /** All edges in the graph (ordered) */
  edges: MermaidEdge[];
}
