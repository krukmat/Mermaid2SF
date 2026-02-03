// src/extractor/extraction-strategy.ts
// TASK F3.4: Create extraction strategy interface and base class

import { ElementType } from '../types/flow-dsl';

/**
 * Contrato que todas las estrategias de extracción deben cumplir
 * Cada tipo de elemento (Decision, Screen, Assignment, etc.)
 * tendrá su propia implementación
 */
export interface ExtractionStrategy {
  /**
   * Tipo de elemento que esta estrategia sabe extraer
   * Ejemplos: 'Decision', 'Screen', 'RecordCreate', etc.
   */
  readonly elementType: ElementType;

  /**
   * Verifica si esta estrategia puede manejar un label dado
   * Ejemplo: DecisionStrategy retorna true si el label comienza con "DECISION:"
   * @param label - El texto del nodo Mermaid
   * @returns true si esta estrategia puede procesarlo
   */
  supports(label: string): boolean;

  /**
   * Extrae las propiedades específicas del elemento del label
   * @param label - El texto del nodo Mermaid
   * @returns Objeto con propiedades extraídas (layout, conditionLogic, etc.)
   */
  extract(label: string): Record<string, any>;
}

/**
 * Clase abstracta base que proporciona helpers comunes a todas las estrategias
 *
 * Cada estrategia concreta (DecisionExtractionStrategy, ScreenExtractionStrategy, etc.)
 * hereda de esta clase y sobrescribe:
 * - elementType: el tipo que maneja
 * - typePrefix: el prefijo en Mermaid (ej: "DECISION:")
 * - extract(): la lógica específica de extracción
 *
 * ★ Insight ────────────────────────────────────────────────────
 * El patrón Template Method aquí permite:
 * 1. supports() es genérica: busca el prefijo (no repitamos lógica)
 * 2. parseLines() y extractLayout() son helpers reutilizables
 * 3. Cada subclase solo implementa extract() con su lógica específica
 * 4. Código DRY (Don't Repeat Yourself) - evita duplicación entre estrategias
 * ───────────────────────────────────────────────────────────────
 */
export abstract class BaseExtractionStrategy implements ExtractionStrategy {
  abstract readonly elementType: ElementType;
  abstract readonly typePrefix: string; // Ej: 'DECISION:', 'SCREEN:', etc.

  /**
   * Verifica si el label comienza con el prefijo de este tipo
   * Ejemplos:
   * - DecisionExtractionStrategy con typePrefix='DECISION:'
   *   retorna true para 'DECISION: Check Age'
   * - Retorna false para 'SCREEN: Collect Data'
   */
  supports(label: string): boolean {
    return label.trim().toUpperCase().startsWith(this.typePrefix);
  }

  /**
   * Método abstracto que cada subclase debe implementar
   * Contiene la lógica específica de extracción para ese tipo
   */
  abstract extract(label: string): Record<string, any>;

  /**
   * Helper: Parsea un label multilinea en array de líneas limpias
   *
   * Maneja tanto:
   * - Newlines reales: 'Line1\nLine2'
   * - Newlines escapados: 'Line1\\nLine2'
   *
   * Ejemplo:
   * Input:  'DECISION: Check\n  condition: x > 0\n  layout: pos: 100,200'
   * Output: ['DECISION: Check', 'condition: x > 0', 'layout: pos: 100,200']
   */
  protected parseLines(label: string): string[] {
    return label
      .replace(/\\n/g, '\n') // Convierte \n (escape) a \n (real)
      .split('\n') // Divide por newlines
      .map((l) => l.trim()) // Elimina espacios inicio/fin
      .filter(Boolean); // Elimina líneas vacías
  }

  /**
   * Helper: Extrae layout (posición x,y) de las líneas
   *
   * Busca patrón: "layout: pos: 100,200"
   * Retorna: { x: 100, y: 200 }
   *
   * Ejemplo:
   * Input:  ['condition: x > 0', 'layout: pos: 150,300']
   * Output: { x: 150, y: 300 }
   * Input:  ['condition: x > 0']  (sin layout)
   * Output: undefined
   */
  protected extractLayout(lines: string[]): { x: number; y: number } | undefined {
    for (const line of lines) {
      const m = line.match(/layout:\s*pos:\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        return {
          x: parseInt(m[1], 10),
          y: parseInt(m[2], 10),
        };
      }
    }
    return undefined;
  }
}
