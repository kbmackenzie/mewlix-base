import { Shelf, shelf, isShelf, box, standardLibrary, MewlixObject, Box, isBox } from '@/mewlix';

describe('json utilities', () => {
  const { from_json: fromJSON, to_json: toJSON } = standardLibrary();

  type Input = {
    input: MewlixObject
    expected: string;
  };

  const testInput: Input[] = [
    {
      input: shelf.create([1, 2, 3, 4, 5]),
      expected: '[1,2,3,4,5]',
    },
    {
      input: shelf.create([
        shelf.create([1, 2, 3]),
        shelf.create([1, 3, 4]),
      ]),
      expected: '[[1,2,3],[1,3,4]]',
    },
    {
      input: shelf.create([
        1, 2, 3,
        shelf.create([1, 3, 4]),
        shelf.create([
          shelf.create([1]),
          shelf.create([]),
          shelf.create([1,3,4]),
        ]),
      ]),
      expected: '[1,2,3,[1,3,4],[[1],[],[1,3,4]]]',
    },
    {
      input: box.create({
        cats: shelf.create(['jake', 'princess']),
        message: 'hello world! :)',
      }),
      expected: '{"cats":["jake","princess"],"message":"hello world! :)"}',
    },
    {
      input: box.create({
        shelves: shelf.create([
          box.create({ a: 1, b: 2 }),
          box.create({ cat: shelf.create(['c', 'a', 't']) }),
        ]),
      }),
      expected: '{"shelves":[{"a":1,"b":2},{"cat":["c","a","t"]}]}',
    },
  ];

  describe('json serialization & deserialization', () => {
    test.each(testInput)('correctly serializes input to $expected', ({ input, expected }) => {
      const output = toJSON(input);
      expect(output).toBe(expected);
    });
  });

  describe('json operation: identity law', () => {
    /* Mewlix's JSON operations have the following property:
     *  Identity: 
     *      toJSON(fromJSON(x)) === x
     * It should hold for all valid Mewlix values. (NaN doesn't count.) */

    type ComparableMap = Record<string, Comparable>;
    type Comparable = MewlixObject | string | boolean | number | null;

    function compareShelf(a: Shelf<Comparable>, b: Shelf<Comparable>): boolean {
      if (a.kind === 'bottom') return b.kind === 'bottom';
      if (b.kind === 'bottom') return false;
      return compare(a.value, b.value) && compareShelf(a.tail, b.tail);
    }

    function compareBox(a: Box<ComparableMap>, b: Box<ComparableMap>): boolean {
      for (const key of Object.keys(a.bindings)) {
        if (!compare(a.bindings[key], b.bindings[key])) return false;
      }
      return true;
    }

    function compare(a: Comparable, b: Comparable): boolean {
      if (isShelf<Comparable>(a) && isShelf<Comparable>(b)) { return compareShelf(a, b); }
      if (isBox<ComparableMap>(a) && isBox<ComparableMap>(b)) { return compareBox(a, b); }
      return a === b;
    }

    test.each(testInput)('is equal after serialization & deserialization: $expected', ({ input }) => {
      const output = fromJSON(toJSON(input)) as Comparable;
      expect(
        compare(input, output),
      ).toBe(true);
    });
  });
});
