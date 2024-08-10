const utils = require("./test-utils");

describe('mewlix base library', () => {
  beforeAll(async () => {
    const config = await utils.readConfig();
    const port = config.ports.console;
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

  describe('shelf operations', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5, 6]          },
      { input: ['hello', 'world']          },
      { input: [1, 2, 3, 'hello', 4, 5, 6] },
      { input: [[1, 2, 3], [4, 5, 6]]      },
    ];

    it('creates an empty shelf', async () => {
      const output = await page.evaluate(() => {
        const shelf = mewlix.shelf.create([]);
        return {
          length: mewlix.collections.length(shelf),
          isEmpty: mewlix.lib['std'].get('empty')(shelf),
        };
      });
      expect(output.length).toBe(0);
      expect(output.isEmpty).toBe(true);
    });

    it.each(inputs)('creates a shelf from an array', async ({ input }) => {
      const output = await page.evaluate(
        (array) => {
          const mewlix = globalThis.mewlix;

          const shelf = mewlix.shelf.create(array);
          return {
            length: mewlix.collections.length(shelf),
            head: mewlix.shelf.peek(shelf),
            array: mewlix.shelf.toArray(shelf),
          };
        },
        input,
      );
      expect(output.length).toBe(input.length);
      expect(output.array).toStrictEqual(input);
      expect(output.head).toStrictEqual(input[input.length - 1]);
    });

    it.each(inputs)('creates a shelf and reverses it', async ({ input }) => {
      const output = await page.evaluate(
        (array) => {
          const mewlix = globalThis.mewlix;

          const shelf = mewlix.shelf.create(array);
          const reversed = mewlix.lib['std'].get('reverse')(shelf);
          return {
            head: mewlix.shelf.peek(reversed),
            array: mewlix.shelf.toArray(reversed),
          };
        },
        input
      );
      expect(output.head).toStrictEqual(input[0]);
      expect(output.array).toStrictEqual([...input].reverse());
    });

    it.each(inputs)('creates a shelf and inserts items into it', async ({ input }) => {
      const middle = Math.floor(input.length / 2);
      const output = await page.evaluate(
        (array, middle) => {
          const mewlix = globalThis.mewlix;

          const shelf = mewlix.shelf.create(array);

          const ahead   = mewlix.lib['std'].get('insert')(shelf, ':3',  0);
          const behind  = mewlix.lib['std'].get('insert')(shelf, ':3', -1);
          const second  = mewlix.lib['std'].get('insert')(shelf, ':3',  1);
          const between = mewlix.lib['std'].get('insert')(shelf, ':3', middle);

          return {
            ahead: mewlix.shelf.toArray(ahead),
            behind: mewlix.shelf.toArray(behind),
            second: mewlix.shelf.toArray(second),
            between: mewlix.shelf.toArray(between),
          };
        },
        input,
        middle,
      );
      expect(output.ahead).toStrictEqual([...input, ':3']);
      expect(output.behind).toStrictEqual([':3', ...input]);

      const second = input.toSpliced(input.length - 2, 0, ':3');
      expect(output.second).toStrictEqual(second);

      const between = input.toSpliced(input.length - middle, 0, ':3');
      expect(output.between).toStrictEqual(between);
    });

    it.each(inputs)('creates a shelf and removes items from it', async ({ input }) => {
      const middle = Math.floor(input.length / 2);
      const output = await page.evaluate(
        (array, middle) => {
          const mewlix = globalThis.mewlix;
          const shelf = mewlix.shelf.create(array);

          const tail = mewlix.lib['std'].get('remove')(shelf,  0);
          const init = mewlix.lib['std'].get('remove')(shelf, -1);
          const second = mewlix.lib['std'].get('remove')(shelf, 1);
          const between = mewlix.lib['std'].get('remove')(shelf, middle);

          return {
            tail: mewlix.shelf.toArray(tail),
            init: mewlix.shelf.toArray(init),
            second: mewlix.shelf.toArray(second),
            between: mewlix.shelf.toArray(between),
          };
        },
        input,
        middle,
      );
      expect(output.tail).toStrictEqual(input.toSpliced(input.length - 1, 1));
      expect(output.init).toStrictEqual(input.toSpliced(0, 1));

      const second = input.toSpliced(input.length - 2, 1);
      expect(output.second).toStrictEqual(second);

      const between = input.toSpliced(input.length - middle, 1);
      expect(output.between).toStrictEqual(between);
    });
  });
});
