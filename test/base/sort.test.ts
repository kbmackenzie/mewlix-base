import { shelf, standardLibrary } from "@/mewlix";

describe('sort', () => {
  const { sort } = standardLibrary();

  const inputs: ({ input: any[], expected: any[] })[] = [
    { input: [3, 1, 2]     , expected: [1, 2, 3]      },
    { input: [1, 2, 3]     , expected: [1, 2, 3]      },
    { input: ['cat', 'act'], expected: ['act', 'cat'] },
    { input: []            , expected: []             },
  ];

  test.each(inputs)('sorts shelf created from array $input', ({ input, expected }) => {
    const output = shelf.toArray(
      sort(shelf.create(input))
    );
    expect(output).toStrictEqual(expected);
  });

  const invalid: ({ input: any[] })[] = [
    { input: [1, 3, 'a'] },
    { input: ['a', 1, 2] },
  ];

  test.each(invalid)('...', ({ input }) => {
    const run = () => sort(shelf.create(input));
    expect(run).toThrow();
  });
});
