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
});
