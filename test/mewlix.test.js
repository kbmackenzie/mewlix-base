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

  describe('shelf creation ', () => {
    const arrayInput = [
      {
        input: [],
        head: null,
        length: 0,
        empty: true,
      },
      {
        input: [1, 2, 3, 4, 5, 6],
        length: 6,
        head: 6,
        empty: false,
      },
      {
        input: ['hello', 'world'],
        length: 2,
        head: 'world',
        empty: false,
      },
      {
        input: [1, 2, 3, 'hello', 4, 5, 6],
        length: 7,
        head: 6,
        empty: false,
      },
    ];

    test.each(arrayInput)('creates a shelf from an array', async (input) => {
      const output = await page.evaluate(
        (array) => {
          const mewlix = globalThis.mewlix;

          const shelf    = mewlix.shelf.create(array);
          const head     = mewlix.shelf.peek(shelf);
          const empty    = mewlix.lib['std'].get('empty')(shelf);
          const reversed = mewlix.lib['std'].get('reverse')(shelf);
          return {
            output: mewlix.shelf.toArray(shelf),
            length: mewlix.collections.length(shelf),
            head: head,
            empty: empty,
            reversed: mewlix.shelf.toArray(reversed),
          };
        },
        input.input,
      );

      expect(output.output).toStrictEqual(input.input);
      expect(output.length).toBe(input.length);
      expect(output.head).toStrictEqual(input.head);
      expect(output.empty).toBe(input.empty);
      expect(output.reversed).toStrictEqual([...input.input].reverse());
    });
  });

  describe('shelf equality', () => {
    const compareShelves = [
      { a: [1, 2, 3], b: [1, 2, 3] , result: true  },
      { a: [1, 2, 3], b: [1, 2]    , result: false },
      { a: [1, 2],    b: [1, 2, 3] , result: false },
      { a: [1, 2, 3], b: [1, 3, 4] , result: false },
      { a: []       , b: []        , result: true  },
      { a: [1, 2, 3], b: []        , result: false },
      { a: []       , b: [1, 2, 3] , result: false },
    ];

    test.each(compareShelves)('compares two shelves', async ({ a, b, result }) => {
      const output = await page.evaluate(
        (a, b) => {
          const mewlix = globalThis.mewlix;
          const shelfA = mewlix.shelf.create(a);
          const shelfB = mewlix.shelf.create(b);
          return mewlix.relation.equal(shelfA, shelfB);
        },
        a,
        b,
      );
      expect(output).toBe(result);
    });
  });

  describe('shelf operations: insertion', () => {
    const insertions = [
      { input: [1, 2, 3], value: 4, at: 0   , result: [1, 2, 3, 4], },
      { input: [1, 2, 3], value: 4, at: -1  , result: [4, 1, 2, 3], },
      { input: [1, 2, 3], value: 4, at: 1   , result: [1, 2, 4, 3], },
      { input: [1, 2, 3], value: 4, at: -2  , result: [1, 4, 2, 3], },
      { input: [1, 2, 3], value: 4, at: 6   , result: [4, 1, 2, 3], }, /* outside of boundaries */ 
      { input: [1, 2, 3], value: 4, at: -6  , result: [1, 2, 3, 4], },
    ];

    test.each(insertions)('inserts a value into a shelf', async ({ input, value, at, result }) => {
      const output = await page.evaluate(
        (input, value, at) => {
          const mewlix = globalThis.mewlix;
          const shelf  = mewlix.shelf.create(input);
          const output = mewlix.lib['std'].get('insert')(shelf, value, at);
          return mewlix.shelf.toArray(output);
        },
        input, value, at
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: removal', () => {
    const removals = [
      { input: [1, 2, 3], at: 0   , result: [1, 2],    },
      { input: [1, 2, 3], at: -1  , result: [2, 3],    },
      { input: [1, 2, 3], at: 1   , result: [1, 3],    },
      { input: [1, 2, 3], at: -2  , result: [1, 3],    },
      { input: [1, 2, 3], at: 6   , result: [1, 2, 3], },
      { input: [1, 2, 3], at: -6  , result: [1, 2],    },
    ];

    test.each(removals)('removes a value from a shelf', async ({ input, at, result }) => {
      const output = await page.evaluate(
        (input, at) => {
          const mewlix = globalThis.mewlix;
          const shelf  = mewlix.shelf.create(input);
          const output = mewlix.lib['std'].get('remove')(shelf, at);
          return mewlix.shelf.toArray(output);
        },
        input, at
      );
      expect(output).toStrictEqual(result);
    });
  });
});
