import { numbers } from '@/mewlix';

describe('arithmetic operations', () => {
  const { add, sub, mul, div, mod, pow, floordiv } = numbers;

  function randomInt(): number {
    /* Arbitrary boundaries. */
    const min = -4130000;
    const max = 4130000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const testInput = Array.from(
    { length: 10 },
    _ => [randomInt(), randomInt()]
  );

  test.each(testInput)('basic arithmetic operations with %i, %i', (a, b) => {
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
    ).toBeCloseTo(a / b);

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
