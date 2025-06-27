import {
  MewlixValue,
  Shelf,
  Clowder,
  ClowderInstance,
  Box,
  shelf,
  clowder,
  wake,
  collections,
  box
} from '@/mewlix';

describe('collections', () => {
  describe('collections: length', () => {
    type TestInput = {
      input: Shelf<MewlixValue> | string;
      length: number;
    };

    const testInput: TestInput[] = [
      { input: shelf.create([1, 2, 3]) , length: 3 },
      { input: shelf.create([])        , length: 0 },
      { input: shelf.create([1])       , length: 1 },
      { input: 'abc'                   , length: 3 },
      { input: ''                      , length: 0 },
      { input: 'a'                     , length: 1 },
    ];

    test.each(testInput)('gets length of input value $input', ({ input, length }) => {
      expect(
        collections.length(input)
      ).toBe(length);
    });
  });

  describe('collections: contains', () => {
    type TestInput = {
      input: Shelf<MewlixValue> | Box<Record<string, MewlixValue>> | string
      value: MewlixValue;
      expected: boolean;
    };

    const testInput: TestInput[] = [
      { input: shelf.create([1, 2, 3])  , value: 1    , expected: true  },
      { input: shelf.create([1, 2, 3])  , value: 3    , expected: true  },
      { input: shelf.create([1, 2, 3])  , value: 4    , expected: false },
      { input: shelf.create([1])        , value: 1    , expected: true  },
      { input: shelf.create([1])        , value: 3    , expected: false },
      { input: shelf.create([])         , value: 1    , expected: false },
      { input: shelf.create([])         , value: 3    , expected: false },
      { input: 'cat'                    , value: 'a'  , expected: true  },
      { input: 'cat'                    , value: 'at' , expected: true  },
      { input: 'cat'                    , value: 'cat', expected: true  },
      { input: 'cat'                    , value: 'bat', expected: false },
      { input: ''                       , value: 'a'  , expected: false },
      { input: ''                       , value: ''   , expected: true  },
      { input: box.create({a:1,b:2})    , value: 'a'  , expected: true  },
      { input: box.create({a:1,b:2})    , value: 'b'  , expected: true  },
      { input: box.create({a:1,b:2})    , value: 'c'  , expected: false },
      { input: box.create({a:1})        , value: 'a'  , expected: true  },
      { input: box.create({a:1})        , value: 'b'  , expected: false },
      { input: box.create({})           , value: 'a'  , expected: false },
      { input: box.create({})           , value: 'b'  , expected: false },
    ];

    test.each(testInput)('sees if value $value is contained in $input.bindings', ({ input, value, expected }) => {
      expect(
        collections.contains(value, input)
      ).toBe(expected);
    });
  });

  describe('collections: contains (with clowders)', () => {
    const Dummy = clowder.create('Dummy', null, {
      [wake](this: ClowderInstance) {
        this.set('a', 1);
        this.set('b', 2);
      },
      foo() {
        return this.get('a');
      },
      bar() {
        return this.get('b');
      },
    });

    const SuperDummy = clowder.create('SuperDummy', Dummy, {
      baz() {
        return this.get('a') + this.get('b');
      },
    });

    type TestInput = {
      input: Clowder;
      key: string;
      expected: boolean;
    };

    const testInput: TestInput[] = [
      { input: Dummy       , key: 'a'  , expected: true  },
      { input: Dummy       , key: 'b'  , expected: true  },
      { input: Dummy       , key: 'foo', expected: true  },
      { input: Dummy       , key: 'bar', expected: true  },
      { input: Dummy       , key: 'c'  , expected: false },
      { input: Dummy       , key: 'baz', expected: false },
      { input: SuperDummy  , key: 'a'  , expected: true  },
      { input: SuperDummy  , key: 'b'  , expected: true  },
      { input: SuperDummy  , key: 'foo', expected: true  },
      { input: SuperDummy  , key: 'bar', expected: true  },
      { input: SuperDummy  , key: 'baz', expected: true  },
      { input: SuperDummy  , key: 'c'  , expected: false },
    ];

    test.each(testInput)('sees if clowder $input.name contains key $key', ({ input, key, expected }) => {
      const instance = clowder.instantiate(input)();
      expect(
        collections.contains(key, instance)
      ).toBe(expected);
    });
  });
});
