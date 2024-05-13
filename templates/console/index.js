'use strict';
import initBase from './core/mewlix.js';
import initConsole from './core/console.js'
import initYarnball from './yarnball/yarnball.js'

export default async function() {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const meta = await readMeta();
  globalThis.Mewlix = {};
  initBase(),
  initConsole(),
  initYarnball();
  if (meta.name) {
    document.title = meta.name;
  }
  const entrypoint = meta.entrypoint || 'main';

  await Mewlix.run(async () => {
    await Mewlix.Modules.getModule(entrypoint);
  });
}
