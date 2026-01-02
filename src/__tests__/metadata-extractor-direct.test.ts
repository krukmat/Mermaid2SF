import { MetadataExtractor } from '../extractor/metadata-extractor';
import { MermaidNode } from '../types/mermaid';

describe('MetadataExtractor.extract() - Direct Tests', () => {
  let extractor: MetadataExtractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  it('should extract metadata from start node', () => {
    const node: MermaidNode = {
      id: 'A',
      label: 'START: Start Process',
      shape: 'round'
    };
    
    const result = extractor.extract(node);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('Start');
    expect(result.label).toBe('Start Process');
    expect(result.properties).toBeDefined();
  });

  it('should extract metadata from decision node', () => {
    const node: MermaidNode = {
      id: 'B',
      label: 'DECISION: Check Condition',
      shape: 'diamond'
    };
    
    const result = extractor.extract(node);
    
    expect(result.type).toBe('Decision');
    expect(result.label).toBe('Check Condition');
  });

  it('should extract metadata from assignment node', () => {
    const node: MermaidNode = {
      id: 'C',
      label: 'ASSIGNMENT: Set Variable',
      shape: 'square'
    };
    
    const result = extractor.extract(node);
    
    expect(result.type).toBe('Assignment');
    expect(result.label).toBe('Set Variable');
  });

  it('should extract metadata from screen node', () => {
    const node: MermaidNode = {
      id: 'D',
      label: 'SCREEN: User Input',
      shape: 'square'
    };
    
    const result = extractor.extract(node);
    
    expect(result.type).toBe('Screen');
    expect(result.label).toBe('User Input');
  });

  it('should extract metadata from fault node', () => {
    const node: MermaidNode = {
      id: 'E',
      label: 'FAULT: Error Handler',
      shape: 'round'
    };
    
    const result = extractor.extract(node);
    
    expect(result.type).toBe('Fault');
    expect(result.label).toBe('Error Handler');
  });

  it('should handle end node', () => {
    const node: MermaidNode = {
      id: 'F',
      label: 'END: Finish',
      shape: 'square'
    };
    
    const result = extractor.extract(node);
    
    expect(result.type).toBe('End');
    expect(result.label).toBe('Finish');
  });
});
