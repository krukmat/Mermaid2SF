import * as fs from 'fs';
import { runCompileOnce } from '../../cli/commands/compile';
import { MermaidParser } from '../../parser/mermaid-parser';
import { MetadataExtractor } from '../../extractor/metadata-extractor';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
import { FlowValidator } from '../../validator/flow-validator';
import { FlowXmlGenerator } from '../../generators/flow-xml-generator';
import { DocsGenerator } from '../../generators/docs-generator';
import { validateDsl } from '../../validation/flow-rules';

jest.mock('fs');
jest.mock('../../utils/logger');
jest.mock('../../parser/mermaid-parser');
jest.mock('../../extractor/metadata-extractor');
jest.mock('../../dsl/intermediate-model-builder');
jest.mock('../../validator/flow-validator');
jest.mock('../../generators/flow-xml-generator');
jest.mock('../../generators/docs-generator');
jest.mock('../../validation/flow-rules');

describe('compile command', () => {
  const mockInputPath = '/test/input.mmd';
  const mockOutputDir = '/test/output';
  const mockMermaidContent = `
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
`;

  const mockGraph = {
    nodes: [
      { id: 'A', label: 'Start', shape: 'round' },
      { id: 'B', label: 'Process', shape: 'square' },
      { id: 'C', label: 'End', shape: 'square' }
    ],
    edges: [
      { from: 'A', to: 'B', label: '', arrowType: 'solid' },
      { from: 'B', to: 'C', label: '', arrowType: 'solid' }
    ],
    direction: 'TD' as const
  };

  const mockDsl = {
    apiVersion: '60.0',
    label: 'Test Flow',
    processType: 'AutoLaunchedFlow',
    startElement: 'A',
    elements: [
      {
        id: 'A',
        type: 'Start' as const,
        apiName: 'Start',
        label: 'Start'
      },
      {
        id: 'B',
        type: 'Assignment' as const,
        apiName: 'Assignment_1',
        label: 'Assignment 1',
        assignments: []
      },
      {
        id: 'C',
        type: 'End' as const,
        apiName: 'End',
        label: 'End'
      }
    ]
  };

  const mockValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockMermaidContent);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    (MermaidParser.prototype.parse as jest.Mock).mockReturnValue(mockGraph);
    (MetadataExtractor.prototype.extract as jest.Mock).mockReturnValue({});
    (IntermediateModelBuilder.prototype.build as jest.Mock).mockReturnValue(mockDsl);
    (FlowValidator.prototype.validate as jest.Mock).mockReturnValue(mockValidationResult);
    (FlowXmlGenerator.prototype.generate as jest.Mock).mockReturnValue('<?xml version="1.0" encoding="UTF-8"?><Flow></Flow>');
    (DocsGenerator.prototype.generateMarkdown as jest.Mock).mockReturnValue('# Test Flow');
    (DocsGenerator.prototype.generateMermaidDiagram as jest.Mock).mockReturnValue('flowchart TD A-->B');
    (validateDsl as jest.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
  });

  describe('runCompileOnce', () => {
    it('should compile successfully with minimal options', async () => {
      const options = {
        input: mockInputPath,
        verbose: false,
        debug: false,
        strict: false
      };

      const result = await runCompileOnce(options);

      expect(result).toBe(0);
      expect(fs.existsSync).toHaveBeenCalledWith(mockInputPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockInputPath, 'utf-8');
      expect(MermaidParser.prototype.parse).toHaveBeenCalledWith(mockMermaidContent);
    });

    it('should handle missing input file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const options = {
        input: '/nonexistent/file.mmd',
        verbose: false,
        debug: false
      };

      await expect(runCompileOnce(options)).rejects.toThrow('Input file not found');
    });

    it('should generate Flow XML when outFlow option is provided', async () => {
      const options = {
        input: mockInputPath,
        outFlow: mockOutputDir,
        verbose: false,
        debug: false,
        strict: false
      };

      await runCompileOnce(options);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('.flow-meta.xml');
      expect(callArgs[1]).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should generate DSL JSON when outJson option is provided', async () => {
      const options = {
        input: mockInputPath,
        outJson: mockOutputDir,
        dslFormat: 'json',
        verbose: false,
        debug: false,
        strict: false
      };

      await runCompileOnce(options);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = (fs.writeFileSync as jest.Mock).mock.calls.find((args) =>
        args[0].includes('.flow.json')
      );
      expect(callArgs).toBeDefined();
    });

    it('should generate DSL YAML when outJson option is provided', async () => {
      const options = {
        input: mockInputPath,
        outJson: mockOutputDir,
        dslFormat: 'yaml',
        verbose: false,
        debug: false,
        strict: false
      };

      await runCompileOnce(options);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = (fs.writeFileSync as jest.Mock).mock.calls.find((args) =>
        args[0].includes('.flow.yaml')
      );
      expect(callArgs).toBeDefined();
    });

    it('should generate documentation when outDocs option is provided', async () => {
      const options = {
        input: mockInputPath,
        outDocs: mockOutputDir,
        verbose: false,
        debug: false,
        strict: false
      };

      await runCompileOnce(options);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(DocsGenerator.prototype.generateMarkdown).toHaveBeenCalled();
      expect(DocsGenerator.prototype.generateMermaidDiagram).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const mockErrorValidation = {
        valid: false,
        errors: [{ code: 'TEST_ERROR', message: 'Test error' }],
        warnings: []
      };
      (FlowValidator.prototype.validate as jest.Mock).mockReturnValue(mockErrorValidation);

      const options = {
        input: mockInputPath,
        verbose: false,
        debug: false,
        strict: false
      };

      await expect(runCompileOnce(options)).rejects.toThrow('Validation failed');
    });

    it('should treat warnings as errors in strict mode', async () => {
      const mockWarningValidation = {
        valid: true,
        errors: [],
        warnings: [{ code: 'TEST_WARNING', message: 'Test warning' }]
      };
      (FlowValidator.prototype.validate as jest.Mock).mockReturnValue(mockWarningValidation);

      const options = {
        input: mockInputPath,
        strict: true,
        verbose: false,
        debug: false
      };

      await expect(runCompileOnce(options)).rejects.toThrow('strict mode');
    });

    it('should create output directories when they do not exist', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return path === mockInputPath || path === mockOutputDir;
      });
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      const options = {
        input: mockInputPath,
        outFlow: '/nonexistent/dir',
        verbose: false,
        debug: false,
        strict: false
      };

      await runCompileOnce(options);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });
});
