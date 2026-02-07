export function cloneNodes(nodes = []) {
  return nodes.map((node) => ({ ...node }));
}

export function getAdvancedConnectionLabel(node) {
  if (!node) return '';
  if (node.type === 'Loop') {
    return `Loop: ${node.loopCondition || 'auto'} · ${node.iterationCount || 'auto'} iterations`;
  }
  if (node.type === 'Wait') {
    return `Wait: ${node.waitFor || 'signal'} · ${node.waitDuration || 'auto'}`;
  }
  if (node.type === 'Fault') {
    return `Fault: ${node.faultSource || 'error'} · ${node.faultMessage || 'recover'}`;
  }
  return '';
}

export function collectConnections(nodes = []) {
  const edges = [];
  nodes.forEach((n, idx) => {
    const pushEdge = (toId, label) => {
      if (!toId) return;
      edges.push({ from: n.id, to: toId, label });
    };
    if (n.type === 'Decision') {
      pushEdge(n.yesNext, 'Yes');
      pushEdge(n.noNext, 'No/default');
    } else if (n.type === 'Loop') {
      pushEdge(n.next || (idx < nodes.length - 1 ? nodes[idx + 1].id : null), getAdvancedConnectionLabel(n));
    } else if (n.type === 'Wait') {
      pushEdge(n.next || (idx < nodes.length - 1 ? nodes[idx + 1].id : null), getAdvancedConnectionLabel(n));
    } else if (n.type === 'Fault') {
      pushEdge(n.next || (idx < nodes.length - 1 ? nodes[idx + 1].id : null), getAdvancedConnectionLabel(n));
    } else if (n.next) {
      pushEdge(n.next, '');
    } else if (!n.next && idx < nodes.length - 1 && n.type !== 'End') {
      pushEdge(nodes[idx + 1].id, 'Auto');
    }
  });
  return edges;
}
