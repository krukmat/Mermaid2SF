import * as fs from 'fs';
import * as path from 'path';

describe('CLI watch mode coverage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.dontMock('fs');
  });

  it('compile command in watch mode registers fs.watch', async () => {
    const watchMock = jest.fn(() => ({ close: jest.fn() }));

    jest.doMock('fs', () => {
      const actual = jest.requireActual('fs');
      return {
        ...actual,
        watch: watchMock,
      };
    });

    const { compileCommand } = await import('../cli/commands/compile');
    await compileCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--watch'],
      { from: 'user' },
    );

    expect(watchMock).toHaveBeenCalled();
  });

  it('lint command in watch mode registers fs.watch for file input', async () => {
    const watchMock = jest.fn(() => ({ close: jest.fn() }));

    jest.doMock('fs', () => {
      const actual = jest.requireActual('fs');
      return {
        ...actual,
        watch: watchMock,
      };
    });

    const { lintCommand } = await import('../cli/commands/lint');
    await lintCommand.parseAsync(
      ['--input', path.join(process.cwd(), 'examples/poc/simple-flow.mmd'), '--watch'],
      { from: 'user' },
    );

    expect(watchMock).toHaveBeenCalled();
  });

  it('lint command in watch mode registers fs.watch for directory input', async () => {
    const watchMock = jest.fn(() => ({ close: jest.fn() }));
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-watch-dir-'));

    try {
      jest.doMock('fs', () => {
        const actual = jest.requireActual('fs');
        return {
          ...actual,
          watch: watchMock,
        };
      });

      const { lintCommand } = await import('../cli/commands/lint');
      await lintCommand.parseAsync(['--input', tmpDir, '--watch'], { from: 'user' });

      expect(watchMock).toHaveBeenCalled();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
