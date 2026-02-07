import * as fs from 'fs';
import * as path from 'path';
import { explainCommand } from '../cli/commands/explain';

describe('explain command action paths', () => {
  const tmpDirs: string[] = [];

  const makeTmpDir = () => {
    const dir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-explain-'));
    tmpDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    tmpDirs.forEach((d) => {
      if (fs.existsSync(d)) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    });
  });

  it('writes JSON summary and exits 0', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await explainCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--format', 'json'],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(writeSpy).toHaveBeenCalled();
  });

  it('fails with exit 2 on unsupported format', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await explainCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--format', 'xml'],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('fails with exit 2 in strict mode when warnings are present', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const tmpDir = makeTmpDir();
    const dslPath = path.join(tmpDir, 'warning-flow.json');

    const warningDsl = {
      version: 1,
      flowApiName: 'Warning_Flow',
      label: 'Warning Flow',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', next: 'End' },
        { id: 'End', type: 'End' },
        { id: 'Orphan', type: 'Assignment', assignments: [], next: 'End' },
      ],
    };
    fs.writeFileSync(dslPath, JSON.stringify(warningDsl, null, 2), 'utf-8');

    await explainCommand.parseAsync(['--input', dslPath, '--strict'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('fails with exit 2 when file is missing', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await explainCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/missing-file.mmd')],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
