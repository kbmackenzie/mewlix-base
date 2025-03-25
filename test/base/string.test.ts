import { purrify, box, shelf, clowder } from "@/mewlix";

describe('purrify', () => {
  test('meow circular reference (in box)', () => {
    const ref = box.create<any>({});
    ref.set('self', ref);
    expect(() => purrify(ref)).not.toThrow();
  });

  test('meow circular reference (in box in shelf)', () => {
    const ref = box.create<any>({});
    ref.set('self', ref);
    const refShelf = shelf.create([ref]);
    expect(() => purrify(refShelf)).not.toThrow();
  });

  test('meow circular reference (in clowder instance)', () => {
    const Circular = clowder.create('Circular', null, {} as any);
    const ref = clowder.instantiate(Circular)();
    ref.set('self', ref);
    expect(() => purrify(ref)).not.toThrow();
  });
});
