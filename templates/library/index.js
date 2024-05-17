'use strict';

import createMewlix from './core/mewlix.js';
import initYarnball from './yarnball/yarnball.js';

export default async function(callback) {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const mewlix = createMewlix();
  if (callback) {
    callback(mewlix);
  }
  initYarnball(mewlix);
  mewlix.meow = (x) => { console.log(x); };

  const meta = await readMeta();
  const entrypoint = meta.entrypoint || 'main';

  return mewlix.run(() => mewlix.Modules.getModule(entrypoint));
}
