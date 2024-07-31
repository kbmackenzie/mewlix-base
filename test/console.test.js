describe('mewlix console template', () => {
  beforeAll(async () => {
    await page.goto('http://localhost:8080/');
    /* Wait for the 'mewlix' object to become globablly available.
     * 
     * Note: The 'mewlix' object is typically local.
     * It will become globally availble in test suites for testing purposes only. */
    await page.waitForFunction(
      () => !!globalThis.mewlix,
      { timeout: 5000 },
    );
  });

  /* Note: A global 'mewlix' object will be made available just for these tests.
   * This is set up by the 'test.sh' script.
   * A global 'mewlix' object does not normally exist. */

  it('should set console title', async () => {
    const hasSetName = await page.evaluate(() => {
      const name = 'console test suite';
      globalThis.mewlix.Console.box().name(name);
      return document.getElementById('project-name').innerText === name;
    });
    expect(hasSetName).toBe(true);
  });

  it('should toggle input highlight', async () => {
    const hasSetHighlight = await page.evaluate(() => {
      globalThis.mewlix.Console.box().highlight(true);
      return document.getElementById('show-highlight').checked;
    });
    expect(hasSetHighlight).toBe(true);
  });

  it('should set console color', async () => {
    const hasSetColor = await page.evaluate(() => {
      const color = '#fb2bff';
      globalThis.mewlix.Console.box().set_color(color);
      return document.getElementById('select-color').value === color;
    });
    expect(hasSetColor).toBe(true);
  });

  it('should set accepted file extensions', async () => {
    const hasSetExtensions = await page.evaluate(() => {
      const extensions = mewlix.api.shelf('.txt', '.md');
      globalThis.mewlix.Console.box().accepted_files(extensions);
      return document.getElementById('file-input').accept === extensions.toArray().join(', ');
    });
    expect(hasSetExtensions).toBe(true);
  });

  it('should write a message to the console', async () => {
    const message = 'hello world!';
    const lastMessage = await page.evaluate(
      (message) => {
        globalThis.mewlix.meow(message);
        return document.getElementById('console-lines').lastChild?.innerText;
      },
      message
    );
    expect(lastMessage).toBe(message);
  });

  it('should clear the console', async () => {
    const hasCleared = await page.evaluate(() => {
      globalThis.mewlix.Console.box().clear();
      return document.getElementById('console-lines').childNodes.length === 0;
    });
    expect(hasCleared).toBe(true);
  });
});
