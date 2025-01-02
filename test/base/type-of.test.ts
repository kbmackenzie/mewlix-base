import { shelf, box, reflection, clowder, catTree } from '../../src/mewlix';

describe('reflection', () => {
  const inputs = [
    { input: 413                      , result: 'number'   },
    { input: 'cat'                    , result: 'string'   },
    { input: false                    , result: 'boolean'  },
    { input: true                     , result: 'boolean'  },
    { input: shelf.create([])         , result: 'shelf'    },
    { input: shelf.create([1, 2, 3])  , result: 'shelf'    },
    { input: box.create({})           , result: 'box'      },
    { input: (x: number) => x ** 2    , result: 'function' },
    { input: null                     , result: 'nothing'  },
    { input: undefined                , result: 'nothing'  },
  ];

  test.each(inputs)('has type correctly identified', ({ input, result }) => {
    const output = reflection.typeOf(input);
    expect(output).toBe(result);
  });

  test('has clowder type correctly identified', () => {
    const testClowder  = clowder.create('Test', null, () => ({}));
    const testInstance = clowder.instantiate(testClowder)();

    expect(
      reflection.typeOf(testClowder)
    ).toBe('clowder');

    expect(
      reflection.typeOf(testInstance)
    ).toBe('clowder instance');

    expect(
      reflection.instanceOf(testInstance, testClowder)
    ).toBe(true);

    const testClowder2  = clowder.create('Test2', testClowder, () => ({}));
    const testInstance2 = clowder.instantiate(testClowder2)();

    expect(
      reflection.instanceOf(testInstance2, testClowder2)
    ).toBe(true);

    expect(
      reflection.instanceOf(testInstance2, testClowder)
    ).toBe(true);

    expect(
      reflection.instanceOf(testInstance, testClowder2)
    ).toBe(false);
  });

  test('has cat tree type correctly identified', () => {
    const testTree = catTree.create('Test', ['A', 'B']);
    expect(
      reflection.typeOf(testTree)
    ).toBe('cat tree');

    expect(
      reflection.typeOf(testTree.fruits['A'])
    ).toBe('cat fruit');
  });
});
