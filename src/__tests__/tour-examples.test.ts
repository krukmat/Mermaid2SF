import * as fs from 'fs';
import * as path from 'path';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { MermaidParser } from '../parser/mermaid-parser';
import { FlowKind } from '../types/flow-dsl';

const tourDir = path.join(__dirname, '../../examples/tour');

const examples: Array<[string, FlowKind]> = [
  ['01-autolaunched-qualification.mmd', 'Autolaunched'],
  ['02-record-before-save.mmd', 'RecordTriggered'],
  ['03-scheduled-maintenance.mmd', 'ScheduleTriggered'],
  ['04-platform-event-sync.mmd', 'PlatformEventTriggered'],
  ['05-screen-intake.mmd', 'Screen'],
];

describe('README visual tour examples', () => {
  it.each(examples)('%s compiles through the canonical FlowIR pipeline', (fileName, expectedKind) => {
    const source = fs.readFileSync(path.join(tourDir, fileName), 'utf-8');
    const graph = new MermaidParser().parse(source);
    const extractor = new MetadataExtractor();
    const metadata = new Map(
      graph.nodes.map((node) => [node.id, extractor.extract(node)]),
    );
    const apiName = path.basename(fileName, '.mmd').replace(/^[0-9]+-/, '').replace(/-/g, '_');
    const dsl = new IntermediateModelBuilder().build(graph, metadata, apiName, apiName);

    expect(dsl.flowKind).toBe(expectedKind);

    const xml = new FlowXmlGenerator().generate(dsl);
    expect(xml).toContain('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');
    expect(xml).toContain('<apiVersion>67.0</apiVersion>');
  });
});
