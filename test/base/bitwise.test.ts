import { standardLibrary } from '@/mewlix';

describe('bitwise operations', () => {
  const { itty: bitwiseNot, bitty: bitwiseOr, kitty: bitwiseAnd } = standardLibrary();

  function randomInteger(min: number, max: number): number {
    const minBound = Math.ceil(min);
    const maxBound = Math.floor(max);
    return Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
  }

  function randomUint32() {
    return randomInteger(0x00000000, 0xffffffff);
  }

  const testInput = Array.from(
    { length: 10 },
    _ => [randomUint32(), randomUint32()],
  );

  test.each(testInput)('performs bitwise operations on %i, %i', (a, b) => {
    expect(
      bitwiseNot(a)
    ).toBe(~a);

    expect(
      bitwiseOr(a, b)
    ).toBe(a | b);

    expect(
      bitwiseAnd(a, b)
    ).toBe(a & b);

    expect(
      bitwiseOr(a, 0x00000000)
    ).toBe(a | 0x00000000);

    expect(
      bitwiseOr(a , 0xffffffff)
    ).toBe(a | 0xffffffff);

    expect(
      bitwiseOr(a, 0x0000ffff)
    ).toBe(a | 0x0000ffff);

    expect(
      bitwiseOr(a, 0xffff0000)
    ).toBe(a | 0xffff0000);

    expect(
      bitwiseAnd(a, 0x00000000)
    ).toBe(a & 0x00000000);

    expect(
      bitwiseAnd(a, 0xffffffff)
    ).toBe(a & 0xffffffff);

    expect(
      bitwiseAnd(a, 0x0000ffff)
    ).toBe(a & 0x0000ffff);

    expect(
      bitwiseAnd(a , 0xffff0000)
    ).toBe(a & 0xffff0000);
  });
});
