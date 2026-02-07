import * as fs from 'fs';
import * as path from 'path';
import { compileCommand } from '../cli/commands/compile';
import { lintCommand } from '../cli/commands/lint';
import { decompileCommand } from '../cli/commands/decompile';
import { FlowValidator } from '../validator/flow-validator';

describe('CLI commands coverage', () => {
  const tmpRoots: string[] = [];

  const makeTmpDir = (prefix: string) => {
    const dir = fs.mkdtempSync(path.join(process.cwd(), prefix));
    tmpRoots.push(dir);
    return dir;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    for (const dir of tmpRoots) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('compile command generates XML + JSON outputs', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const outRoot = makeTmpDir('tmp-compile-');
    const outFlow = path.join(outRoot, 'flow');
    const outJson = path.join(outRoot, 'json');

    await compileCommand.parseAsync(
      [
        '--input',
        path.join(process.cwd(), 'examples/poc/simple-flow.mmd'),
        '--out-flow',
        outFlow,
        '--out-json',
        outJson,
      ],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(fs.existsSync(path.join(outFlow, 'simple-flow.flow-meta.xml'))).toBe(true);
    expect(fs.existsSync(path.join(outJson, 'simple-flow.flow.json'))).toBe(true);
  });

  it('compile command generates docs outputs', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const outRoot = makeTmpDir('tmp-compile-docs-');
    const outDocs = path.join(outRoot, 'docs');

    await compileCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--out-docs', outDocs],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(fs.existsSync(path.join(outDocs, 'simple-flow.md'))).toBe(true);
    expect(fs.existsSync(path.join(outDocs, 'simple-flow.mmd'))).toBe(true);
  });

  it('lint command passes for valid Mermaid file', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await lintCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd')],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('decompile command generates DSL JSON and Mermaid outputs', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const outRoot = makeTmpDir('tmp-decompile-');
    const outJson = path.join(outRoot, 'json');
    const outMermaid = path.join(outRoot, 'mmd');

    await decompileCommand.parseAsync(
      [
        '--input',
        path.join(process.cwd(), 'examples/output/complete-flow.flow-meta.xml'),
        '--out-json',
        outJson,
        '--out-mermaid',
        outMermaid,
      ],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(fs.existsSync(path.join(outJson, 'complete-flow.flow.json'))).toBe(true);
    expect(fs.existsSync(path.join(outMermaid, 'complete-flow.mmd'))).toBe(true);
  });

  it('compile command fails when input does not exist', async () => {
    await expect(
      compileCommand.parseAsync(
        ['--input', path.join(process.cwd(), 'examples/poc/does-not-exist.mmd')],
        { from: 'user' },
      ),
    ).rejects.toThrow(/Input file not found/);
  });

  it('lint command fails when input is not .mmd file or directory', async () => {
    const txtFile = path.join(makeTmpDir('tmp-lint-invalid-'), 'file.txt');
    fs.writeFileSync(txtFile, 'hello', 'utf-8');

    await expect(lintCommand.parseAsync(['--input', txtFile], { from: 'user' })).rejects.toThrow(
      /Input must be a \.mmd file or directory containing \.mmd files/,
    );
  });

  it('decompile command exits with code 2 when input does not exist', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await decompileCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/output/not-found.flow-meta.xml')],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('decompile command succeeds without output directories', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await decompileCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/output/complete-flow.flow-meta.xml')],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('compile command supports debug mode path', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await compileCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--debug'],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(fs.existsSync(path.join(process.cwd(), '.debug', 'simple-flow.debug.dsl.json'))).toBe(
      true,
    );
  });

  it('compile command fails in strict mode when warnings are present', async () => {
    jest.spyOn(FlowValidator.prototype, 'validate').mockReturnValue({
      valid: true,
      errors: [],
      warnings: [{ code: 'WARN_TEST', message: 'warning for strict mode' }],
    } as any);

    await expect(
      compileCommand.parseAsync(
        ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--strict'],
        { from: 'user' },
      ),
    ).rejects.toThrow(/strict mode/i);
  });

  it('compile command fails when validator returns errors', async () => {
    jest.spyOn(FlowValidator.prototype, 'validate').mockReturnValue({
      valid: false,
      errors: [{ code: 'ERR_TEST', message: 'validation error' }],
      warnings: [],
    } as any);

    await expect(
      compileCommand.parseAsync(
        ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd')],
        { from: 'user' },
      ),
    ).rejects.toThrow(/validation failed/i);
  });

  it('lint command on directory without .mmd files exits 0', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const dir = makeTmpDir('tmp-empty-dir-');
    fs.writeFileSync(path.join(dir, 'note.txt'), 'hello', 'utf-8');

    await lintCommand.parseAsync(['--input', dir], { from: 'user' });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('lint command in strict mode exits 1 when validator returns warnings', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    jest.spyOn(FlowValidator.prototype, 'validate').mockReturnValue({
      valid: true,
      errors: [],
      warnings: [{ code: 'WARN_TEST', message: 'warning for strict mode' }],
    } as any);

    await lintCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--strict'],
      { from: 'user' },
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('lint command marks file as failed when parser throws', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const dir = makeTmpDir('tmp-lint-bad-');
    const badFile = path.join(dir, 'bad.mmd');
    fs.writeFileSync(badFile, 'this is not a mermaid graph', 'utf-8');

    await lintCommand.parseAsync(['--input', badFile], { from: 'user' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
