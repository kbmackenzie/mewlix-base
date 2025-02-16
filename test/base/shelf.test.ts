import { shelf, relation, collections, compare, standardLibrary } from '@/mewlix';

describe('shelf operations', () => {
  const {
    empty, insert, remove, reverse, find, map, filter, fold,
    join, poke, drop, take, all, any, zip
  } = standardLibrary();
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

    test.each(arrayInput)('creates a shelf from an array $input', ({ input, ...expected }) => {
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

    test.each(arrayInput)('reverses a shelf accurately: $input', ({ input }) => {
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

    test.each(comparisons)('check shelf equality: $a == $b', ({ a, b, result }) => {
      const shelfA = shelf.create(a);
      const shelfB = shelf.create(b);
      expect(equal(shelfA, shelfB)).toBe(result);
    });
  });

  describe('shelf ordering', () => {
    const comparisons = [
      { a: [1, 3, 4], b: [1, 2, 3] , func: compare.greater        , result: true  },
      { a: [1, 2, 3], b: [1, 2]    , func: compare.greater        , result: true  },
      { a: [1, 2, 3], b: [1, 3, 4] , func: compare.less           , result: true  },
      { a: [1, 2, 3], b: [1, 2]    , func: compare.less           , result: false },
      { a: [1, 2],    b: [1, 2, 3] , func: compare.less           , result: true  },
      { a: [1, 2, 3], b: [1, 2, 3] , func: compare.lessOrEqual    , result: true  },
      { a: [1, 2, 3], b: [1, 2, 3] , func: compare.greaterOrEqual , result: true  },
      { a: [1, 2, 3], b: [1, 3, 4] , func: compare.greaterOrEqual , result: false },
      { a: [1, 3, 4], b: [1, 2, 3] , func: compare.greaterOrEqual , result: true  },
      { a: []       , b: []        , func: compare.greaterOrEqual , result: true  },
      { a: []       , b: []        , func: compare.lessOrEqual    , result: true  },
      { a: []       , b: []        , func: compare.less           , result: false },
      { a: []       , b: []        , func: compare.greater        , result: false },
      { a: [1, 2, 3], b: []        , func: compare.less           , result: false },
      { a: []       , b: [1, 2, 3] , func: compare.greater        , result: false },
    ];

    test.each(comparisons)('compares shelves\' by ordering: $a and $b', ({ a, b, func, result }) => {
      const shelfA = shelf.create(a);
      const shelfB = shelf.create(b);
      expect(
        func(relation.ordering(shelfA, shelfB))
      ).toBe(result);
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

    test.each(insertions)('insert a value $value into shelf $input', ({ input, value, at, result }) => {
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

    test.each(removals)('removes a value from shelf $input', ({ input, at, result }) => {
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

    test.each(finds)('searches for a value in shelf $input', ({ input, search, result }) => {
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

    test.each(inputs)('applies function over values in shelf $input', ({ input, func, result }) => {
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

    test.each(inputs)('filters values in shelf $input by predicate', ({ input, predicate, result }) => {
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

    test.each(inputs)('folds values in shelf $input with a function', ({ input, func, initial, result }) => {
      const output = fold(func, initial, shelf.create(input));
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: join', () => {
    const inputs = [
      { a: [1, 2, 3], b: [1, 3, 4], result: [1, 2, 3, 1, 3, 4] },
      { a: [1, 2, 3], b: []       , result: [1, 2, 3]          },
      { a: []       , b: [1, 3, 4], result: [1, 3, 4]          },
    ];

    test.each(inputs)('join two shelves: $a and $b', ({ a, b, result }) => {
      const shelfA = shelf.create(a);
      const shelfB = shelf.create(b);
      const output = shelf.toArray(
        join(shelfA, shelfB)
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: poke', () => {
    const inputs = [
      { input: [1, 3, 4], index:  0, result: 4    },
      { input: [1, 3, 4], index:  1, result: 3    },
      { input: [1, 3, 4], index:  2, result: 1    },
      { input: [1, 3, 4], index:  3, result: null },
      { input: [1, 3, 4], index: -1, result: 1    },
      { input: [1, 3, 4], index: -2, result: 3    },
      { input: [1, 3, 4], index: -3, result: 4    },
      { input: []       , index:  0, result: null },
    ];

    test.each(inputs)('poke value at index $index in shelf $input', ({ input, index, result }) => {
      const output = poke(shelf.create(input), index);
      expect(output).toBe(result);
    });
  });

  describe('shelf operation: take', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5], amount: 3, result: [3, 4, 5]       },
      { input: [1, 2, 3, 4, 5], amount: 1, result: [5]             },
      { input: [1, 2, 3, 4, 5], amount: 0, result: []              },
      { input: [1, 2, 3, 4, 5], amount: 6, result: [1, 2, 3, 4, 5] },
      { input: []             , amount: 1, result: []              },
    ];

    test.each(inputs)('take $amount values from shelf $input', ({ input, amount, result }) => {
      const output = shelf.toArray(
        take(shelf.create(input), amount)
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: drop', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5], amount: 3, result: [1, 2]          },
      { input: [1, 2, 3, 4, 5], amount: 4, result: [1]             },
      { input: [1, 2, 3, 4, 5], amount: 0, result: [1, 2, 3, 4, 5] },
      { input: [1, 2, 3, 4, 5], amount: 5, result: []              },
      { input: [1, 2, 3, 4, 5], amount: 6, result: []              },
      { input: []             , amount: 1, result: []              },
    ];

    test.each(inputs)('drop $amount values from shelf $input', ({ input, amount, result }) => {
      const output = shelf.toArray(
        drop(shelf.create(input), amount)
      );
      expect(output).toStrictEqual(result);
    });
  });

  describe('shelf operation: all', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5], predicate: (x: number) => x % 2 === 0, result: false },
      { input: [2, 4, 6]      , predicate: (x: number) => x % 2 === 0, result: true  },
      { input: [2]            , predicate: (x: number) => x % 2 === 0, result: true  },
      { input: [3]            , predicate: (x: number) => x % 2 === 0, result: false },
      { input: []             , predicate: (x: number) => x % 2 === 0, result: true  },
      { input: [1, 3, 5]      , predicate: (x: number) => x % 2 !== 0, result: true  },
      { input: [1]            , predicate: (x: number) => x % 2 !== 0, result: true  },
    ];

    test.each(inputs)('see if all values in shelf $input satisfy predicate', ({ input, predicate, result }) => {
      const output = all(predicate, shelf.create(input));
      expect(output).toBe(result);
    });
  });

  describe('shelf operation: any', () => {
    const inputs = [
      { input: [1, 2, 3, 4, 5], predicate: (x: number) => x % 2 === 0, result: true  },
      { input: [1, 3, 4]      , predicate: (x: number) => x % 2 === 0, result: true  },
      { input: [1, 3, 5]      , predicate: (x: number) => x % 2 === 0, result: false },
      { input: []             , predicate: (x: number) => x % 2 === 0, result: false },
      { input: [1, 2, 3]      , predicate: (x: number) => x % 2 !== 0, result: true  },
      { input: [2, 4, 6]      , predicate: (x: number) => x % 2 !== 0, result: false },
    ];

    test.each(inputs)('see if any value in shelf $input satisfies predicate', ({ input, predicate, result }) => {
      const output = any(predicate, shelf.create(input));
      expect(output).toBe(result);
    });
  });

  describe('shelf operation: zip', () => {
    const inputs = [
      { a: [1, 2, 3], b: [1, 3, 4] },
      { a: [1, 2]   , b: [1, 3, 4] },
      { a: []       , b: [1, 3]    },
      { a: [1, 2]   , b: []        },
      { a: [1, 3, 4], b: [1, 2]    },
    ];
    
    test.each(inputs)('zips two shelves together: $a and $b', ({ a, b }) => {
      let shelfA = shelf.create(a);
      let shelfB = shelf.create(b);
      let zipped = zip(shelfA, shelfB);

      const expectedLength = Math.min(
        length(shelfA),
        length(shelfB),
      );
      expect(
        length(zipped)
      ).toBe(expectedLength);

      while (zipped.kind !== 'bottom') {
        const head = shelf.peek(zipped)!;
        expect(
          head.get('first')
        ).toStrictEqual(shelf.peek(shelfA))
        expect(
          head.get('second')
        ).toStrictEqual(shelf.peek(shelfB))

        zipped = shelf.pop(zipped)!;
        shelfA = shelf.pop(shelfA)!;
        shelfB = shelf.pop(shelfB)!;
      }
    });
  });
});
