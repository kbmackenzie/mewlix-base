'use strict';

import createMewlix from './core/mewlix.js';
import initYarnball from './yarnball/yarnball.js';

export default async function(callback) {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const mewlix = createMewlix();
  if (callback) {
    await callback(mewlix);
  }
  initYarnball(mewlix);

  const meta = await readMeta();
  const entrypoint = meta.entrypoint || 'main';
  return mewlix.run(() => mewlix.modules.get(entrypoint));
}
