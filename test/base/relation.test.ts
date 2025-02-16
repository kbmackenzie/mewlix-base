import { MewlixValue, relation } from '@/mewlix';

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
    { a: null       , b: undefined  , expected: true  },
    { a: undefined  , b: null       , expected: true  },
  ];

  test.each(testInput)('should compare values for equality: %s', ({ a, b, expected }) => {
    expect(
      relation.equal(a, b)
    ).toBe(expected);
  });
});
