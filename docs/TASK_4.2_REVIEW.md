# TASK 4.2.1/4.2.2 - Web Visualizer (Scaffold + Visualizador básico)

## Estado
- ✅ 4.2.1 Scaffold web (frontend + backend stub).
- ✅ 4.2.2 Visualizer DSL básico (render local de Mermaid, nodos/edges en canvas, controles mínimos).
- ✅ 4.2.4 Preview de XML: backend compila Mermaid → XML/DSL y frontend lo muestra/descarga.
- Backend: `web/server/index.js` expone `/health` y `/api/compile` (usa dist parser/extractor/builder/validator/generator).
- Frontend: vanilla HTML/JS (sin build tool).

## Cambios realizados
- `web/server/index.js`: servidor HTTP simple con `/health` y stub `/api/compile`.
- `web/frontend/index.html`: UI placeholder mejorada
  - Editor de Mermaid (textarea) con ejemplo precargado.
  - Render local de nodos y edges (parser simplificado) con estilos por tipo (Start/End/Decision).
  - Canvas con nodos y lista de edges; controles render/reset y ping a `/health`.
- `web/README.md`: instrucciones para levantar backend y abrir el frontend.
- `PROJECT_PLAN.md`: 4.2.1 marcado in progress (scaffold hecho); 4.2.2 completado.

## Qué cubre el visualizer (4.2.2/4.2.4)
- Parseo Mermaid simplificado (nodos/edges) en el browser sin backend.
- Estilos básicos y diferenciación de tipos (Start/End/Decision/Default).
- Controles: render desde textarea, reset a sample, ping a backend.
- Export a Mermaid/DSL; compile via backend para previsualizar XML y descargarlo.
- Paneo/zoom pendientes: aún no implementados (requerirá canvas más avanzado o lib).

## Pendientes / Gaps
- Sin React/Vue ni bundler; UI es estática.
- Sin layout automático ni zoom/pan real; sólo lista de nodos/edges.
- Editor gráfico básico; sin drag sobre canvas ni forms avanzados.
- Preview XML no tiene highlighting ni debounce; depende de backend corriendo y dist compilado.
- Round-trip y reverse están presentes (4.3), pero mejorar preservación de metadata/layout se maneja en esa tarea.

## Cómo probar
1) Backend: `node web/server/index.js` (escucha en 4000).
2) Frontend: abrir `web/frontend/index.html` en el navegador.
3) Editar Mermaid en el textarea y presionar Render; nodos/edges se muestran en el canvas, `Ping` muestra `/health`.
