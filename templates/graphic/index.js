'use strict';

import createMewlix from './core/mewlix.js';
import initGraphic  from './core/graphic.js';
import initYarnball from './yarnball/yarnball.js';

export default async function(callback) {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const mewlix = createMewlix();
  initGraphic(mewlix);
  if (callback) {
    await callback(mewlix);
  }
  initYarnball(mewlix);

  const meta = await readMeta();
  if (meta.title) {
    document.title = meta.title;
  }
  const entrypoint = meta.entrypoint || 'main';
  return mewlix.run(() => mewlix.modules.getModule(entrypoint));
}
