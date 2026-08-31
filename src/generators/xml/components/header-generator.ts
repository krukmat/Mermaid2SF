import { FlowDSL, DEFAULT_API_VERSION, resolveFlowKind } from '../../../types/flow-dsl';
import { toSalesforceProcessType } from '../../../types/flow-kind';

export class HeaderGenerator {
  generate(dsl: FlowDSL, escapeXml: (text: string) => string): string[] {
    const processType = toSalesforceProcessType(resolveFlowKind(dsl));
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Flow xmlns="http://soap.sforce.com/2006/04/metadata">',
      `    <apiVersion>${dsl.apiVersion || DEFAULT_API_VERSION}</apiVersion>`,
      '    <environments>Default</environments>',
      `    <interviewLabel>${escapeXml(dsl.label)} {!$Flow.CurrentDateTime}</interviewLabel>`,
      `    <label>${escapeXml(dsl.label)}</label>`,
      `    <processType>${processType}</processType>`,
    ];
  }
}
