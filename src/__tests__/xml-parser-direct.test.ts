import { parseFlowXmlText } from '../reverse/xml-parser';

describe('XmlParser.parseFlowXmlText() - Direct Tests', () => {
  it('should parse simple Flow XML successfully', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>0</locationX>
        <locationY>0</locationY>
    </start>
</Flow>`;

    const result = parseFlowXmlText(xmlContent);

    expect(result).toBeDefined();
    expect(result.apiVersion).toBe('60.0');
    expect(result.label).toBe('Test Flow');
    expect(result.processType).toBe('AutoLaunchedFlow');
    expect(result.elements).toBeDefined();
    expect(Array.isArray(result.elements)).toBe(true);
  });

  it('should handle Flow XML with elements', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>0</locationX>
        <locationY>0</locationY>
    </start>
    <elements>
        <FlowElement>
            <elementType>Start</elementType>
            <elementName>Start</elementName>
        </FlowElement>
        <FlowElement>
            <elementType>End</elementType>
            <elementName>End</elementName>
        </FlowElement>
    </elements>
</Flow>`;

    const result = parseFlowXmlText(xmlContent);

    expect(result).toBeDefined();
    expect(result.elements).toBeDefined();
    expect(Array.isArray(result.elements)).toBe(true);
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('should handle XML content without throwing', () => {
    const xmlContent = `invalid xml content`;

    expect(() => {
      parseFlowXmlText(xmlContent);
    }).not.toThrow(); // Should handle gracefully without crashing
  });

  describe('F5.1: Layout parsing', () => {
    it('extracts locationX and locationY from Assignment', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Assign_1</targetReference>
        </connector>
    </start>
    <assignments>
        <name>Assign_1</name>
        <label>Initialize</label>
        <locationX>100</locationX>
        <locationY>200</locationY>
        <assignmentItems>
            <assignToReference>v_Test</assignToReference>
            <operator>Assign</operator>
            <value>
                <stringValue>1</stringValue>
            </value>
        </assignmentItems>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </assignments>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const assign = dsl.elements.find((e) => e.type === 'Assignment');
      expect(assign).toBeDefined();
      expect(assign?.layout).toEqual({ x: 100, y: 200 });
    });

    it('extracts locationX and locationY from Decision', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Dec_1</targetReference>
        </connector>
    </start>
    <decisions>
        <name>Dec_1</name>
        <label>Check Value</label>
        <locationX>50</locationX>
        <locationY>100</locationY>
        <rules>
            <name>True</name>
            <connector>
                <targetReference>End_1</targetReference>
            </connector>
            <label>True</label>
        </rules>
    </decisions>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const decision = dsl.elements.find((e) => e.type === 'Decision');
      expect(decision).toBeDefined();
      expect(decision?.layout).toEqual({ x: 50, y: 100 });
    });

    it('extracts locationX and locationY from Start element', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>100</locationX>
        <locationY>150</locationY>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </start>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const start = dsl.elements.find((e) => e.type === 'Start');
      expect(start).toBeDefined();
      expect(start?.layout).toEqual({ x: 100, y: 150 });
    });

    it('omits layout when locationX/locationY missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </start>
    <assignments>
        <name>Assign_1</name>
        <label>No Layout</label>
        <assignmentItems>
            <assignToReference>v_Test</assignToReference>
            <operator>Assign</operator>
            <value>
                <stringValue>1</stringValue>
            </value>
        </assignmentItems>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </assignments>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const assign = dsl.elements.find((e) => e.type === 'Assignment');
      expect(assign).toBeDefined();
      expect(assign?.layout).toBeUndefined();
    });

    it('extracts layout from multiple element types', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Screen_1</targetReference>
        </connector>
    </start>
    <screens>
        <name>Screen_1</name>
        <label>Collect Data</label>
        <locationX>50</locationX>
        <locationY>100</locationY>
        <connector>
            <targetReference>Update_1</targetReference>
        </connector>
    </screens>
    <recordUpdates>
        <name>Update_1</name>
        <label>Update Record</label>
        <locationX>50</locationX>
        <locationY>200</locationY>
        <object>Account</object>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </recordUpdates>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const screen = dsl.elements.find((e) => e.type === 'Screen');
      const update = dsl.elements.find((e) => e.type === 'RecordUpdate');
      expect(screen?.layout).toEqual({ x: 50, y: 100 });
      expect(update?.layout).toEqual({ x: 50, y: 200 });
    });
  });

  describe('F5.2: Decision conditionLogic parsing', () => {
    it('extracts conditionLogic when present', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Dec_1</targetReference>
        </connector>
    </start>
    <decisions>
        <name>Dec_1</name>
        <label>Check Value</label>
        <locationX>50</locationX>
        <locationY>100</locationY>
        <conditionLogic>and</conditionLogic>
        <rules>
            <name>True</name>
            <connector>
                <targetReference>End_1</targetReference>
            </connector>
            <label>True</label>
        </rules>
    </decisions>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const decision = dsl.elements.find((e) => e.type === 'Decision');
      expect(decision).toBeDefined();
      expect(decision?.conditionLogic).toBe('and');
    });

    it('extracts conditionLogic as or', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Dec_1</targetReference>
        </connector>
    </start>
    <decisions>
        <name>Dec_1</name>
        <label>Check Value</label>
        <conditionLogic>or</conditionLogic>
        <rules>
            <name>Outcome1</name>
            <connector>
                <targetReference>End_1</targetReference>
            </connector>
            <label>Outcome1</label>
        </rules>
    </decisions>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const decision = dsl.elements.find((e) => e.type === 'Decision');
      expect(decision).toBeDefined();
      expect(decision?.conditionLogic).toBe('or');
    });

    it('omits conditionLogic when not present', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Dec_1</targetReference>
        </connector>
    </start>
    <decisions>
        <name>Dec_1</name>
        <label>Check Value</label>
        <rules>
            <name>True</name>
            <connector>
                <targetReference>End_1</targetReference>
            </connector>
            <label>True</label>
        </rules>
    </decisions>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const decision = dsl.elements.find((e) => e.type === 'Decision');
      expect(decision).toBeDefined();
      expect(decision?.conditionLogic).toBeUndefined();
    });

    it('includes both layout and conditionLogic', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <connector>
            <targetReference>Dec_1</targetReference>
        </connector>
    </start>
    <decisions>
        <name>Dec_1</name>
        <label>Check Multiple</label>
        <locationX>100</locationX>
        <locationY>200</locationY>
        <conditionLogic>and</conditionLogic>
        <rules>
            <name>Outcome1</name>
            <connector>
                <targetReference>End_1</targetReference>
            </connector>
            <label>Outcome1</label>
        </rules>
    </decisions>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const decision = dsl.elements.find((e) => e.type === 'Decision');
      expect(decision).toBeDefined();
      expect(decision?.layout).toEqual({ x: 100, y: 200 });
      expect(decision?.conditionLogic).toBe('and');
    });
  });

  describe('F5.3: RecordUpdate filterLogic parsing', () => {
    it('extracts filterLogic when present', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <connector>
            <targetReference>Update_1</targetReference>
        </connector>
    </start>
    <recordUpdates>
        <name>Update_1</name>
        <label>Update Record</label>
        <object>Account</object>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <stringValue>001xx000003DHP</stringValue>
        </filters>
        <inputAssignments>
            <field>Name</field>
            <stringValue>Updated Name</stringValue>
        </inputAssignments>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </recordUpdates>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const update = dsl.elements.find((e) => e.type === 'RecordUpdate');
      expect(update).toBeDefined();
      expect(update?.filterLogic).toBe('and');
    });

    it('extracts filterLogic as or', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
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
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <stringValue>001xx000003DHP</stringValue>
        </filters>
        <inputAssignments>
            <field>Name</field>
            <stringValue>Updated Name</stringValue>
        </inputAssignments>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </recordUpdates>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const update = dsl.elements.find((e) => e.type === 'RecordUpdate');
      expect(update).toBeDefined();
      expect(update?.filterLogic).toBe('or');
    });

    it('omits filterLogic when not present', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <connector>
            <targetReference>Update_1</targetReference>
        </connector>
    </start>
    <recordUpdates>
        <name>Update_1</name>
        <label>Update Record</label>
        <object>Account</object>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <stringValue>001xx000003DHP</stringValue>
        </filters>
        <inputAssignments>
            <field>Name</field>
            <stringValue>Updated Name</stringValue>
        </inputAssignments>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </recordUpdates>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const update = dsl.elements.find((e) => e.type === 'RecordUpdate');
      expect(update).toBeDefined();
      expect(update?.filterLogic).toBeUndefined();
    });

    it('includes layout and filterLogic together', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Screen</processType>
    <start>
        <connector>
            <targetReference>Update_1</targetReference>
        </connector>
    </start>
    <recordUpdates>
        <name>Update_1</name>
        <label>Update with Layout</label>
        <locationX>150</locationX>
        <locationY>250</locationY>
        <object>Account</object>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <stringValue>001xx000003DHP</stringValue>
        </filters>
        <inputAssignments>
            <field>Name</field>
            <stringValue>Updated Name</stringValue>
        </inputAssignments>
        <connector>
            <targetReference>End_1</targetReference>
        </connector>
    </recordUpdates>
</Flow>`;
      const dsl = parseFlowXmlText(xml);
      const update = dsl.elements.find((e) => e.type === 'RecordUpdate');
      expect(update).toBeDefined();
      expect(update?.layout).toEqual({ x: 150, y: 250 });
      expect(update?.filterLogic).toBe('and');
    });
  });
});
