import { parseFlowXmlText } from '../../reverse/xml-parser';
import { MermaidGenerator } from '../../generators/mermaid-generator';
import { FlowDSL, isDecisionElement, isRecordUpdateElement } from '../../types/flow-dsl';

/**
 * TASK F5.5: Pragmatic round-trip structural integrity tests
 * Validates that metadata (layout, conditionLogic, filterLogic) is preserved
 * through XML → DSL and DSL → Mermaid transformations without full cycle.
 */

/**
 * Extract structural invariants from DSL for comparison
 * Focuses on metadata preservation across transformations
 */
function extractDslInvariants(dsl: FlowDSL) {
  return {
    elementCount: dsl.elements.length,
    elements: dsl.elements.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      apiName: e.apiName,
      layout: e.layout,
      conditionLogic: isDecisionElement(e) ? e.conditionLogic : undefined,
      filterLogic: isRecordUpdateElement(e) ? e.filterLogic : undefined,
    })),
    edges: dsl.elements
      .filter((e) => (e as any).next)
      .map((e) => ({
        from: e.id,
        to: (e as any).next,
      })),
  };
}

/**
 * Extract metadata presence from Mermaid output
 * Verifies all metadata appears in generated flowchart
 */
function extractMermaidMetadata(mermaidText: string) {
  return {
    hasFlowchartHeader: /flowchart TD/.test(mermaidText),
    layoutMatches: (mermaidText.match(/layout: pos:/g) || []).length,
    conditionLogicMatches: (mermaidText.match(/conditionLogic:/g) || []).length,
    filterLogicMatches: (mermaidText.match(/filterLogic:/g) || []).length,
  };
}

describe('F5.5: Round-Trip Structural Integrity', () => {
  const generator = new MermaidGenerator();

  describe('XML → DSL metadata preservation', () => {
    it('preserves layout coordinates from XML to DSL', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Test Flow</label>
          <processType>Autolaunched</processType>
          <start>
            <locationX>50</locationX>
            <locationY>100</locationY>
            <connector>
              <targetReference>Assign_1</targetReference>
            </connector>
          </start>
          <assignments>
            <name>Assign_1</name>
            <label>Test Assignment</label>
            <locationX>150</locationX>
            <locationY>200</locationY>
            <assignToReference>v_Count</assignToReference>
            <stringValue>0</stringValue>
            <connector>
              <targetReference>End</targetReference>
            </connector>
          </assignments>
        </Flow>`;

      const dsl = parseFlowXmlText(xml);
      const invariants = extractDslInvariants(dsl);

      // Verify layout is preserved
      const startElement = invariants.elements.find((e) => e.id === 'Start');
      expect(startElement?.layout).toEqual({ x: 50, y: 100 });

      const assignElement = invariants.elements.find((e) => e.id === 'Assign_1');
      expect(assignElement?.layout).toEqual({ x: 150, y: 200 });
    });

    it('preserves conditionLogic from Decision element in XML to DSL', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Decision Flow</label>
          <processType>Autolaunched</processType>
          <start>
            <connector>
              <targetReference>Dec_1</targetReference>
            </connector>
          </start>
          <decisions>
            <name>Dec_1</name>
            <label>Check Status</label>
            <conditionLogic>and</conditionLogic>
            <locationX>100</locationX>
            <locationY>200</locationY>
            <rules>
              <name>Rule_1</name>
              <connector>
                <targetReference>End</targetReference>
              </connector>
              <label>Default Rule</label>
            </rules>
          </decisions>
        </Flow>`;

      const dsl = parseFlowXmlText(xml);
      const invariants = extractDslInvariants(dsl);

      const decisionElement = invariants.elements.find((e) => e.id === 'Dec_1');
      expect(decisionElement?.conditionLogic).toBe('and');
    });

    it('preserves filterLogic from RecordUpdate element in XML to DSL', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Update Flow</label>
          <processType>Autolaunched</processType>
          <start>
            <connector>
              <targetReference>Update_1</targetReference>
            </connector>
          </start>
          <recordUpdates>
            <name>Update_1</name>
            <label>Update Record</label>
            <object>Account</object>
            <filterLogic>or</filterLogic>
            <locationX>100</locationX>
            <locationY>200</locationY>
            <connector>
              <targetReference>End</targetReference>
            </connector>
          </recordUpdates>
        </Flow>`;

      const dsl = parseFlowXmlText(xml);
      const invariants = extractDslInvariants(dsl);

      const updateElement = invariants.elements.find((e) => e.id === 'Update_1');
      expect(updateElement?.filterLogic).toBe('or');
    });
  });

  describe('DSL → Mermaid metadata preservation', () => {
    it('includes layout coordinates in Mermaid output', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'Start_1',
        elements: [
          { id: 'Start_1', type: 'Start', layout: { x: 50, y: 100 }, next: 'Assign_1' } as any,
          {
            id: 'Assign_1',
            type: 'Assignment',
            label: 'Set Value',
            assignments: [{ variable: 'v_Count', value: '0' }],
            layout: { x: 150, y: 200 },
            next: 'End_1',
          } as any,
          { id: 'End_1', type: 'End', layout: { x: 250, y: 300 } } as any,
        ],
      };

      const mermaid = generator.generate(dsl);
      const metadata = extractMermaidMetadata(mermaid);

      // Should include layout for elements that have it
      expect(metadata.layoutMatches).toBe(3);
      expect(mermaid).toContain('layout: pos: 50,100');
      expect(mermaid).toContain('layout: pos: 150,200');
      expect(mermaid).toContain('layout: pos: 250,300');
    });

    it('includes conditionLogic in Mermaid Decision nodes', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'DecisionFlow',
        label: 'Decision Flow',
        processType: 'Autolaunched',
        startElement: 'Start_1',
        elements: [
          { id: 'Start_1', type: 'Start', next: 'Dec_1' } as any,
          {
            id: 'Dec_1',
            type: 'Decision',
            label: 'Check Status',
            conditionLogic: 'and',
            outcomes: [
              { name: 'Yes', next: 'End_1' },
              { name: 'No', isDefault: true, next: 'End_1' },
            ],
          } as any,
          { id: 'End_1', type: 'End' } as any,
        ],
      };

      const mermaid = generator.generate(dsl);
      const metadata = extractMermaidMetadata(mermaid);

      expect(metadata.conditionLogicMatches).toBe(1);
      expect(mermaid).toContain('conditionLogic: and');
    });

    it('includes filterLogic in Mermaid RecordUpdate nodes', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'UpdateFlow',
        label: 'Update Flow',
        processType: 'Autolaunched',
        startElement: 'Start_1',
        elements: [
          { id: 'Start_1', type: 'Start', next: 'Update_1' } as any,
          {
            id: 'Update_1',
            type: 'RecordUpdate',
            label: 'Update Account',
            object: 'Account',
            filterLogic: 'or',
            fields: { Status: 'Active' },
            next: 'End_1',
          } as any,
          { id: 'End_1', type: 'End' } as any,
        ],
      };

      const mermaid = generator.generate(dsl);
      const metadata = extractMermaidMetadata(mermaid);

      expect(metadata.filterLogicMatches).toBe(1);
      expect(mermaid).toContain('filterLogic: or');
    });
  });

  describe('Complete metadata preservation chain', () => {
    it('preserves all metadata through XML → DSL → Mermaid', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Complete Flow</label>
          <processType>Autolaunched</processType>
          <start>
            <locationX>50</locationX>
            <locationY>100</locationY>
            <connector>
              <targetReference>Dec_1</targetReference>
            </connector>
          </start>
          <decisions>
            <name>Dec_1</name>
            <label>Check Status</label>
            <conditionLogic>and</conditionLogic>
            <locationX>150</locationX>
            <locationY>200</locationY>
            <rules>
              <name>Rule_1</name>
              <connector>
                <targetReference>End</targetReference>
              </connector>
              <label>Default</label>
            </rules>
          </decisions>
        </Flow>`;

      // Stage 1: XML → DSL
      const dsl = parseFlowXmlText(xml);
      const dslInvariants = extractDslInvariants(dsl);

      // Verify XML parsing preserves metadata
      expect(
        dslInvariants.elements.find((e) => e.id === 'Start')?.layout,
      ).toEqual({ x: 50, y: 100 });
      expect(
        dslInvariants.elements.find((e) => e.id === 'Dec_1')?.conditionLogic,
      ).toBe('and');
      expect(
        dslInvariants.elements.find((e) => e.id === 'Dec_1')?.layout,
      ).toEqual({ x: 150, y: 200 });

      // Stage 2: DSL → Mermaid
      const mermaid = generator.generate(dsl);
      const mermaidMetadata = extractMermaidMetadata(mermaid);

      // Verify Mermaid generation includes metadata
      expect(mermaidMetadata.layoutMatches).toBeGreaterThanOrEqual(2);
      expect(mermaidMetadata.conditionLogicMatches).toBe(1);
      expect(mermaid).toContain('layout: pos: 50,100');
      expect(mermaid).toContain('layout: pos: 150,200');
      expect(mermaid).toContain('conditionLogic: and');

      // Verify no data loss in flowchart structure
      expect(mermaidMetadata.hasFlowchartHeader).toBe(true);
    });

    it('handles missing optional metadata gracefully', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Minimal Flow</label>
          <processType>Autolaunched</processType>
          <start>
            <connector>
              <targetReference>End</targetReference>
            </connector>
          </start>
        </Flow>`;

      const dsl = parseFlowXmlText(xml);
      const mermaid = generator.generate(dsl);

      // Should generate valid Mermaid without optional metadata
      expect(mermaid).toContain('flowchart TD');
      expect(mermaid).not.toContain('undefined');
      expect(mermaid).not.toContain('null');

      // Should still have basic structure
      const metadata = extractMermaidMetadata(mermaid);
      expect(metadata.hasFlowchartHeader).toBe(true);
    });

    it('preserves element connections through transformations', () => {
      const xml = `
        <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
          <apiVersion>60.0</apiVersion>
          <label>Edge Test</label>
          <processType>Autolaunched</processType>
          <start>
            <connector>
              <targetReference>Assign_1</targetReference>
            </connector>
          </start>
          <assignments>
            <name>Assign_1</name>
            <connector>
              <targetReference>End</targetReference>
            </connector>
          </assignments>
        </Flow>`;

      const dsl = parseFlowXmlText(xml);
      const invariants = extractDslInvariants(dsl);

      // Verify edge preservation in DSL
      expect(invariants.edges).toContainEqual({ from: 'Start', to: 'Assign_1' });
      expect(invariants.edges).toContainEqual({ from: 'Assign_1', to: 'End' });

      // Verify edges appear in Mermaid
      const mermaid = generator.generate(dsl);
      expect(mermaid).toContain('Start --> Assign_1');
      expect(mermaid).toContain('Assign_1 --> End');
    });
  });
});
