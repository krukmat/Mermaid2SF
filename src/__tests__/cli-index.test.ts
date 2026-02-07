describe('cli index bootstrap', () => {
  it('should register commands and call parse', async () => {
    const parseMock = jest.fn();
    jest.resetModules();

    jest.doMock('commander', () => {
      class FakeCommand {
        requiredOption() {
          return this;
        }
        option() {
          return this;
        }
        action() {
          return this;
        }
        name() {
          return this;
        }
        description() {
          return this;
        }
        version() {
          return this;
        }
        addCommand() {
          return this;
        }
        parse() {
          parseMock();
          return this;
        }
      }
      return { Command: FakeCommand };
    });

    await import('../cli/index');
    expect(parseMock).toHaveBeenCalled();
  });
});
