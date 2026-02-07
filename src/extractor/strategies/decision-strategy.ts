// src/extractor/strategies/decision-strategy.ts
// TASK F3.5: Implement DecisionExtractionStrategy

import { BaseExtractionStrategy } from '../extraction-strategy';
import { ElementType } from '../../types/flow-dsl';

/**
 * Estrategia de extracción para elementos Decision
 *
 * Hereda helpers del BaseExtractionStrategy:
 * - parseLines(): convierte label multilinea a array de líneas
 * - extractLayout(): extrae coordenadas x,y
 * - supports(): verifica si el label comienza con "DECISION:"
 *
 * Responsabilidad: Extraer condiciones y conditionLogic específicas de Decision
 */
export class DecisionExtractionStrategy extends BaseExtractionStrategy {
  readonly elementType: ElementType = 'Decision';
  readonly typePrefix = 'DECISION:';

  /**
   * Extrae propiedades específicas de Decision:
   * - conditions: array de strings con condiciones (ej: ["x > 0", "y < 100"])
   * - conditionLogic: "and" o "or" (opcional)
   * - layout: { x, y } (opcional, heredado del helper)
   *
   * @param label Ej: "DECISION: Check Age\ncondition: age > 18\nconditionLogic: and\nlayout: pos: 100,150"
   * @returns { conditions: [...], conditionLogic?: "and"|"or", layout?: {x, y} }
   */
  extract(label: string): Record<string, any> {
    const lines = this.parseLines(label);
    const conditions: string[] = [];
    let conditionLogic: string | undefined;
    const layout = this.extractLayout(lines);

    // Itera sobre cada línea buscando patrones específicos de Decision
    for (const line of lines) {
      // Busca líneas "condition: <expresión>"
      // Permite múltiples condiciones en el mismo label
      const condMatch = line.match(/condition:\s*(.+)/i);
      if (condMatch) {
        conditions.push(condMatch[1].trim());
        continue; // continue para evitar procesar esta línea nuevamente
      }

      // Busca línea "conditionLogic: and|or"
      const logicMatch = line.match(/conditionLogic:\s*(\w+)/i);
      if (logicMatch) {
        conditionLogic = logicMatch[1].trim();
      }
    }

    return {
      conditions,
      conditionLogic,
      layout,
    };
  }
}
