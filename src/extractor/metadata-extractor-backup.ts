import { MermaidNode } from '../types/mermaid';
import { ElementType, ExtractedMetadata } from '../types';

export class MetadataExtractor {
  /**
   * Extract metadata from a Mermaid node
   * @param node - Mermaid node
   * @returns Extracted metadata
   */
  extract(node: MermaidNode): ExtractedMetadata {
    const type = this.extractType(node.label);
    const apiName = this.extractApiName(node.label, node.id);
    const label = this.extractLabel(node.label);
    const properties = this.extractProperties(node.label, type);

    this.validateApiName(apiName);

    return {
      type,
      apiName,
      label,
      properties,
    };
  }

  private extractType(label: string): ElementType {
    const firstLine = label.split('\n')[0].trim().toUpperCase();

    if (firstLine.startsWith('START:')) return 'Start';
    if (firstLine.startsWith('END:')) return 'End';
    if (firstLine.startsWith('ASSIGNMENT:')) return 'Assignment';
    if (firstLine.startsWith('DECISION:')) return 'Decision';
    if (firstLine.startsWith('SCREEN:')) return 'Screen';
    if (firstLine.startsWith('CREATE:')) return 'RecordCreate';
    if (firstLine.startsWith('UPDATE:')) return 'RecordUpdate';
    if (firstLine.startsWith('SUBFLOW:')) return 'Subflow';
    if (firstLine.startsWith('LOOP:')) return 'Loop';
    if (firstLine.startsWith('WAIT:')) return 'Wait';
    if (firstLine.startsWith('GET:')) return 'GetRecords';
    if (firstLine.startsWith('FAULT:')) return 'Fault';

    throw new Error(`Unknown element type in label: ${firstLine}`);
  }

  private extractApiName(label: string, nodeId: string): string {
    // Look for "api: SomeName" in the label
    const apiMatch = label.match(/api:\s*(\w+)/i);
    if (apiMatch) {
      return apiMatch[1];
    }

    // Generate from label if not specified
    const displayLabel = this.extractLabel(label);
    return this.generateApiName(displayLabel, nodeId);
  }

  private extractLabel(label: string): string {
    const firstLine = label.split('\n')[0].trim();
    // Remove type prefix (e.g., "START: My Label" -> "My Label")
    const match = firstLine.match(/^(START|END|ASSIGNMENT|DECISION|SCREEN|FAULT|SUBFLOW|LOOP|WAIT|GET|CREATE|UPDATE):s*(.+)$/i);
    return match ? match[2].trim() : firstLine;
  }

  private generateApiName(label: string, fallbackId: string): string {
    // Convert "My Label" -> "My_Label"
    const cleaned = label.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');

    return cleaned || fallbackId;
  }

  private validateApiName(apiName: string): void {
    // Salesforce API name rules: alphanumeric + underscore
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(apiName)) {
      throw new Error(`Invalid API name: ${apiName}`);
    }
  }

  private extractProperties(label: string, type: ElementType): Record<string, any> {
    switch (type) {
      case 'Assignment':
        return this.extractAssignmentProperties(label);
      case 'Decision':
        return this.extractDecisionProperties(label);
      case 'Screen':
        return this.extractScreenProperties(label);
      case 'RecordCreate':
        return this.extractRecordCreateProperties(label);
      case 'RecordUpdate':
        return this.extractRecordUpdateProperties(label);
      case 'Subflow':
        return this.extractSubflowProperties(label);
      case 'Loop':
        return this.extractLoopProperties(label);
      case 'Wait':
        return this.extractWaitProperties(label);
      case 'GetRecords':
        return this.extractGetRecordsProperties(label);
      case 'Fault':
        return {};
      default:
        return {};
    }
  }

  private extractAssignmentProperties(label: string): Record<string, any> {
    const assignments: Array<{ variable: string; value: string }> = [];

    // Look for lines like: "set: variableName = expression"
    const lines = label.split('\n');
    for (const line of lines) {
      const match = line.match(/set:\s*(\w+)\s*=\s*(.+)/i);
      if (match) {
        assignments.push({
          variable: match[1].trim(),
          value: match[2].trim(),
        });
      }
    }

    return { assignments };
  }

  private extractDecisionProperties(label: string): Record<string, any> {
    // Decisions primarily get their outcomes from edges
    // But we can extract base condition info if needed
    const conditions: string[] = [];

    const lines = label.split('\n');
    for (const line of lines) {
      const match = line.match(/condition:\s*(.+)/i);
      if (match) {
        conditions.push(match[1].trim());
      }
    }

    return { conditions };
  }

  private extractScreenProperties(label: string): Record<string, any> {
    const components: any[] = [];
    const lines = label.split('\n');
    let currentComponent: any = null;

    for (const line of lines) {
      // Look for component definitions: "field: FieldName"
      const fieldMatch = line.match(/field:\s*(\w+)(?:\s*\((.+)\))?/i);
      if (fieldMatch) {
        if (currentComponent) components.push(currentComponent);
        currentComponent = {
          type: 'Field',
          name: fieldMatch[1],
          dataType: fieldMatch[2] || 'String',
        };
        continue;
      }

      const displayMatch = line.match(/display:\s*(.+)/i);
      if (displayMatch) {
        if (currentComponent) components.push(currentComponent);
        currentComponent = {
          type: 'DisplayText',
          name: `Display_${components.length}`,
          text: displayMatch[1].trim(),
        };
        continue;
      }

      // Extract component properties
      if (currentComponent) {
        const targetMatch = line.match(/target:\s*(.+)/i);
        if (targetMatch) {
          currentComponent.target = targetMatch[1].trim();
        }

        const requiredMatch = line.match(/required:\s*(true|false)/i);
        if (requiredMatch) {
          currentComponent.required = requiredMatch[1].toLowerCase() === 'true';
        }
      }
    }

    if (currentComponent) components.push(currentComponent);

    return { components };
  }

  private extractRecordCreateProperties(label: string): Record<string, any> {
    const fields: Record<string, string> = {};
    let object = '';

    const lines = label.split('\n');
    for (const line of lines) {
      // Extract object
      const objectMatch = line.match(/object:\s*(\w+)/i);
      if (objectMatch) {
        object = objectMatch[1];
        continue;
      }

      // Extract field assignments: "field: FieldName = value"
      const fieldMatch = line.match(/field:\s*(\w+)\s*=\s*(.+)/i);
      if (fieldMatch) {
        fields[fieldMatch[1]] = fieldMatch[2].trim();
      }
    }

    return { object, fields };
  }

  private extractRecordUpdateProperties(label: string): Record<string, any> {
    const fields: Record<string, string> = {};
    const filters: any[] = [];
    let object = '';

    const lines = label.split('\n');
    for (const line of lines) {
      // Extract object
      const objectMatch = line.match(/object:\s*(\w+)/i);
      if (objectMatch) {
        object = objectMatch[1];
        continue;
      }

      // Extract field updates: "field: FieldName = value"
      const fieldMatch = line.match(/field:\s*(\w+)\s*=\s*(.+)/i);
      if (fieldMatch) {
        fields[fieldMatch[1]] = fieldMatch[2].trim();
        continue;
      }

      // Extract filters: "filter: FieldName = value"
      const filterMatch = line.match(/filter:\s*(\w+)\s*=\s*(.+)/i);
      if (filterMatch) {
        filters.push({
          field: filterMatch[1],
          operator: 'EqualTo',
          value: filterMatch[2].trim(),
        });
      }
    }

    return { object, fields, filters };
  }

  private extractSubflowProperties(label: string): Record<string, any> {
    let flowName = '';
    const inputAssignments: any[] = [];
    const outputAssignments: any[] = [];

    const lines = label.split('\n');
    for (const line of lines) {
      // Extract flow name
      const flowMatch = line.match(/flow:\s*(\w+)/i);
      if (flowMatch) {
        flowName = flowMatch[1];
        continue;
      }

      // Extract input assignments: "input: varName = value"
      const inputMatch = line.match(/input:\s*(\w+)\s*=\s*(.+)/i);
      if (inputMatch) {
        inputAssignments.push({
          name: inputMatch[1],
          value: inputMatch[2].trim(),
        });
        continue;
      }

      // Extract output assignments: "output: varName = value"
      const outputMatch = line.match(/output:\s*(\w+)\s*=\s*(.+)/i);
      if (outputMatch) {
        outputAssignments.push({
          name: outputMatch[1],
          value: outputMatch[2].trim(),
        });
      }
    }

    return { flowName, inputAssignments, outputAssignments };
  }

  private extractLoopProperties(label: string): Record<string, any> {
    const lines = label.split('\n');
    for (const line of lines) {
      const col = line.match(/collection:\s*(\w+)/i);
      if (col) {
        return { collection: col[1] };
      }
    }
    return {};
  }

  private extractWaitProperties(label: string): Record<string, any> {
    const lines = label.replace(/\\n/g, '\n').split('\n');
    let condition: string | undefined;
    let durationValue: number | undefined;
    let durationUnit: 'Seconds' | 'Minutes' | 'Hours' | 'Days' | undefined;
    let eventName: string | undefined;
    let waitType: 'condition' | 'duration' | 'event' | undefined;

    for (const line of lines) {
      const modeMatch = line.match(/mode:\s*(\w+)/i);
      if (modeMatch) {
        const mode = modeMatch[1].toLowerCase();
        if (mode === 'duration' || mode === 'event' || mode === 'condition') {
          waitType = mode as any;
        }
      }
      const cond = line.match(/condition:\s*(.+)/i);
      if (cond) {
        condition = cond[1].trim();
        waitType = waitType || 'condition';
      }
      const dur = line.match(/duration:\s*([\d.]+)\s*([smhd]?)/i);
      if (dur) {
        const value = parseFloat(dur[1]);
        const unitToken = (dur[2] || 's').toLowerCase();
        const unitMap: Record<string, any> = {
          s: 'Seconds',
          m: 'Minutes',
          h: 'Hours',
          d: 'Days',
        };
        durationValue = value;
        durationUnit = unitMap[unitToken] || 'Seconds';
        waitType = 'duration';
      }
      const evt = line.match(/event:\s*(\w+)/i);
      if (evt) {
        eventName = evt[1];
        waitType = 'event';
      }
    }
    return { waitType, condition, durationValue, durationUnit, eventName };
  }

  private extractGetRecordsProperties(label: string): Record<string, any> {
    const lines = label.replace(/\\n/g, '\n').split('\n');
    const fields: string[] = [];
    const filters: any[] = [];
    let object = '';
    let sortField: string | undefined;
    let sortDirection: 'Ascending' | 'Descending' | undefined;

    for (const line of lines) {
      const obj = line.match(/object:\s*([A-Za-z0-9_]+)/i);
      if (obj) {
        object = obj[1];
        continue;
      }
      const f = line.match(/field:\s*([A-Za-z0-9_.]+)/i);
      if (f) {
        fields.push(f[1]);
        continue;
      }
      const filt = line.match(/filter:\s*([A-Za-z0-9_.]+)\s*=\s*(.+)/i);
      if (filt) {
        filters.push({ field: filt[1], operator: 'EqualTo', value: filt[2].trim() });
      }
      const sort = line.match(/sort:\s*([A-Za-z0-9_.]+)\s*(asc|desc)?/i);
      if (sort) {
        sortField = sort[1];
        if (sort[2]) {
          const dir = sort[2].toLowerCase();
          sortDirection = dir === 'desc' ? 'Descending' : 'Ascending';
        }
      }
    }

    return { object, fields, filters, sortField, sortDirection };
  }
}
