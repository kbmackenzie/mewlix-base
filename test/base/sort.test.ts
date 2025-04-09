import { shelf, standardLibrary } from "@/mewlix";

describe('sort', () => {
  const { sort } = standardLibrary();

  type TestInput = {
    input   : number[];
    expected: number[];
  };

  const inputs: TestInput[] = [
    { input: [3, 1, 2], expected: [1, 2, 3] },
    { input: [1, 2, 3], expected: [1, 2, 3] },
  ];

  test.each(inputs)('properly sorts a shelf', ({ input, expected }) => {
    const output = shelf.toArray(
      sort(shelf.create(input))
    );
    expect(output).toStrictEqual(expected);
  });
});
