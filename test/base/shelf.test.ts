import { shelf, relation, collections, standardLibrary } from '../../src/mewlix';

describe('shelf operations', () => {
  const { empty, reverse, insert, remove, find, map, filter, fold } = standardLibrary();
  const { length } = collections;
  const { equal  } = relation;

  describe('shelf creation', () => {
    const arrayInput = [
      { input: []                 , length: 0, head: null    , empty: true,  },
      { input: [1, 2, 3, 4, 5, 6] , length: 6, head: 6       , empty: false, },
      { input: ['hello', 'world'] , length: 2, head: 'world' , empty: false, },
      { input: [1, 2, 3, 'hello'] , length: 4, head: 'hello' , empty: false, },
      { input: [1]                , length: 1, head: 1       , empty: false, },
      { input: [null]             , length: 1, head: null    , empty: false, },
      { input: [1, 2, 3, null]    , length: 4, head: null    , empty: false, },
    ];

    test.each(arrayInput)('creates a shelf from an array', ({ input, ...expected }) => {
      const output = shelf.create(input);
      expect({
        length: length(output),
        head: shelf.peek(output),
        empty: empty(output),
      }).toStrictEqual(expected)
    });
  });

  describe('shelf reversal', () => {
    const arrayInput = [
      { input: []                 },
      { input: [1, 2]             },
      { input: [1, 2, 3, 4, 5]    },
      { input: [null, 1, 2, 3]    },
      { input: ['hello', 'world'] },
      { input: [1, 2, 3, 'hello'] }
    ];

    test.each(arrayInput)('reverses a shelf accurately', ({ input }) => {
      const output   = shelf.create(input);
      const reversed = [...input].reverse();
      expect(
        shelf.toArray(reverse(output))
      ).toStrictEqual(reversed);
    });
  });

  describe('shelf equality', () => {
    const comparisons = [
      { a: [1, 2, 3], b: [1, 2, 3] , result: true  },
      { a: [1, 2, 3], b: [1, 2]    , result: false },
      { a: [1, 2],    b: [1, 2, 3] , result: false },
      { a: [1, 2, 3], b: [1, 3, 4] , result: false },
      { a: []       , b: []        , result: true  },
      { a: [1, 2, 3], b: []        , result: false },
      { a: []       , b: [1, 2, 3] , result: false },
    ];

    test.each(comparisons)('compare two shelves', ({ a, b, result }) => {
      const shelfA = shelf.create(a);
      const shelfB = shelf.create(b);
      expect(equal(shelfA, shelfB)).toBe(result);
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

    test.each(insertions)('insert a value into a shelf', ({ input, value, at, result }) => {
      const output = shelf.toArray(
        insert(shelf.create(input), value, at)
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

    test.each(removals)('removes a value from a shelf', ({ input, at, result }) => {
      const output = shelf.toArray(
        remove(shelf.create(input), at)
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: find', () => {
    const finds = [
      { input: [1, 2, 3] , search: 3 , result: 0    },
      { input: [1, 2, 3] , search: 1 , result: 2    },
      { input: [1, 2]    , search: 3 , result: null },
      { input: []        , search: 3 , result: null },
    ];

    test.each(finds)('searches for a value in a shelf', ({ input, search, result }) => {
      const output = find(x => x === search, shelf.create(input));
      expect(output).toStrictEqual(result);
    });

    test('handles truthy predicate values properly', () => {
      const output = find(_ => '' as any, shelf.create([1, 2, 3]));
      expect(output).toStrictEqual(0);
    });
  });

  describe('shelf operation: map', () => {
    const inputs = [
      { input: [1, 2, 3], func: (x: number) => x ** 2, result: [1, 4, 9] },
      { input: []       , func: (x: number) => x ** 2, result: []        },
      { input: [1]      , func: (x: number) => x + 10, result: [11]      },
    ];

    test.each(inputs)('applies function over values in shelf', ({ input, func, result }) => {
      const output = shelf.toArray(
        map(func, shelf.create(input))
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: filter', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5], predicate: (x: number) => x % 2 === 0, result: [2, 4] },
      { input: [1, 3, 5]      , predicate: (x: number) => x % 2 === 0, result: []     },
      { input: [2, 4]         , predicate: (x: number) => x % 2 === 0, result: [2, 4] },
      { input: []             , predicate: (x: number) => x % 2 === 0, result: []     },
      { input: [6]            , predicate: (x: number) => x % 2 === 0, result: [6]    },
    ];

    test.each(inputs)('filters values in shelf by predicate', ({ input, predicate, result }) => {
      const output = shelf.toArray(
        filter(predicate, shelf.create(input))
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: fold', () => {
    const inputs = [
      { input: ['t', 'a', 'c'], func: (acc: string, x: string) => acc + x, initial: '', result: 'cat' },
      { input: []             , func: (acc: string, x: string) => acc + x, initial: '', result: ''    },
    ];

    test.each(inputs)('folds values in shelf with function', ({ input, func, initial, result }) => {
      const output = fold(func, initial, shelf.create(input));
      expect(output).toStrictEqual(result);
    });
  });
});
