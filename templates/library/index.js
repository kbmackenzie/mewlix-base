'use strict';
import initBase from './core/mewlix.js';
import initYarnball from './yarnball/yarnball.js'

export default async function() {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const meta = await readMeta();
  globalThis.Mewlix = {};
  initBase(),
  initYarnball();
  const entrypoint = meta.entrypoint || 'main';

  await Mewlix.run(async () => {
    await Mewlix.Modules.getModule(entrypoint);
  });
}
