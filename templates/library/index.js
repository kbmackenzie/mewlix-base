'use strict';

import createMewlix from './core/mewlix.js';
import initYarnball from './yarnball/yarnball.js'

export default async function() {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  globalThis.Mewlix = createMewlix(),
  initYarnball();

  const meta = await readMeta();
  const entrypoint = meta.entrypoint || 'main';

  await Mewlix.run(async () => {
    await Mewlix.Modules.getModule(entrypoint);
  });
}
