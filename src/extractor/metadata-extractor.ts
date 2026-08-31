import { MermaidNode } from '../types/mermaid';
import { ElementType, ExtractedMetadata } from '../types';

export class MetadataExtractor {
  extract(node: MermaidNode): ExtractedMetadata {
    const type = this.extractType(node.label);
    const apiName = this.extractApiName(node.label, node.id);
    const label = this.extractLabel(node.label);
    const properties = this.extractProperties(node.label, type);
    this.validateApiName(apiName);
    return { type, apiName, label, properties };
  }

  private lines(label: string): string[] {
    return label.replace(/\\n/g, '\n').split('\n').map((line) => line.trim());
  }

  private extractType(label: string): ElementType {
    const firstLine = this.lines(label)[0].toUpperCase();
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
    const apiMatch = label.match(/api:\s*(\w+)/i);
    if (apiMatch) return apiMatch[1];
    const displayLabel = this.extractLabel(label);
    const cleaned = displayLabel.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return cleaned || nodeId;
  }

  private extractLabel(label: string): string {
    const firstLine = this.lines(label)[0];
    const match = firstLine.match(/^(START|END|ASSIGNMENT|DECISION|SCREEN|FAULT|SUBFLOW|LOOP|WAIT|GET|CREATE|UPDATE):\s*(.+)$/i);
    return match ? match[2].trim() : firstLine;
  }

  private validateApiName(apiName: string): void {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(apiName)) throw new Error(`Invalid API name: ${apiName}`);
  }

  private extractProperties(label: string, type: ElementType): Record<string, any> {
    switch (type) {
      case 'Start': return this.extractStartProperties(label);
      case 'Assignment': return this.extractAssignmentProperties(label);
      case 'Decision': return this.extractDecisionProperties(label);
      case 'Screen': return this.extractScreenProperties(label);
      case 'RecordCreate': return this.extractRecordCreateProperties(label);
      case 'RecordUpdate': return this.extractRecordUpdateProperties(label);
      case 'Subflow': return this.extractSubflowProperties(label);
      case 'Loop': return this.extractLoopProperties(label);
      case 'Wait': return this.extractWaitProperties(label);
      case 'GetRecords': return this.extractGetRecordsProperties(label);
      default: return {};
    }
  }

  private extractStartProperties(label: string): Record<string, any> {
    let flowKind: 'Screen' | 'Autolaunched' | 'RecordTriggered' | undefined;
    let apiVersion: string | undefined;
    let status: 'Draft' | 'Active' | 'Obsolete' | undefined;
    let object = '';
    let triggerType: 'RecordBeforeSave' | 'RecordAfterSave' | undefined;
    let recordTriggerType: 'Create' | 'Update' | 'CreateAndUpdate' | undefined;
    let filterLogic: string | undefined;
    const filters: any[] = [];
    const variables: any[] = [];

    for (const line of this.lines(label).slice(1)) {
      const flow = line.match(/^flow:\s*(.+)$/i)?.[1]?.toLowerCase();
      if (flow === 'screen') flowKind = 'Screen';
      if (flow === 'autolaunched' || flow === 'auto-launched') flowKind = 'Autolaunched';
      if (flow === 'record-triggered' || flow === 'recordtriggered') flowKind = 'RecordTriggered';

      const version = line.match(/^api-version:\s*([\d.]+)/i);
      if (version) apiVersion = version[1];
      const statusMatch = line.match(/^status:\s*(draft|active|obsolete)/i);
      if (statusMatch) status = `${statusMatch[1][0].toUpperCase()}${statusMatch[1].slice(1).toLowerCase()}` as any;
      const objectMatch = line.match(/^object:\s*([A-Za-z0-9_]+)/i);
      if (objectMatch) object = objectMatch[1];

      const trigger = line.match(/^trigger:\s*(before-save|after-save)/i)?.[1]?.toLowerCase();
      if (trigger === 'before-save') triggerType = 'RecordBeforeSave';
      if (trigger === 'after-save') triggerType = 'RecordAfterSave';

      const recordTrigger = line.match(/^record-trigger:\s*(create-and-update|create|update)/i)?.[1]?.toLowerCase();
      if (recordTrigger === 'create') recordTriggerType = 'Create';
      if (recordTrigger === 'update') recordTriggerType = 'Update';
      if (recordTrigger === 'create-and-update') recordTriggerType = 'CreateAndUpdate';

      const logic = line.match(/^filter-logic:\s*(.+)$/i);
      if (logic) filterLogic = logic[1].trim();
      const filter = line.match(/^filter:\s*([A-Za-z0-9_.]+)\s*=\s*(.+)$/i);
      if (filter) filters.push({ field: filter[1], operator: 'EqualTo', value: filter[2].trim() });

      const variable = line.match(/^variable:\s*([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z]+)(.*)$/i);
      if (variable) {
        const flags = variable[3].toLowerCase();
        const objectType = variable[3].match(/object=([A-Za-z0-9_]+)/i)?.[1];
        variables.push({
          name: variable[1],
          dataType: variable[2],
          isCollection: /\bcollection\b/.test(flags),
          isInput: /\binput\b/.test(flags),
          isOutput: /\boutput\b/.test(flags),
          ...(objectType ? { objectType } : {}),
        });
      }
    }

    const trigger = object || triggerType || recordTriggerType
      ? { object, triggerType, recordTriggerType, filters, filterLogic }
      : undefined;
    return { flowKind, apiVersion, status, trigger, variables };
  }

  private extractAssignmentProperties(label: string): Record<string, any> {
    const assignments: Array<{ variable: string; value: string }> = [];
    for (const line of this.lines(label)) {
      const match = line.match(/set:\s*([A-Za-z0-9_.$]+)\s*=\s*(.+)/i);
      if (match) assignments.push({ variable: match[1], value: match[2].trim() });
    }
    return { assignments };
  }

  private extractDecisionProperties(label: string): Record<string, any> {
    const conditions: string[] = [];
    for (const line of this.lines(label)) {
      const match = line.match(/condition:\s*(.+)/i);
      if (match) conditions.push(match[1].trim());
    }
    return { conditions };
  }

  private extractScreenProperties(label: string): Record<string, any> {
    const components: any[] = [];
    let currentComponent: any = null;
    for (const line of this.lines(label)) {
      const fieldMatch = line.match(/field:\s*(\w+)(?:\s*\((.+)\))?/i);
      if (fieldMatch) {
        if (currentComponent) components.push(currentComponent);
        currentComponent = { type: 'Field', name: fieldMatch[1], dataType: fieldMatch[2] || 'String' };
        continue;
      }
      const displayMatch = line.match(/display:\s*(.+)/i);
      if (displayMatch) {
        if (currentComponent) components.push(currentComponent);
        currentComponent = { type: 'DisplayText', name: `Display_${components.length}`, text: displayMatch[1].trim() };
        continue;
      }
      if (currentComponent) {
        const target = line.match(/target:\s*(.+)/i);
        if (target) currentComponent.target = target[1].trim();
        const required = line.match(/required:\s*(true|false)/i);
        if (required) currentComponent.required = required[1].toLowerCase() === 'true';
      }
    }
    if (currentComponent) components.push(currentComponent);
    return { components };
  }

  private extractRecordCreateProperties(label: string): Record<string, any> {
    return this.extractRecordProperties(label, false);
  }

  private extractRecordUpdateProperties(label: string): Record<string, any> {
    return this.extractRecordProperties(label, true);
  }

  private extractRecordProperties(label: string, includeFilters: boolean): Record<string, any> {
    const fields: Record<string, string> = {};
    const filters: any[] = [];
    let object = '';
    for (const line of this.lines(label)) {
      const objectMatch = line.match(/object:\s*(\w+)/i);
      if (objectMatch) { object = objectMatch[1]; continue; }
      const field = line.match(/field:\s*([A-Za-z0-9_.]+)\s*=\s*(.+)/i);
      if (field) { fields[field[1]] = field[2].trim(); continue; }
      if (includeFilters) {
        const filter = line.match(/filter:\s*([A-Za-z0-9_.]+)\s*=\s*(.+)/i);
        if (filter) filters.push({ field: filter[1], operator: 'EqualTo', value: filter[2].trim() });
      }
    }
    return includeFilters ? { object, fields, filters } : { object, fields };
  }

  private extractSubflowProperties(label: string): Record<string, any> {
    let flowName = '';
    const inputAssignments: any[] = [];
    const outputAssignments: any[] = [];
    for (const line of this.lines(label)) {
      const flow = line.match(/^flow:\s*([A-Za-z0-9_]+)/i);
      if (flow) { flowName = flow[1]; continue; }
      const input = line.match(/input:\s*(\w+)\s*=\s*(.+)/i);
      if (input) { inputAssignments.push({ name: input[1], value: input[2].trim() }); continue; }
      const output = line.match(/output:\s*(\w+)\s*=\s*(.+)/i);
      if (output) outputAssignments.push({ name: output[1], value: output[2].trim() });
    }
    return { flowName, inputAssignments, outputAssignments };
  }

  private extractLoopProperties(label: string): Record<string, any> {
    for (const line of this.lines(label)) {
      const collection = line.match(/collection:\s*(\w+)/i);
      if (collection) return { collection: collection[1] };
    }
    return {};
  }

  private extractWaitProperties(label: string): Record<string, any> {
    let condition: string | undefined;
    let durationValue: number | undefined;
    let durationUnit: 'Seconds' | 'Minutes' | 'Hours' | 'Days' | undefined;
    let eventName: string | undefined;
    let waitType: 'condition' | 'duration' | 'event' | undefined;
    for (const line of this.lines(label)) {
      const mode = line.match(/mode:\s*(\w+)/i)?.[1]?.toLowerCase();
      if (mode === 'duration' || mode === 'event' || mode === 'condition') waitType = mode as any;
      const cond = line.match(/condition:\s*(.+)/i);
      if (cond) { condition = cond[1].trim(); waitType = waitType || 'condition'; }
      const dur = line.match(/duration:\s*([\d.]+)\s*([smhd]?)/i);
      if (dur) {
        const units: Record<string, any> = { s: 'Seconds', m: 'Minutes', h: 'Hours', d: 'Days' };
        durationValue = parseFloat(dur[1]); durationUnit = units[(dur[2] || 's').toLowerCase()]; waitType = 'duration';
      }
      const evt = line.match(/event:\s*(\w+)/i);
      if (evt) { eventName = evt[1]; waitType = 'event'; }
    }
    return { waitType, condition, durationValue, durationUnit, eventName };
  }

  private extractGetRecordsProperties(label: string): Record<string, any> {
    const fields: string[] = [];
    const filters: any[] = [];
    let object = '';
    let sortField: string | undefined;
    let sortDirection: 'Ascending' | 'Descending' | undefined;
    for (const line of this.lines(label)) {
      const obj = line.match(/object:\s*([A-Za-z0-9_]+)/i);
      if (obj) { object = obj[1]; continue; }
      const field = line.match(/^field:\s*([A-Za-z0-9_.]+)$/i);
      if (field) { fields.push(field[1]); continue; }
      const filter = line.match(/filter:\s*([A-Za-z0-9_.]+)\s*=\s*(.+)/i);
      if (filter) filters.push({ field: filter[1], operator: 'EqualTo', value: filter[2].trim() });
      const sort = line.match(/sort:\s*([A-Za-z0-9_.]+)\s*(asc|desc)?/i);
      if (sort) { sortField = sort[1]; sortDirection = sort[2]?.toLowerCase() === 'desc' ? 'Descending' : 'Ascending'; }
    }
    return { object, fields, filters, sortField, sortDirection };
  }
}
