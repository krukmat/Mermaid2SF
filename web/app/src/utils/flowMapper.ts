import { Edge, Node } from 'reactflow';
import { VisualNode } from '../data/sampleFlow';

export interface ReactFlowBundle {
  nodes: Node[];
  edges: Edge[];
}

const labelForType = (node: VisualNode) => `${node.label || node.type} (${node.apiName})`;

export function mapToReactFlow(items: VisualNode[]): ReactFlowBundle {
  const nodes = items.map(
    (node) =>
      ({
        id: node.id,
        position: { x: node.x, y: node.y },
        data: { label: labelForType(node) },
      } as Node),
  );
  const edges: Edge[] = [];
  const pushEdge = (from: string, to: string, label?: string) => {
    edges.push({
      id: `${from}->${to}`,
      source: from,
      target: to,
      label,
      animated: ['Loop', 'Wait', 'Fault'].includes(items.find((n) => n.id === from)?.type || ''),
      style: {
        stroke: '#66e0ff',
      },
    });
  };

  items.forEach((node, index) => {
    const next = node.next || items[index + 1]?.id;
    if (node.type === 'Decision') {
      if (node.yesNext) {
        pushEdge(node.id, node.yesNext, 'Yes');
      }
      if (node.noNext) {
        pushEdge(node.id, node.noNext, 'No/default');
      }
    } else if (next) {
      const label =
        node.type === 'Loop'
          ? `Loop (${node.loopCondition || 'auto'} · ${node.iterationCount || 'auto'})`
          : node.type === 'Wait'
          ? `Wait (${node.waitFor || 'signal'} · ${node.waitDuration || 'auto'})`
          : node.type === 'Fault'
          ? `Fault (${node.faultSource || 'pipeline'})`
          : node.type === 'Assignment'
          ? `Assign` : '';
      pushEdge(node.id, next, label);
    }
  });

  return { nodes, edges };
}
