// src/validation/flow-rules.ts
var requiredNextTypes = [
  "Start",
  "Screen",
  "Assignment",
  "RecordCreate",
  "RecordUpdate",
  "Subflow",
  "Loop",
  "Wait",
  "GetRecords",
  "Fault"
];
var numericIdRegEx = /^[A-Za-z_][A-Za-z0-9_]*$/;
function createMessage(code, severity, message, nodes = []) {
  return { code, severity, message, nodes };
}
function normalizeDecisionOutcomes(node) {
  const outcomes = [];
  if (Array.isArray(node.outcomes)) {
    outcomes.push(...node.outcomes);
  }
  if (node.yesNext) {
    outcomes.push({ name: "Yes", next: node.yesNext });
  }
  if (node.noNext) {
    outcomes.push({ name: "No", next: node.noNext, isDefault: true });
  }
  return outcomes;
}
function validateFlow(nodes) {
  const errors = [];
  const warnings = [];
  const registry = /* @__PURE__ */ new Map();
  nodes.forEach((node) => registry.set(node.id, node));
  const starts = nodes.filter((node) => node.type === "Start");
  if (starts.length === 0) {
    errors.push(
      createMessage("missing-start", "error", "Flow must have exactly one Start element.")
    );
  } else if (starts.length > 1) {
    errors.push(
      createMessage(
        "multiple-starts",
        "error",
        "Flow cannot contain more than one Start element.",
        starts.map((node) => node.id)
      )
    );
  }
  const ends = nodes.filter((node) => node.type === "End");
  if (ends.length === 0) {
    errors.push(createMessage("missing-end", "error", "Flow must have at least one End element."));
  }
  const apiNameMap = /* @__PURE__ */ new Map();
  nodes.forEach((node) => {
    if (node.apiName) {
      if (!numericIdRegEx.test(node.apiName)) {
        errors.push(
          createMessage(
            "invalid-api-name",
            "error",
            `${node.type} ${node.id} uses an invalid API name '${node.apiName}'.`,
            [node.id]
          )
        );
      } else if (apiNameMap.has(node.apiName)) {
        errors.push(
          createMessage(
            "duplicate-api-name",
            "error",
            `API name '${node.apiName}' is defined by multiple nodes.`,
            [node.id, apiNameMap.get(node.apiName).id]
          )
        );
      } else {
        apiNameMap.set(node.apiName, node);
      }
    }
  });
  const adjacency = /* @__PURE__ */ new Map();
  const addEdge = (from, to) => {
    if (!to) return;
    if (!adjacency.has(from)) adjacency.set(from, /* @__PURE__ */ new Set());
    adjacency.get(from).add(to);
  };
  const registerTarget = (node, prop, targetId) => {
    if (!targetId) return;
    if (!registry.has(targetId)) {
      errors.push(
        createMessage(
          "missing-target",
          "error",
          `${node.type} ${node.id} references a nonexistent target (${prop} -> ${targetId}).`,
          [node.id]
        )
      );
    } else {
      addEdge(node.id, targetId);
    }
  };
  nodes.forEach((node) => {
    if (requiredNextTypes.includes(node.type) && node.type !== "Decision" && !node.next) {
      errors.push(
        createMessage(
          "missing-next",
          "error",
          `${node.type} ${node.id} must specify a next element.`,
          [node.id]
        )
      );
    }
    if (node.type === "Decision") {
      const outcomes = normalizeDecisionOutcomes(node);
      const outcomesWithNext = outcomes.filter((outcome) => Boolean(outcome.next));
      const defaultOutcomes = outcomesWithNext.filter((outcome) => outcome.isDefault);
      if (outcomesWithNext.length === 0) {
        errors.push(
          createMessage(
            "missing-decision-paths",
            "error",
            `Decision ${node.id} requires at least one outcome.`,
            [node.id]
          )
        );
      }
      if (defaultOutcomes.length === 0) {
        errors.push(
          createMessage(
            "missing-default-outcome",
            "error",
            `Decision ${node.id} must declare a default outcome.`,
            [node.id]
          )
        );
      }
      if (defaultOutcomes.length > 1) {
        errors.push(
          createMessage(
            "multiple-default-outcomes",
            "error",
            `Decision ${node.id} has ${defaultOutcomes.length} default outcomes, expected 1.`,
            [node.id]
          )
        );
      }
      outcomesWithNext.forEach((outcome) => {
        registerTarget(node, `outcome:${outcome.name || "next"}`, outcome.next);
      });
    }
    if (node.type === "Loop" && !node.loopCondition) {
      warnings.push(
        createMessage(
          "missing-loop-condition",
          "warning",
          `Loop ${node.id} is missing a loopCondition, which may cause infinite retries.`,
          [node.id]
        )
      );
    }
    if (node.type === "Loop" && !node.iterationCount) {
      warnings.push(
        createMessage(
          "missing-loop-iterations",
          "warning",
          `Loop ${node.id} should have an iterationCount limit to avoid infinite loops.`,
          [node.id]
        )
      );
    }
    if (node.type === "Wait" && !node.waitFor && !node.waitDuration) {
      warnings.push(
        createMessage(
          "wait-metadata-warning",
          "warning",
          `Wait ${node.id} should document either a waitFor signal or waitDuration.`,
          [node.id]
        )
      );
    }
    if (node.type === "Fault" && (!node.faultSource || !node.faultMessage)) {
      warnings.push(
        createMessage(
          "fault-metadata-warning",
          "warning",
          `Fault ${node.id} should include faultSource and faultMessage metadata.`,
          [node.id]
        )
      );
    }
    registerTarget(node, "next", node.next);
    registerTarget(node, "yesNext", node.yesNext);
    registerTarget(node, "noNext", node.noNext);
  });
  const startNode = starts[0];
  if (startNode) {
    const reachable = /* @__PURE__ */ new Set();
    const queue = [startNode.id];
    while (queue.length) {
      const current = queue.shift();
      if (reachable.has(current)) continue;
      reachable.add(current);
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
    nodes.forEach((node) => {
      if (node.type === "Start") return;
      if (!reachable.has(node.id)) {
        errors.push(
          createMessage(
            "unreachable-node",
            "error",
            `Node ${node.id} is not reachable from the Start element.`,
            [node.id]
          )
        );
      }
    });
  }
  const result = {
    errors,
    warnings,
    all: [...errors, ...warnings],
    isValid: errors.length === 0
  };
  return result;
}
function mapElementToNode(element) {
  const node = {
    id: element.id,
    type: element.type,
    apiName: element.apiName,
    label: element.label
  };
  if ("next" in element && element.next) {
    node.next = element.next;
  }
  if (element.type === "Decision") {
    const decision = element;
    node.outcomes = decision.outcomes.map((outcome) => ({
      name: outcome.name,
      next: outcome.next,
      isDefault: outcome.isDefault
    }));
  }
  return node;
}
function convertDslToFlowNodes(dsl) {
  return dsl.elements.map(mapElementToNode);
}
function validateDsl(dsl) {
  return validateFlow(convertDslToFlowNodes(dsl));
}
export {
  convertDslToFlowNodes,
  validateDsl,
  validateFlow
};
