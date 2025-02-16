import { MewlixValue, Ordering, relation } from '@/mewlix';

describe('equality', () => {
  type TestInput = {
    a: MewlixValue;
    b: MewlixValue;
    expected: boolean;
  };

  const testInput: TestInput[] = [
    { a: 314        , b: '314'      , expected: false },
    { a: 314        , b: 314        , expected: true  },
    { a: '314'      , b: '314'      , expected: true  },
    { a: true       , b: true       , expected: true  },
    { a: true       , b: 1          , expected: false },
    { a: false      , b: false      , expected: true  },
    { a: false      , b: null       , expected: false },
    { a: false      , b: undefined  , expected: false },
    { a: false      , b: 0          , expected: false },
    { a: null       , b: undefined  , expected: true  },
    { a: undefined  , b: null       , expected: true  },
    { a: ''         , b: 0          , expected: false },
    { a: ''         , b: undefined  , expected: false },
    { a: 0          , b: null       , expected: false },
    { a: 'null'     , b: null       , expected: false },
  ];

  test.each(testInput)('check equality: $a == $b', ({ a, b, expected }) => {
    expect(
      relation.equal(a, b)
    ).toBe(expected);
  });
});

describe('comparison', () => {
  type TestInput = {
    a: MewlixValue;
    b: MewlixValue;
    expected: Ordering;
  };

  const testInput: TestInput[] = [
    { a: 413        , b: 314        , expected: Ordering.Greater },
    { a: 413        , b: 413        , expected: Ordering.Equal   },
    { a: 314        , b: 413        , expected: Ordering.Less    },
    { a: 'abc'      , b: 'cde'      , expected: Ordering.Less    },
    { a: 'abc'      , b: 'abc'      , expected: Ordering.Equal   },
    { a: 'cde'      , b: 'abc'      , expected: Ordering.Greater },
    { a: true       , b: false      , expected: Ordering.Greater },
    { a: true       , b: true       , expected: Ordering.Equal   },
    { a: false      , b: true       , expected: Ordering.Less    },
  ];

  test.each(testInput)('compares values $a and $b', ({ a, b, expected }) => {
    expect(
      relation.ordering(a, b)
    ).toBe(expected);
  });
});
