'use strict';

import { readFile } from 'node:fs/promises';
import createMewlix from './core/mewlix.js';
import initYarnball from './yarnball/yarnball.js';

async function readJSON(path) {
  const text = await readFile(path, { encoding: 'utf-8' });
  return JSON.parse(text);
}

export default async function init(callback) {
  const mewlix = createMewlix();
  mewlix.setMeow((x) => {
    process.stdout.write(x + '\n');
    return x;
  });
  if (callback) {
    await callback(mewlix);
  }
  initYarnball(mewlix);

  const meta = await readJSON('./core/meta.json');
  const entrypoint = meta.entrypoint || 'main';
  return mewlix.run(() => mewlix.modules.get(entrypoint));
}
