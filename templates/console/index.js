'use strict';
import createMewlix from './core/mewlix.js';
import initConsole from './core/console.js'
import initYarnball from './yarnball/yarnball.js'

export default async function(callback) {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const mewlix = createMewlix();
  initConsole(mewlix);
  if (callback) {
    callback(mewlix);
  }
  initYarnball(mewlix);

  const meta = await readMeta();
  if (meta.name) {
    document.title = meta.name;
  }
  const entrypoint = meta.entrypoint || 'main';
  return mewlix.run(() => mewlix.Modules.getModule(entrypoint));
}
