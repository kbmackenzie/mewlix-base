const mewlix = import('@dist/mewlix.js');

describe('mewlix base library', () => {
  it('should create a shelf', () => {
    const input = ['cats', 'are', 'cute'];

    const shelf = mewlix.shelf.create(...input);
    const array = mewlix.shelf.toArray(shelf);
    expect(array).toStrictEqual(['cats', 'are', 'cute']);

    const top = mewlix.shelf.peek(shelf);
    expect(top).toBe('cute');

    const len = mewlix.collections.length(shelf);
    expect(len).toBe(3);
  });
});
