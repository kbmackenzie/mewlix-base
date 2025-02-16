import { shelf, standardLibrary } from '@/mewlix';

describe('text & byte sequences', () => {
  const { to_bytes: toBytes, from_bytes: fromBytes } = standardLibrary();

  const testInput = [
    { bytes: [99,97,116]       , string: 'cat'  },
    { bytes: [240,159,144,177] , string: '🐱'   },
    { bytes: [109,101,111,119] , string: 'meow' },
    { bytes: []                , string: ''     },
  ];

  test.each(testInput)('generates string "$string" from utf-8 byte sequence $bytes', ({ bytes, string }) => {
    const output = fromBytes(shelf.fromArray(bytes));
    expect(output).toBe(string);
  });

  test.each(testInput)('generates utf-8 byte sequence $bytes from string "$string"', ({ bytes, string }) => {
    const output = shelf.toArray(toBytes(string));
    expect(output).toStrictEqual(bytes);
  });
});
