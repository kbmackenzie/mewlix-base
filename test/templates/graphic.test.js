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

  describe('vector2', () => {
    const inputs = [
      { a: [1, 2], b: [1, 3], sum: [2, 5], product: [1, 6]  , dot: 7  , distance: 1    },
      { a: [3, 3], b: [2, 4], sum: [5, 7], product: [6, 12] , dot: 18 , distance: 1.41 },
      { a: [3, 4], b: [3, 4], sum: [6, 8], product: [9, 16] , dot: 25 , distance: 0    },
      { a: [3, 4], b: [1, 1], sum: [4, 5], product: [3, 4]  , dot: 7  , distance: 3.61 },
      { a: [1, 1], b: [3, 4], sum: [4, 5], product: [3, 4]  , dot: 7  , distance: 3.61 },
    ];

    test.each(inputs)('vector2 addition', async ({ a, b, sum }) => {
      const result = await page.evaluate(
        ([ax, ay], [bx, by]) => {
          const Vector2 = mewlix.lib['std.graphic'].get('Vector2');
          const a = mewlix.clowder.instantiate(Vector2)(ax, ay);
          const b = mewlix.clowder.instantiate(Vector2)(bx, by);
          const result = a.get('add')(b);
          return [result.get('x'), result.get('y')];
        },
        a, b
      );
      expect(result).toStrictEqual(sum);
    });

    test.each(inputs)('vector2 multiplication', async ({ a, b, product }) => {
      const result = await page.evaluate(
        ([ax, ay], [bx, by]) => {
          const Vector2 = mewlix.lib['std.graphic'].get('Vector2');
          const a = mewlix.clowder.instantiate(Vector2)(ax, ay);
          const b = mewlix.clowder.instantiate(Vector2)(bx, by);
          const result = a.get('mul')(b);
          return [result.get('x'), result.get('y')];
        },
        a, b
      );
      expect(result).toStrictEqual(product);
    });

    test.each(inputs)('vector2 dot', async ({ a, b, dot }) => {
      const result = await page.evaluate(
        ([ax, ay], [bx, by]) => {
          const Vector2 = mewlix.lib['std.graphic'].get('Vector2');
          const a = mewlix.clowder.instantiate(Vector2)(ax, ay);
          const b = mewlix.clowder.instantiate(Vector2)(bx, by);
          return a.get('dot')(b);
        },
        a, b
      );
      expect(result).toBe(dot);
    });

    test.each(inputs)('vector2 distance', async ({ a, b, distance }) => {
      const result = await page.evaluate(
        ([ax, ay], [bx, by]) => {
          function to2Places(number) {
            return Math.round(number * 100) / 100;
          }
          const Vector2 = mewlix.lib['std.graphic'].get('Vector2');
          const a = mewlix.clowder.instantiate(Vector2)(ax, ay);
          const b = mewlix.clowder.instantiate(Vector2)(bx, by);
          const result = a.get('distance')(b);
          return to2Places(result);
        },
        a, b
      );
      expect(result).toBe(distance);
    });
  });
});
