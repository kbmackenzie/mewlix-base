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

    it('creates a shelf and inserts an item into it', async () => {
      const output = await page.evaluate(() => {
        const mewlix = globalThis.mewlix;
        const shelfA = mewlix.shelf.create([1, 2, 3]);
        const shelfB = mewlix.lib['std'].get('insert')(shelfA, 4, 1);
        return mewlix.shelf.toArray(shelfB);
      });
      expect(output).toStrictEqual([1, 2, 4, 3]);
    });

    it('creates a shelf and removes an item from it', async () => {
      const output = await page.evaluate(() => {
        const mewlix = globalThis.mewlix;
        const shelfA = mewlix.shelf.create([1, 2, 3]);
        const shelfB = mewlix.lib['std'].get('remove')(shelfA, 1);
        return mewlix.shelf.toArray(shelfB);
      });
      expect(output).toStrictEqual([1, 3]);
    });

    it('tries to insert an item outside a shelf', async () => {
      const output = await page.evaluate(() => {
        const mewlix = globalThis.mewlix;
        const shelfA = mewlix.shelf.create([1, 2, 3]);
        const shelfB = mewlix.lib['std'].get('insert')(shelfA, 'outside boundaries', 6);
        return mewlix.shelf.toArray(shelfB);
      });
      expect(output).toStrictEqual(['outside boundaries', 1, 2, 3])
    });

    it('tries to remove an item outside a shelf', async () => {
      const output = await page.evaluate(() => {
        const mewlix = globalThis.mewlix;
        const shelfA = mewlix.shelf.create([1, 2, 3]);
        const shelfB = mewlix.lib['std'].get('remove')(shelfA, 6);
        return mewlix.shelf.toArray(shelfB);
      });
      expect(output).toStrictEqual([1, 2, 3])
    });
  });
});
