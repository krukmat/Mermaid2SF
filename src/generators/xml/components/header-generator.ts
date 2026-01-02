import { FlowDSL } from '../../../types/flow-dsl';

export class HeaderGenerator {
  generate(dsl: FlowDSL, escapeXml: (text: string) => string): string[] {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Flow xmlns="http://soap.sforce.com/2006/04/metadata">',
      `    <apiVersion>${dsl.apiVersion || '60.0'}</apiVersion>`,
      `    <label>${escapeXml(dsl.label)}</label>`,
      `    <processType>${dsl.processType}</processType>`,
    ];
  }
}
