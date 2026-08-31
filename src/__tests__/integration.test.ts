import * as fs from 'fs';
import * as path from 'path';
import { MermaidParser } from '../parser/mermaid-parser';
import { MetadataExtractor } from '../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
import { FlowValidator } from '../validator/flow-validator';
import { SalesforceSemanticValidator } from '../validator/salesforce-semantic-validator';
import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { DocsGenerator } from '../generators/docs-generator';
import { FlowDSL } from '../types/flow-dsl';

describe('Integration Tests - canonical compiler pipeline', () => {
  const parser = new MermaidParser();
  const extractor = new MetadataExtractor();
  const builder = new IntermediateModelBuilder();
  const graphValidator = new FlowValidator();
  const semanticValidator = new SalesforceSemanticValidator();
  const xmlGenerator = new FlowXmlGenerator();
  const docsGenerator = new DocsGenerator();

  function compile(source: string, apiName = 'Test_Flow', label = 'Test Flow'): FlowDSL {
    const graph = parser.parse(source);
    const metadataMap = new Map();
    for (const node of graph.nodes) metadataMap.set(node.id, extractor.extract(node));
    return builder.build(graph, metadataMap, apiName, label);
  }

  function expectValid(dsl: FlowDSL): void {
    const graph = graphValidator.validate(dsl);
    const semantic = semanticValidator.validate(dsl);
    expect(graph.errors).toHaveLength(0);
    expect(semantic.errors).toHaveLength(0);
  }

  it('compiles a Salesforce-semantic Screen Flow end-to-end', () => {
    const source = `
flowchart TD
    Start([START: Complete Flow Example\\nflow: screen\\nvariable: isNew Boolean\\nvariable: accountId String])
    Screen1[SCREEN: Collect Customer Info]
    Assign1[ASSIGNMENT: Initialize Variables\\nset: isNew = true]
    Decision1{DECISION: Customer Type}
    CreateNew[CREATE: Create New Account\\nobject: Account\\nfield: Name = "Demo Account"]
    UpdateExisting[UPDATE: Update Existing Account\\nobject: Account\\nfilter: Id = ref:accountId\\nfield: Name = "Updated Account"]
    Subflow1[[SUBFLOW: Send Welcome Email\\nflow: Send_Welcome_Email]]
    Screen2[SCREEN: Show Confirmation]
    End([END: Process Complete])

    Start --> Screen1
    Screen1 --> Assign1
    Assign1 --> Decision1
    Decision1 -->|New Customer if isNew = true| CreateNew
    Decision1 -->|Existing default| UpdateExisting
    CreateNew --> Subflow1
    UpdateExisting --> Subflow1
    Subflow1 --> Screen2
    Screen2 --> End
    `;

    const dsl = compile(source, 'Complete_Flow', 'Complete Flow');
    expect(dsl.version).toBe(2);
    expect(dsl.flowKind).toBe('Screen');
    expect(dsl.apiVersion).toBe('67.0');
    expect(dsl.elements).toHaveLength(9);
    expectValid(dsl);

    const xml = xmlGenerator.generate(dsl);
    expect(xml).toContain('<apiVersion>67.0</apiVersion>');
    expect(xml).toContain('<processType>Flow</processType>');
    expect(xml).toContain('<status>Draft</status>');
    expect(xml).toContain('<object>Account</object>');
    expect(xml).toContain('<flowName>Send_Welcome_Email</flowName>');
    expect(xml).not.toContain('<targetReference>Process_Complete</targetReference>');
  });

  it('compiles typed RecordCreate and RecordUpdate metadata', () => {
    const source = `
flowchart TD
    Start([START: Records\\nflow: autolaunched\\nvariable: accountId String])
    Create[CREATE: New Account\\nobject: Account\\nfield: Name = "Acme"\\nfield: AnnualRevenue = 42]
    Update[UPDATE: Account Status\\nobject: Account\\nfilter: Id = ref:accountId\\nfield: Active__c = true]
    End([END: Done])
    Start --> Create
    Create --> Update
    Update --> End
    `;

    const dsl = compile(source, 'Records_Flow', 'Records Flow');
    expectValid(dsl);
    const xml = xmlGenerator.generate(dsl);
    expect(xml).toContain('<recordCreates>');
    expect(xml).toContain('<recordUpdates>');
    expect(xml).toContain('<numberValue>42</numberValue>');
    expect(xml).toContain('<booleanValue>true</booleanValue>');
    expect(xml).toContain('<elementReference>accountId</elementReference>');
  });

  it('requires a real child Flow API name for Subflow', () => {
    const valid = compile(`
flowchart TD
    Start([START: Main Flow])
    Subflow[[SUBFLOW: Email Notification\\nflow: Email_Notification_Flow]]
    End([END: Done])
    Start --> Subflow
    Subflow --> End
    `, 'Subflow_Flow', 'Subflow Flow');
    expectValid(valid);
    expect(xmlGenerator.generate(valid)).toContain('<flowName>Email_Notification_Flow</flowName>');

    const invalid = compile(`
flowchart TD
    Start([START: Main Flow])
    Subflow[[SUBFLOW: Email Notification]]
    End([END: Done])
    Start --> Subflow
    Subflow --> End
    `, 'Invalid_Subflow', 'Invalid Subflow');
    expect(semanticValidator.validate(invalid).errors.some((e) => e.code === 'M2SF-SF-021')).toBe(true);
    expect(() => xmlGenerator.generate(invalid)).toThrow('M2SF-SF-021');
  });

  it('models Decision labels separately from structured conditions', () => {
    const dsl = compile(`
flowchart TD
    Start([START: Decision Flow\\nvariable: status String])
    Decision{DECISION: Check Status}
    Path1[ASSIGNMENT: Active Path]
    Path2[ASSIGNMENT: Inactive Path]
    Path3[ASSIGNMENT: Default Path]
    End([END: Done])
    Start --> Decision
    Decision -->|Active if status = "Active"| Path1
    Decision -->|Inactive if status = "Inactive"| Path2
    Decision -->|Unknown default| Path3
    Path1 --> End
    Path2 --> End
    Path3 --> End
    `, 'Decision_Flow', 'Decision Flow');

    expectValid(dsl);
    const decision = dsl.elements.find((e) => e.type === 'Decision');
    expect(decision?.type).toBe('Decision');
    if (decision?.type === 'Decision') {
      expect(decision.outcomes).toHaveLength(3);
      expect(decision.outcomes.find((o) => o.name === 'Active')?.conditions?.[0].operator).toBe('EqualTo');
      expect(decision.outcomes.some((o) => o.isDefault)).toBe(true);
    }
    const xml = xmlGenerator.generate(dsl);
    expect(xml).toContain('<leftValueReference>status</leftValueReference>');
    expect(xml).toContain('<stringValue>Active</stringValue>');
  });

  it('maps record-triggered authoring to Salesforce Start metadata', () => {
    const dsl = compile(`
flowchart TD
    Start([START: Account Changed\\nflow: record-triggered\\nobject: Account\\ntrigger: after-save\\nrecord-trigger: create-and-update])
    End([END: Done])
    Start --> End
    `, 'Account_Changed', 'Account Changed');

    expect(dsl.flowKind).toBe('RecordTriggered');
    expectValid(dsl);
    const xml = xmlGenerator.generate(dsl);
    expect(xml).toContain('<processType>AutoLaunchedFlow</processType>');
    expect(xml).toContain('<object>Account</object>');
    expect(xml).toContain('<recordTriggerType>CreateAndUpdate</recordTriggerType>');
    expect(xml).toContain('<triggerType>RecordAfterSave</triggerType>');
  });

  it('resolves non-terminal connectors to destination API names and omits terminal connectors', () => {
    const dsl = compile(`
flowchart TD
    S([START: Begin api: Start_Api\\nvariable: flag Boolean])
    A[ASSIGNMENT: Work api: Assign_Api\\nset: flag = true]
    D{DECISION: Route api: Decision_Api}
    E1([END: First api: End_One])
    E2([END: Second api: End_Two])
    S --> A
    A --> D
    D -->|Yes if flag = true| E1
    D -->|No default| E2
    `, 'Api_Name_Flow', 'Api Name Flow');

    expectValid(dsl);
    const xml = xmlGenerator.generate(dsl);
    expect(xml).toContain('<targetReference>Assign_Api</targetReference>');
    expect(xml).toContain('<targetReference>Decision_Api</targetReference>');
    expect(xml).not.toContain('<targetReference>End_One</targetReference>');
    expect(xml).not.toContain('<targetReference>End_Two</targetReference>');
  });

  it('is deterministic and still generates documentation', () => {
    const source = `
flowchart TD
    Start([START: Deterministic])
    A[ASSIGNMENT: Step A]
    B[ASSIGNMENT: Step B]
    End([END: Done])
    Start --> A
    A --> B
    B --> End
    `;
    const first = compile(source, 'Deterministic_Flow', 'Deterministic Flow');
    const second = compile(source, 'Deterministic_Flow', 'Deterministic Flow');
    expect(xmlGenerator.generate(first)).toBe(xmlGenerator.generate(second));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(docsGenerator.generateMarkdown(first)).toContain('# Deterministic Flow');
  });

  it('keeps every checked-in v1 example inside the supported semantic baseline', () => {
    const examplesDir = path.join(__dirname, '../../examples/v1');
    const files = fs.readdirSync(examplesDir).filter((file) => file.endsWith('.mmd'));
    for (const filename of files) {
      const source = fs.readFileSync(path.join(examplesDir, filename), 'utf-8');
      const flowName = path.basename(filename, '.mmd').replace(/[^A-Za-z0-9_]/g, '_');
      const dsl = compile(source, flowName, flowName);
      expectValid(dsl);
      expect(xmlGenerator.generate(dsl)).toContain('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');
    }
  });
});
