import {
  FlowDSL,
  FlowElement,
  AssignmentElement,
  DecisionElement,
  ScreenElement,
  RecordCreateElement,
  RecordUpdateElement,
  SubflowElement,
} from '../types/flow-dsl';

export class FlowXmlGenerator {
  /**
   * Generate Salesforce Flow XML from DSL
   * @param dsl - Flow DSL
   * @returns XML string
   */
  generate(dsl: FlowDSL): string {
    const lines: string[] = [];
    const idToApiName = this.buildIdToApiName(dsl.elements);

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');

    // Metadata
    lines.push(`    <apiVersion>${dsl.apiVersion || '60.0'}</apiVersion>`);
    lines.push(`    <label>${this.escapeXml(dsl.label)}</label>`);
    lines.push(`    <processType>${dsl.processType}</processType>`);

    // Sort elements alphabetically by API name for deterministic output
    const sortedElements = [...dsl.elements].sort((a, b) => {
      const aName = a.apiName || a.id;
      const bName = b.apiName || b.id;
      return aName.localeCompare(bName);
    });

    // Generate elements
    for (const element of sortedElements) {
      const elementXml = this.generateElement(element, idToApiName);
      lines.push(...elementXml);
    }

    // Start element reference
    lines.push(`    <start>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    const startElement = dsl.elements.find((e) => e.id === dsl.startElement);
    if (startElement && 'next' in startElement && startElement.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          startElement.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }
    lines.push(`    </start>`);

    lines.push('</Flow>');

    return lines.join('\n');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateElement(element: FlowElement, idToApiName: Map<string, string>): string[] {
    switch (element.type) {
      case 'Start':
        return []; // Start is handled separately
      case 'End':
        return []; // End doesn't need XML in Flow
      case 'Assignment':
        return this.generateAssignment(element as AssignmentElement, idToApiName);
      case 'Decision':
        return this.generateDecision(element as DecisionElement, idToApiName);
      case 'Screen':
        return this.generateScreen(element as ScreenElement, idToApiName);
      case 'RecordCreate':
        return this.generateRecordCreate(element as RecordCreateElement, idToApiName);
      case 'RecordUpdate':
        return this.generateRecordUpdate(element as RecordUpdateElement, idToApiName);
      case 'Subflow':
        return this.generateSubflow(element as SubflowElement, idToApiName);
      case 'Loop':
        return this.generateLoop(element as any, idToApiName);
      case 'Wait':
        return this.generateWait(element as any, idToApiName);
      case 'GetRecords':
        return this.generateGetRecords(element as any, idToApiName);
      case 'Fault':
        return this.generateFault(element as any, idToApiName);
      default:
        return [];
    }
  }

  private generateAssignment(
    element: AssignmentElement,
    idToApiName: Map<string, string>,
  ): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <assignments>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    // Sort assignments alphabetically by variable name
    const sortedAssignments = [...element.assignments].sort((a, b) =>
      a.variable.localeCompare(b.variable),
    );

    for (const assignment of sortedAssignments) {
      lines.push(`        <assignmentItems>`);
      lines.push(`            <assignToReference>${assignment.variable}</assignToReference>`);
      lines.push(`            <operator>Assign</operator>`);
      lines.push(`            <value>`);
      lines.push(`                <stringValue>${this.escapeXml(assignment.value)}</stringValue>`);
      lines.push(`            </value>`);
      lines.push(`        </assignmentItems>`);
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </assignments>`);

    return lines;
  }

  private generateDecision(
    element: DecisionElement,
    idToApiName: Map<string, string>,
  ): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <decisions>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    // Sort outcomes: non-default alphabetically, default last
    const sortedOutcomes = [...element.outcomes].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const outcome of sortedOutcomes) {
      if (outcome.isDefault) {
        lines.push(`        <defaultConnector>`);
        lines.push(
          `            <targetReference>${this.resolveTargetReference(
            outcome.next,
            idToApiName,
          )}</targetReference>`,
        );
        lines.push(`        </defaultConnector>`);
        lines.push(
          `        <defaultConnectorLabel>${this.escapeXml(outcome.name)}</defaultConnectorLabel>`,
        );
      } else {
        lines.push(`        <rules>`);
        lines.push(`            <name>${this.escapeXml(outcome.name)}</name>`);
        lines.push(`            <conditionLogic>and</conditionLogic>`);
        lines.push(`            <conditions>`);
        lines.push(`                <leftValueReference>${outcome.condition || 'true'}</leftValueReference>`);
        lines.push(`                <operator>EqualTo</operator>`);
        lines.push(`                <rightValue>`);
        lines.push(`                    <booleanValue>true</booleanValue>`);
        lines.push(`                </rightValue>`);
        lines.push(`            </conditions>`);
        lines.push(`            <connector>`);
        lines.push(
          `                <targetReference>${this.resolveTargetReference(
            outcome.next,
            idToApiName,
          )}</targetReference>`,
        );
        lines.push(`            </connector>`);
        lines.push(`            <label>${this.escapeXml(outcome.name)}</label>`);
        lines.push(`        </rules>`);
      }
    }

    lines.push(`    </decisions>`);

    return lines;
  }

  private generateScreen(element: ScreenElement, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <screens>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    // Generate fields for each component
    for (const component of element.components) {
      lines.push(`        <fields>`);
      lines.push(`            <name>${component.name}</name>`);
      lines.push(`            <fieldType>${component.type}</fieldType>`);

      if (component.dataType) {
        lines.push(`            <dataType>${component.dataType}</dataType>`);
      }

      if (component.target) {
        lines.push(`            <fieldReference>${this.escapeXml(component.target)}</fieldReference>`);
      }

      if (component.text) {
        lines.push(`            <fieldText>${this.escapeXml(component.text)}</fieldText>`);
      }

      if (component.required !== undefined) {
        lines.push(`            <isRequired>${component.required}</isRequired>`);
      }

      lines.push(`        </fields>`);
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </screens>`);

    return lines;
  }

  private generateRecordCreate(
    element: RecordCreateElement,
    idToApiName: Map<string, string>,
  ): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordCreates>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <object>${element.object}</object>`);

    // Sort fields for deterministic output
    const sortedFields = Object.keys(element.fields).sort();
    for (const fieldName of sortedFields) {
      lines.push(`        <inputAssignments>`);
      lines.push(`            <field>${fieldName}</field>`);
      lines.push(`            <value>`);
      lines.push(`                <stringValue>${this.escapeXml(element.fields[fieldName])}</stringValue>`);
      lines.push(`            </value>`);
      lines.push(`        </inputAssignments>`);
    }

    if (element.assignRecordIdToReference) {
      lines.push(`        <assignRecordIdToReference>${element.assignRecordIdToReference}</assignRecordIdToReference>`);
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </recordCreates>`);

    return lines;
  }

  private generateRecordUpdate(
    element: RecordUpdateElement,
    idToApiName: Map<string, string>,
  ): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordUpdates>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <object>${element.object}</object>`);

    // Generate filters
    if (element.filters && element.filters.length > 0) {
      for (const filter of element.filters) {
        lines.push(`        <filters>`);
        lines.push(`            <field>${filter.field}</field>`);
        lines.push(`            <operator>${filter.operator}</operator>`);
        lines.push(`            <value>`);
        lines.push(`                <stringValue>${this.escapeXml(filter.value)}</stringValue>`);
        lines.push(`            </value>`);
        lines.push(`        </filters>`);
      }
    }

    // Sort fields for deterministic output
    const sortedFields = Object.keys(element.fields).sort();
    for (const fieldName of sortedFields) {
      lines.push(`        <inputAssignments>`);
      lines.push(`            <field>${fieldName}</field>`);
      lines.push(`            <value>`);
      lines.push(`                <stringValue>${this.escapeXml(element.fields[fieldName])}</stringValue>`);
      lines.push(`            </value>`);
      lines.push(`        </inputAssignments>`);
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </recordUpdates>`);

    return lines;
  }

  private generateSubflow(element: SubflowElement, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <subflows>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <flowName>${element.flowName}</flowName>`);

    // Input assignments
    if (element.inputAssignments && element.inputAssignments.length > 0) {
      for (const assignment of element.inputAssignments) {
        lines.push(`        <inputAssignments>`);
        lines.push(`            <name>${assignment.name}</name>`);
        lines.push(`            <value>`);
        lines.push(`                <stringValue>${this.escapeXml(assignment.value)}</stringValue>`);
        lines.push(`            </value>`);
        lines.push(`        </inputAssignments>`);
      }
    }

    // Output assignments
    if (element.outputAssignments && element.outputAssignments.length > 0) {
      for (const assignment of element.outputAssignments) {
        lines.push(`        <outputAssignments>`);
        lines.push(`            <assignToReference>${assignment.name}</assignToReference>`);
        lines.push(`            <name>${assignment.value}</name>`);
        lines.push(`        </outputAssignments>`);
      }
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </subflows>`);

    return lines;
  }

  private generateLoop(element: any, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <loops>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    if (element.collection) {
      lines.push(`        <collectionReference>${element.collection}</collectionReference>`);
    }
    if (element.next) {
      lines.push(`        <nextValueConnector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </nextValueConnector>`);
    }
    lines.push(`    </loops>`);
    return lines;
  }

  private generateWait(element: any, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    const waitType =
      element.waitType ||
      (element.eventName ? 'event' : undefined) ||
      (element.durationValue ? 'duration' : undefined) ||
      (element.condition ? 'condition' : undefined) ||
      'condition';

    lines.push(`    <waits>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    if (waitType === 'duration' && element.durationValue) {
      const unit = element.durationUnit || 'Seconds';
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>TimeBased</eventType>`);
      lines.push(`            <offsetNumber>${element.durationValue}</offsetNumber>`);
      lines.push(`            <offsetUnit>${unit}</offsetUnit>`);
      lines.push(`        </waitEvents>`);
    } else if (waitType === 'event' && element.eventName) {
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>PlatformEvent</eventType>`);
      lines.push(`            <platformEventName>${element.eventName}</platformEventName>`);
      if (element.condition) {
        lines.push(
          `            <conditionLogic>${this.escapeXml(element.condition)}</conditionLogic>`,
        );
      }
      lines.push(`        </waitEvents>`);
    } else if (element.condition) {
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>PlatformEvent</eventType>`);
      lines.push(`            <conditionLogic>${this.escapeXml(element.condition)}</conditionLogic>`);
      lines.push(`        </waitEvents>`);
    }
    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }
    lines.push(`    </waits>`);
    return lines;
  }

  private generateGetRecords(element: any, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordLookups>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <object>${element.object}</object>`);

    if (element.filters && element.filters.length > 0) {
      for (const filter of element.filters) {
        lines.push(`        <filters>`);
        lines.push(`            <field>${filter.field}</field>`);
        lines.push(`            <operator>${filter.operator}</operator>`);
        lines.push(`            <value>`);
        lines.push(`                <stringValue>${this.escapeXml(filter.value)}</stringValue>`);
        lines.push(`            </value>`);
        lines.push(`        </filters>`);
      }
    }

    if (element.sortField) {
      lines.push(`        <sortField>${element.sortField}</sortField>`);
      lines.push(`        <sortOrder>${element.sortDirection || 'Ascending'}</sortOrder>`);
    }

    if (element.fields && element.fields.length > 0) {
      for (const f of element.fields.sort()) {
        lines.push(`        <outputAssignments>`);
        lines.push(`            <assignToReference>${f}</assignToReference>`);
        lines.push(`            <operator>Assign</operator>`);
        lines.push(`            <value><stringValue>${f}</stringValue></value>`);
        lines.push(`        </outputAssignments>`);
      }
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }

    lines.push(`    </recordLookups>`);
    return lines;
  }

  private generateFault(element: any, idToApiName: Map<string, string>): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <faults>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(
        `            <targetReference>${this.resolveTargetReference(
          element.next,
          idToApiName,
        )}</targetReference>`,
      );
      lines.push(`        </connector>`);
    }
    lines.push(`    </faults>`);
    return lines;
  }

  private buildIdToApiName(elements: FlowElement[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const element of elements) {
      map.set(element.id, element.apiName || element.id);
    }
    return map;
  }

  private resolveTargetReference(
    targetId: string | undefined,
    idToApiName: Map<string, string>,
  ): string | undefined {
    if (!targetId) return targetId;
    return idToApiName.get(targetId) || targetId;
  }
}
