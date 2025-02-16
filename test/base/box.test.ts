import { box, collections, shelfIterator, ValueOf } from '@/mewlix';

describe('box operations', () => {
  const { length } = collections;

  describe('box creation', () => {
    type Input<T> = {
      input: T;
      items: [keyof T, ValueOf<T>, boolean][];
    };

    const inputs: Input<Record<string, number>>[] = [
      { input: { 'a': 1, 'b': 2 }, items: [['a', 1, true ], ['b', 2, true], ['c', 3, false]] },
      { input: { 'c': 3 }        , items: [['a', 1, false], ['c', 3, true], ['z', 9, false]] },
      { input: {}                , items: []                                                 },
    ];

    test.each(inputs)('create a box from an object', ({ input, items }) => {
      const output = box.create(input);
      for (const [key, value, included] of items) {
        expect(key in output.bindings).toBe(included);
        included && expect(output.get(key) === value).toBe(true);
      }
    });
  });

  describe('box pairs', () => {
    type Input<T> = {
      input: T;
      pairs: [keyof T, ValueOf<T>][]
    };

    const inputs: Input<Record<string, number>>[] = [
      { input: { 'a': 1, 'b': 2 }, pairs: [['a', 1], ['b', 2]] },
      { input: { 'c': 3 }        , pairs: [['c', 3]]           },
      { input: { '.': 6 }        , pairs: [['.', 6]]           },
      { input: {}                , pairs: []                   },
    ];

    test.each(inputs)('gets pairs from box', ({ input, pairs }) => {
      const shelf = box.pairs(box.create(input));
      const table = new Map(pairs);
      expect(length(shelf)).toBe(pairs.length);

      for (const box of shelfIterator(shelf)) {
        const key      = box.get('key');
        const value    = box.get('value');
        const expected = key && table.get(key as string);
        expect(value).toBe(expected);
      }
    });
  });
});
