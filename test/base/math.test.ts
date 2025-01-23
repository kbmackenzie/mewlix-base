import { numbers } from '../../src/mewlix';

describe('arithmetic operations', () => {
  const { add, sub, mul, div, floordiv } = numbers;

  function randomInteger(min: number, max: number): number {
    const minBound = Math.ceil(min);
    const maxBound = Math.floor(max);
    return Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
  }

  const testInput = Array.from(
    { length: 100 },
    _ => randomInteger(0, 0xffffffff)
  );

  test.each(testInput)('performs basic arithmetic operations', (a) => {
    const b = randomInteger(0, 0xffffffff);

    expect(
      add(a, b)
    ).toBe(a + b);

    expect(
      sub(a, b)
    ).toBe(a - b);

    expect(
      mul(a, b)
    ).toBe(a * b);

    expect(
      div(a, b)
    ).toBe(a / b);

    expect(
      floordiv(a, b)
    ).toBe(Math.floor(a / b));
  });
});
