import { standardLibrary } from '../../src/mewlix';

describe('bitwise operations', () => {
  const { itty: bitwiseNot, bitty: bitwiseOr, kitty: bitwiseAnd } = standardLibrary();

  function randomInteger(min: number, max: number): number {
    const minBound = Math.ceil(min);
    const maxBound = Math.floor(max);
    return Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
  }

  const testInput = Array.from(
    { length: 10 },
    _ => randomInteger(0x00000000, 0xffffffff),
  );

  test.each(testInput)('performs bitwise operations on value properly', (number) => {
    expect(
      bitwiseNot(number)
    ).toBe(~number);

    expect(
      bitwiseOr(number, 0x00000000)
    ).toBe(number | 0x00000000);

    expect(
      bitwiseOr(number, 0xffffffff)
    ).toBe(number | 0xffffffff);

    expect(
      bitwiseOr(number, 0x0000ffff)
    ).toBe(number | 0x0000ffff);

    expect(
      bitwiseOr(number, 0xffff0000)
    ).toBe(number | 0xffff0000);

    expect(
      bitwiseAnd(number, 0x00000000)
    ).toBe(number & 0x00000000);

    expect(
      bitwiseAnd(number, 0xffffffff)
    ).toBe(number & 0xffffffff);

    expect(
      bitwiseAnd(number, 0x0000ffff)
    ).toBe(number & 0x0000ffff);

    expect(
      bitwiseAnd(number, 0xffff0000)
    ).toBe(number & 0xffff0000);
  });
});
