export default function(mewlix) {
  'use strict';
  const std = mewlix.Base;
  const graphic = mewlix.Graphic;
  const keys = graphic.keys;

  function row(n) {
    return (128 / 8) * n;
  }

  mewlix.Modules.addModule('main', () => {
    graphic.init(_ => {
      const mouse = graphic.mouse_position();
      graphic.write(`mouse x: ${mouse.x}`, 0, row(0));
      graphic.write(`mouse y: ${mouse.y}`, 0, row(1));

      const spaceDown = graphic.key_down(keys.space);
      graphic.write(`space key: ${spaceDown ? 'pressed' : 'not pressed'}`, 0, row(3));

      const arrows = mewlix.API.shelf(keys.up, keys.down, keys.left, keys.right);
      const arrowsDown = std.any(graphic.key_down, arrows);
      graphic.write(`arrows keys: ${arrowsDown ? 'pressed' : 'not pressed'}`, 0, row(4));
    });
  });
}
