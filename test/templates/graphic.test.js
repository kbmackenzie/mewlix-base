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
          const { red, green, blue } = color.home;
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
          const { red, green, blue } = color.home;
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

    const clampInput = [
      { input: [ 1,  2], min: [0, 0], max: [10, 10], expected: [1, 2] },
      { input: [ 3,  4], min: [0, 0], max: [ 3,  3], expected: [3, 3] },
      { input: [10,  3], min: [0, 0], max: [ 4,  4], expected: [4, 3] },
      { input: [ 0,  3], min: [1, 1], max: [ 2,  2], expected: [1, 2] },
      { input: [-1, -4], min: [0, 2], max: [ 3,  3], expected: [0, 2] },
      { input: [12, 20], min: [3, 3], max: [ 3,  4], expected: [3, 4] },
      { input: [ 4,  3], min: [0, 3], max: [ 4,  3], expected: [4, 3] },
    ];

    test.each(clampInput)('vector2 clamp', async ({ input, min, max, expected }) => {
      const result = await page.evaluate(
        ([inputX, inputY], [minX, minY], [maxX, maxY]) => {
          const Vector2 = mewlix.lib['std.graphic'].get('Vector2');
          const input = mewlix.clowder.instantiate(Vector2)(inputX, inputY);
          const min   = mewlix.clowder.instantiate(Vector2)(minX, minY);
          const max   = mewlix.clowder.instantiate(Vector2)(maxX, maxY);
          const result = input.get('clamp')(min, max);
          return [result.get('x'), result.get('y')];
        },
        input, min, max
      );
      expect(result).toStrictEqual(expected);
    });
  });

  describe('rectangle', () => {
    const pointTests = [
      { rect: [1, 1, 20, 20], point: [ 3,  4], contained: true  },
      { rect: [1, 1, 20, 20], point: [-1,  4], contained: false },
      { rect: [1, 1, 20, 20], point: [ 3, -1], contained: false },
      { rect: [1, 1, 20, 20], point: [10, 10], contained: true  },
      { rect: [1, 1, 20, 20], point: [ 1, 20], contained: true  },
      { rect: [1, 1, 20, 20], point: [20,  1], contained: true  },
      { rect: [1, 1, 20, 20], point: [21,  1], contained: false },
      { rect: [1, 1, 20, 20], point: [ 1, 30], contained: false },
      { rect: [1, 1,  5,  5], point: [ 1,  6], contained: false },
      { rect: [1, 1,  5,  5], point: [ 6,  1], contained: false },
      { rect: [1, 1,  5,  5], point: [ 3,  4], contained: true  },
    ];

    test.each(pointTests)('rect contains point', async ({ rect, point, contained }) => {
      const result = await page.evaluate(
        ([ax, ay, aw, ah], [px, py]) => {
          const Rectangle = mewlix.lib['std.graphic'].get('Rectangle');
          const Vector2   = mewlix.lib['std.graphic'].get('Vector2');
          const rect  = mewlix.clowder.instantiate(Rectangle)(ax, ay, aw, ah);
          const point = mewlix.clowder.instantiate(Vector2)(px, py);
          return rect.get('contains')(point);
        },
        rect, point
      );
      expect(result).toBe(contained);
    });

    const collisionTests = [
      { a: [ 1,  2, 20, 20], b: [ 3,  3, 20, 20], collides: true  },
      { a: [ 1,  2, 20, 20], b: [ 0,  1,  1,  1], collides: false },
      { a: [ 1,  2, 20, 20], b: [21, 21,  1,  1], collides: false },
      { a: [ 1,  2,  5,  5], b: [ 2,  2,  1,  1], collides: true  },
      { a: [-5,  2,  5,  5], b: [ 2,  2,  1,  1], collides: false },
      { a: [ 3,  4, 30, 40], b: [12, 15, 20, 30], collides: true  },
      { a: [ 3,  4, 30, 40], b: [ 2, -9,  5,  5], collides: false },
      { a: [ 3,  4, 30, 40], b: [12, 15, 20, 30], collides: true  },
      { a: [ 4,  3, 30, 40], b: [34,  3, 30, 30], collides: false },
    ];

    test.each(collisionTests)('rect collides with another', async ({ a, b, collides }) => {
      const result = await page.evaluate(
        ([ax, ay, aw, ah], [bx, by, bw, bh]) => {
          const Rectangle = mewlix.lib['std.graphic'].get('Rectangle');
          const a = mewlix.clowder.instantiate(Rectangle)(ax, ay, aw, ah);
          const b = mewlix.clowder.instantiate(Rectangle)(bx, by, bw, bh);
          return a.get('collides')(b);
        },
        a, b
      );
      expect(result).toBe(collides);
    });
  });
});
