const utils = require("./test-utils");

describe('mewlix graphic template', () => {
  beforeAll(async () => {
    const config = await utils.readConfig();
    const port = config.ports.graphic;
    await page.goto(`http://localhost:${port}/`);
    /* Wait for the 'mewlix' object to become globablly available.
     * 
     * Note: The 'mewlix' object is typically local.
     * It will become globally availble in test suites for testing purposes only. */
    await page.waitForFunction(
      () => !!globalThis.mewlix,
      { timeout: 5000 },
    );
  });

  const colors = [
    { hexcode: '#ffffff', values: [255, 255, 255] },
    { hexcode: '#000000', values: [  0,   0,   0] },
    { hexcode: '#000'   , values: [  0,   0,   0] },
    { hexcode: '#ff0000', values: [255,   0,   0] },
    { hexcode: '#00ff00', values: [  0, 255,   0] },
    { hexcode: '#0000ff', values: [  0,   0, 255] },
    { hexcode: '#f3008f', values: [243,   0, 143] },
    { hexcode: '#9d00ff', values: [157,   0, 255] },
    { hexcode: '#468c0f', values: [ 70, 140,  15] },
  ];

  it.each(colors)('parses a color', async ({ hexcode, values }) => {
    const color = await page.evaluate(
      (hexcode) => {
        const color = globalThis.mewlix.lib['std.graphic'].get('hex')(hexcode);
        const { red, green, blue } = color.bindings;
        return [red, green, blue];
      },
      hexcode,
    );
    expect(color).toStrictEqual(values);
  });
});


/*
export default function(mewlix) {
  'use strict';
  const std     = mewlix.Base.box();
  const graphic = mewlix.Graphic.box();
  const keys    = graphic.keys.box();

  function row(n) {
    return (128 / 8) * n;
  }

  mewlix.modules.addModule('main', () => {
    graphic.init(_ => {
      graphic.paint('#cecece');
      const x = 2;

      const mouse = graphic.mouse_position().box();
      graphic.write(`mouse x: ${mouse.x}`, x, row(0));
      graphic.write(`mouse y: ${mouse.y}`, x, row(1));
      graphic.write(`mouse down?: ${graphic.mouse_down()}`, x, row(2));

      const spaceDown = graphic.key_down(keys.space);
      graphic.write(`space key: ${spaceDown ? 'pressed' : 'not pressed'}`, x, row(4));

      const wasd = mewlix.api.shelf('w', 'a', 's', 'd');
      const wasdDown = std.any(graphic.key_down, wasd);
      graphic.write(`wasd keys: ${wasdDown ? 'pressed' : 'not pressed'}`, x, row(5));

      const arrows = mewlix.api.shelf(keys.up, keys.down, keys.left, keys.right);
      const arrowsDown = std.any(graphic.key_down, arrows);
      graphic.write(`arrows keys: ${arrowsDown ? 'pressed' : 'not pressed'}`, x, row(6));
    });
  });
}
*/
