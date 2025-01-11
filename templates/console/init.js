'use strict';

import createMewlix from './core/mewlix.js';
import initConsole  from './core/console.js';
import initYarnball from './yarnball/yarnball.js';

function setDescription(content) {
  const meta = document.querySelector('meta[name="description"]');
  if (!meta) return;
  meta.content = content;
}

export default async function init(callback) {
  const readMeta = () => fetch('./core/meta.json')
    .then(response => response.json());

  const mewlix = createMewlix();
  initConsole(mewlix);
  if (callback) {
    await callback(mewlix);
  }
  initYarnball(mewlix);

  const meta = await readMeta();
  if (meta.title) {
    document.title = meta.title;
  }
  if (meta.description) {
    setDescription(meta.description);
  }
  const entrypoint = meta.entrypoint || 'main';
  return mewlix.run(() => mewlix.modules.get(entrypoint));
}
