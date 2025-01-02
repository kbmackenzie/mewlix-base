import { ClowderInstance, clowder, wake } from '../../src/mewlix';

/* A lot of type casting here, wow! _(:3」∠)_
 *
 * Clowders are a little too weird for TypeScript's type system.
 * A lot of 'Excessive stack depth comparing types'... Blehhhhh...
 *
 * It's fine, though. _(;3」∠)_ */

describe('clowder operations', () => {
  type AnimalLike = {
    [wake](this: ClowderInstance<AnimalLike>, species: string): void;
    species: string;
  };

  const Animal = clowder.create<AnimalLike>('Animal', null, () => ({
    [wake](this: ClowderInstance<AnimalLike>, species: string) {
      this.set('species', species);
    },
  }) as AnimalLike);

  type CatLike = AnimalLike & {
    [wake](this: ClowderInstance<CatLike>): void;
    sound(this: ClowderInstance<CatLike>): string;
  };

  const Cat = clowder.create<CatLike>('Cat', Animal as any, () => ({
    [wake](this: ClowderInstance<CatLike>) {
      (this.parent as any).bindings[wake]!('Felis catus');
    },
    sound(this: ClowderInstance<CatLike>) {
      return 'meow';
    },
  }) as CatLike);

  type CharlieLike = CatLike & {
    sound(this: ClowderInstance<CharlieLike>): string;
  };

  const Charlie = clowder.create<CharlieLike>('Charlie', Cat, () => ({
    sound(this: ClowderInstance<CharlieLike>): string {
      return 'hello!!';
    },
  }) as CharlieLike);

  test('clowder instance calls constructor correctly', () => {
    const owl = clowder.instantiate<AnimalLike>(Animal)('Tyto alba');
    expect(owl.get('species')).toBe('Tyto alba');
  });

  test('clowder instance calls parent constructor', () => {
    const cat = clowder.instantiate<CatLike>(Cat)();
    expect(cat.get('species')).toBe('Felis catus');
  });

  test('clowder instance methods can be called', () => {
    const cat    = clowder.instantiate<CatLike>(Cat)();
    const method = cat.get('sound') as CatLike['sound'];
    expect(
      method.call(cat)
    ).toBe('meow');
  });

  test('clowder instance inherits contructor from parent', () => {
    const charlie = clowder.instantiate<CharlieLike>(Charlie)();
    expect(charlie.get('species')).toBe('Felis catus');
  });

  test('child clowders can override methods from parent clowders', () => {
    const charlie = clowder.instantiate<CharlieLike>(Charlie)();
    const method  = charlie.get('sound') as CharlieLike['sound'];
    expect(
      method.call(charlie)
    ).toBe('hello!!');
  });
});
