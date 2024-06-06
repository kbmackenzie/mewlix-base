export default function(mewlix) {
  'use strict';
  const std     = mewlix.Base.box();
  const graphic = mewlix.Graphic.box();
  const keys    = graphic.keys.box();

  function row(n) {
    return (128 / 8) * n;
  }

  mewlix.Modules.addModule('main', () => {
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
