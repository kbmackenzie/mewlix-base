import { numbers } from '../../src/mewlix';

describe('arithmetic operations', () => {
  const { add, sub, mul, div, mod, pow, floordiv } = numbers;

  function randomInteger(min: number, max: number): number {
    const minBound = Math.ceil(min);
    const maxBound = Math.floor(max);
    return Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
  }

  const testInput = Array.from(
    { length: 10 },
    _ => randomInteger(0, 0xffffffff)
  );

  test.each(testInput)('basic arithmetic operations', (a) => {
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

    expect(
      pow(a, 2)
    ).toBe(a ** 2);

    expect(
      pow(a, 3)
    ).toBe(a ** 3);
  });

  test('module operation', () => {
    expect(
      mod(15, 4)
    ).toBe(3);

    expect(
      mod(-15, 4)
    ).toBe(1);
  });
});
