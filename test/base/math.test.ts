import { numbers } from '@/mewlix';

describe('arithmetic operations', () => {
  const { div, mod, pow, floordiv } = numbers;

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

  test.each(testInput)('basic numeric operations with %i, %i', (a, b) => {
    expect(
      div(a, b)
    ).toBeCloseTo(a / b);

    expect(
      floordiv(a, b)
    ).toBe(Math.floor(a / b));

    expect(
      pow(a, 3)
    ).toBe(a ** 3);
  });

  test('exception is thrown when dividing by zero', () => {
    expect(() => 
      div(0, 0)
    ).toThrow();

    expect(() => 
      floordiv(0, 0)
    ).toThrow();

    expect(() => 
      mod(0, 0)
    ).toThrow();
  });

  test('modulo operation', () => {
    expect(
      mod(15, 4)
    ).toBe(3);

    expect(
      mod(-15, 4)
    ).toBe(1);
  });
});
