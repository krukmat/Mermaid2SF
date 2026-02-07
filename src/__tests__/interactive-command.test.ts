import * as fs from 'fs';
import * as path from 'path';

describe('interactive command flow coverage', () => {
  const tmpDirs: string[] = [];

  const makeTmpDir = () => {
    const dir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-interactive-'));
    tmpDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  afterAll(() => {
    tmpDirs.forEach((d) => {
      if (fs.existsSync(d)) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    });
  });

  it('runs compile mode and exits without generating outputs', async () => {
    const questions = [
      'Compile existing Mermaid file',
      path.join(process.cwd(), 'examples/poc/simple-flow.mmd'),
      'n',
    ];

    const questionMock = jest
      .fn()
      .mockImplementation(async () => (questions.length > 0 ? questions.shift() : ''));
    const closeMock = jest.fn();

    jest.doMock('readline/promises', () => ({
      createInterface: () => ({
        question: questionMock,
        close: closeMock,
      }),
    }));

    const { interactiveCommand } = await import('../cli/commands/interactive');
    await interactiveCommand.parseAsync([], { from: 'user' });

    expect(questionMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
  });

  it('runs wizard mode and writes mermaid file', async () => {
    const tmpDir = makeTmpDir();
    const mermaidOut = path.join(tmpDir, 'wizard-flow.mmd');
    const questions = [
      'Create new flow (wizard)',
      'Wizard_Test_Flow',
      '',
      'Screen',
      'y',
      'y',
      'n',
      mermaidOut,
      'n',
    ];

    const questionMock = jest
      .fn()
      .mockImplementation(async () => (questions.length > 0 ? questions.shift() : ''));
    const closeMock = jest.fn();

    jest.doMock('readline/promises', () => ({
      createInterface: () => ({
        question: questionMock,
        close: closeMock,
      }),
    }));

    const { interactiveCommand } = await import('../cli/commands/interactive');
    await interactiveCommand.parseAsync([], { from: 'user' });

    expect(closeMock).toHaveBeenCalled();
    expect(fs.existsSync(mermaidOut)).toBe(true);
  });

  it('defaults invalid mode to compile and generates outputs', async () => {
    const tmpDir = makeTmpDir();
    const questions = [
      'Invalid mode',
      path.join(process.cwd(), 'examples/poc/simple-flow.mmd'),
      'y',
      path.join(tmpDir, 'flows'),
      path.join(tmpDir, 'dsl'),
      path.join(tmpDir, 'docs'),
    ];

    const questionMock = jest
      .fn()
      .mockImplementation(async () => (questions.length > 0 ? questions.shift() : ''));

    jest.doMock('readline/promises', () => ({
      createInterface: () => ({
        question: questionMock,
        close: jest.fn(),
      }),
    }));

    const { interactiveCommand } = await import('../cli/commands/interactive');
    await interactiveCommand.parseAsync(['--debug'], { from: 'user' });

    expect(fs.existsSync(path.join(tmpDir, 'flows', 'simple-flow.flow-meta.xml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'dsl', 'simple-flow.flow.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'simple-flow.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'simple-flow.mmd'))).toBe(true);
  });
});
