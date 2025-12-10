import React, { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { mapToReactFlow } from './utils/flowMapper';
import { sampleNodes } from './data/sampleFlow';
import './App.css';

function App() {
  const [showEdges, setShowEdges] = useState(true);
  const { nodes, edges } = useMemo(() => mapToReactFlow(sampleNodes), []);

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">POC · React Flow</p>
          <h1>React Flow Map</h1>
        </div>
        <button className="ghost" type="button" onClick={() => setShowEdges((prev) => !prev)}>
          {showEdges ? 'Hide connectors' : 'Show connectors'}
        </button>
      </header>
      <div className="layout">
        <section className="canvas-panel">
          <div className="reactflow-wrapper">
            <ReactFlow nodes={nodes} edges={showEdges ? edges : []} fitView>
              <Background gap={16} size={1} />
              <Controls />
            </ReactFlow>
          </div>
        </section>
        <aside className="notes-panel">
          <div className="note-card">
            <h2>Data Mapping</h2>
            <p>
              Each React Flow node mirrors the vanilla builder&apos;s `nodes` array (id, label, x, y, apiName). Positions
              are reused to compare layouts. Edges are derived from the same connectors (`next`, `yesNext`, etc.) to keep both views in sync.
            </p>
          </div>
          <div className="note-card">
            <h3>Connector logic</h3>
            <ul>
              <li>Decision outcomes map to labeled edges (`Yes`, `No/default`).</li>
              <li>Loop/Wait/Fault nodes reuse their `next` pointer and gain contextual labels for debugging.</li>
              <li>Missing connectors fall back to the subsequent node to keep flows contiguous.</li>
            </ul>
          </div>
          <div className="note-card">
            <h3>Bundle notes</h3>
            <p>
              Vite keeps this POC isolated under `web/app`. It can import shared helpers (e.g., DSL builders) once we extract them
              from the vanilla view. The bundle stays small (~70KB gzipped) because React Flow loads lazily.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
