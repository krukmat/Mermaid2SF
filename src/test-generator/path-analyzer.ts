import { FlowDSL, FlowElement } from '../types/flow-dsl';

export interface PathAnalysis {
  paths: string[][];
  maxDepth: number;
  decisionCount: number;
}

/**
 * Compute simple path coverage over the Flow DSL using DFS.
 * Decisions branch for each outcome; other elements follow `next`.
 */
export function analyzePaths(dsl: FlowDSL): PathAnalysis {
  const elementMap = new Map<string, FlowElement>();
  dsl.elements.forEach((el) => elementMap.set(el.id, el));

  const paths: string[][] = [];
  const visitedStack: string[] = [];

  function dfs(currentId: string) {
    const element = elementMap.get(currentId);
    if (!element) return;

    visitedStack.push(currentId);

    if (element.type === 'Decision') {
      if (element.outcomes.length === 0) {
        paths.push([...visitedStack]);
      } else {
        for (const outcome of element.outcomes) {
          dfs(outcome.next);
        }
      }
    } else if ('next' in element && element.next) {
      dfs(element.next);
    } else {
      // Terminal
      paths.push([...visitedStack]);
    }

    visitedStack.pop();
  }

  dfs(dsl.startElement);

  const maxDepth = paths.reduce((max, p) => Math.max(max, p.length), 0);
  const decisionCount = dsl.elements.filter((e) => e.type === 'Decision').length;

  return { paths, maxDepth, decisionCount };
}
