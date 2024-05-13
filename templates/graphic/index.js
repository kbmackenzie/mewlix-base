'use strict';
import initBase from './core/mewlix.js';
import initGraphic from './core/graphic.js'
import initYarnball from './yarnball/yarnball.js'

export default async function() {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const meta = await readMeta();
  globalThis.Mewlix = {};
  initBase(),
  initGraphic(),
  initYarnball();
  if (meta.name) {
    document.title = meta.name;
  }
  const entrypoint = meta.entrypoint || 'main';

  await Mewlix.run(async () => {
    await Mewlix.Modules.getModule(entrypoint);
  });
}
