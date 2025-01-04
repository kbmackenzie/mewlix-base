const utils = require("./test-utils");

describe('mewlix graphic template', () => {
  beforeAll(async () => {
    const config = await utils.readConfig();
    const port = config.ports.graphic;
    await page.goto(`http://localhost:${port}/`);
    /* Wait for the 'mewlix' object to become globablly available.
     * 
     * Note: The 'mewlix' object is typically local.
     * It will become globally availble in test suites for testing purposes only. */
    await page.waitForFunction(
      () => !!globalThis.mewlix,
      { timeout: 5000 },
    );
  });

  describe('colors', () => {
    const colors = [
      { hexcode: '#ffffff', values: [255, 255, 255] },
      { hexcode: '#000000', values: [  0,   0,   0] },
      { hexcode: '#ff0000', values: [255,   0,   0] },
      { hexcode: '#00ff00', values: [  0, 255,   0] },
      { hexcode: '#0000ff', values: [  0,   0, 255] },
      { hexcode: '#f3008f', values: [243,   0, 143] },
      { hexcode: '#9d00ff', values: [157,   0, 255] },
      { hexcode: '#468c0f', values: [ 70, 140,  15] },
    ];

    it.each(colors)('parses a hexcode as a color', async ({ hexcode, values }) => {
      const color = await page.evaluate(
        (hexcode) => {
          const color = mewlix.lib['std.graphic'].get('hex')(hexcode);
          const { red, green, blue } = color.bindings;
          return [red, green, blue];
        },
        hexcode,
      );
      expect(color).toStrictEqual(values);
    });

    it('parses a short hexcode as a color', async () => {
      const color = await page.evaluate(
        (hexcode) => {
          const color = mewlix.lib['std.graphic'].get('hex')(hexcode);
          const { red, green, blue } = color.bindings;
          return [red, green, blue];
        },
        '#000',
      );
      expect(color).toStrictEqual([0, 0, 0]);
    });

    it.each(colors)('converts a color to a hexcode', async ({ hexcode, values }) => {
      const hex = await page.evaluate(
        ([r, g, b]) => {
          const Color = mewlix.lib['std.graphic'].get('Color');
          const color = mewlix.clowder.instantiate(Color)(r, g, b);
          return color.get('to_hex')();
        },
        values
      );
      expect(hex).toBe(hexcode);
    });
  });
});
