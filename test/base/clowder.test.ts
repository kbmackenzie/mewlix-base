import { ClowderInstance, clowder, wake, collections, purrify } from '@/mewlix';

describe('clowder operations', () => {
  type Animal  = ClowderInstance;
  type Cat     = ClowderInstance;
  type Charlie = ClowderInstance;

  const Animal = clowder.create('Animal', null, {
    [wake](this: Animal, species: string) {
      this.set('species', species);
    },
    sound() {
      throw 'not implemented';
    }
  });

  const Cat = clowder.create('Cat', Animal, {
    [wake](this: Cat) {
      this.outside()!.wake('Felis catus');
    },
    sound(this: Cat) {
      return 'meow';
    },
  });

  const Charlie = clowder.create('Charlie', Cat, {
    sound(this: Charlie): string {
      return 'hello!!';
    },
    purr(this: Charlie): string {
      return 'meow meow!';
    },
  });

  test('clowder instance calls constructor correctly', () => {
    const owl = clowder.instantiate(Animal)('Tyto alba');
    expect(owl.get('species')).toBe('Tyto alba');
  });

  test('clowder instance calls parent constructor', () => {
    const cat = clowder.instantiate(Cat)();
    expect(cat.get('species')).toBe('Felis catus');
  });

  test('clowder instance methods can be called', () => {
    const cat    = clowder.instantiate(Cat)();
    const method = cat.get('sound') as () => string;
    expect(method.call(cat)).toBe('meow');
  });

  test('clowder instance inherits contructor from parent', () => {
    const charlie = clowder.instantiate(Charlie)();
    expect(charlie.get('species')).toBe('Felis catus');
  });

  test('child clowders can override methods from parent clowders', () => {
    const charlie = clowder.instantiate(Charlie)();
    const method  = charlie.get('sound') as () => string;
    expect(method.call(charlie)).toBe('hello!!');
  });

  test('child clowders can call methods from parent clowders', () => {
    const charlie = clowder.instantiate(Cat)();
    const method  = charlie.outside()!.get('sound') as () => string;
    expect(() => method.call(charlie)).toThrow();
  });

  test('child clowders can call methods from parent clowders (even after overriding)', () => {
    const charlie = clowder.instantiate(Charlie)();
    const method  = charlie.outside()!.get('sound') as () => string;
    expect(method.call(charlie)).toBe('meow');
  });

  test('child clowders contain value from parent clowder', () => {
    const charlie = clowder.instantiate(Charlie)();
    expect(collections.contains('species', charlie)).toBe(true);
  });

  test('clowder has string representation', () => {
    const charlie = clowder.instantiate(Charlie)();
    expect(purrify(charlie)).toBe('meow meow!');
  });
});
