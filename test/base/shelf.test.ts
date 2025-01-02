import { shelf, collections, standardLibrary } from '../../src/mewlix';

describe('shelf operations', () => {
  const { empty, reverse } = standardLibrary();
  const { length } = collections;

  describe('shelf creation', () => {
    const arrayInput = [
      { input: []                 , length: 0, head: null    , empty: true,  },
      { input: [1, 2, 3, 4, 5, 6] , length: 6, head: 6       , empty: false, },
      { input: ['hello', 'world'] , length: 2, head: 'world' , empty: false, },
      { input: [1, 2, 3, 'hello'] , length: 4, head: 'hello' , empty: false, },
      { input: [1]                , length: 1, head: 1       , empty: false, },
      { input: [null]             , length: 1, head: null    , empty: false, },
    ];

    test.each(arrayInput)('creates a shelf from an array', ({ input, ...expected }) => {
      const output = shelf.create(input);
      expect({
        length: length(output),
        head: shelf.peek(output),
        empty: empty(output),
      }).toStrictEqual(expected)

      expect(
        shelf.toArray(reverse(output))
      ).toStrictEqual([...input].reverse());
    });
  });
});
