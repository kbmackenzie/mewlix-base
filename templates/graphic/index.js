'use strict';

import createMewlix from './core/mewlix.js';
import initGraphic from './core/graphic.js'
import initYarnball from './yarnball/yarnball.js'

export default async function() {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  globalThis.Mewlix = createMewlix();
  const [graphicLib, graphicLibCurry] = initGraphic();
  Mewlix.Graphic = graphicLib;
  Mewlix.GraphicCurry = graphicLibCurry;

  initYarnball();

  const meta = await readMeta();
  if (meta.name) {
    document.title = meta.name;
  }
  const entrypoint = meta.entrypoint || 'main';

  return Mewlix.run(() => Mewlix.Modules.getModule(entrypoint));
}
