# BUGS

## Flow XML usa IDs de Mermaid en conectores (Resuelto)
- **Ubicación**: `src/generators/flow-xml-generator.ts`, `src/dsl/intermediate-model-builder.ts`.
- **Estado**: Arreglado. Ahora se construye un mapa `id → apiName` y los `targetReference` usan el `apiName` de destino. Test de regresión: `src/__tests__/flow-xml-generator.test.ts` (con IDs distintos a API names).

## `--dsl-format yaml` emite JSON (Resuelto)
- **Ubicación**: `src/cli/commands/compile.ts`.
- **Estado**: Arreglado. `yamlStringify` usa `js-yaml` y se añadió la declaración de tipos. Test de regresión en `src/__tests__/flow-xml-generator.test.ts` verifica salida YAML real.
