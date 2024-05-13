'use strict';

/* The code below will typically be inside of an 'index.html' file.
 * The function below:
 * - Initializes the Mewlix namespace
 * - Initializes the template + libraries
 * - Initializes all yarn balls and runs the entrypoint yarn ball 
 *
 * The function isn't re-usable. */

import initBase from './core/mewlix.js';
import initConsole from './core/console.js';
import initGraphic from './core/graphic.js';
// import initYarnball from './yarnballs/yarnballs.js';

const readMeta = () => fetch('./core/meta.json')
  .then(response => response.json());

export default async function() {
  const meta = await readMeta();

  globalThis.Mewlix = {};
  initBase(),
  initConsole(),
  initGraphic(),

  /* Run all yarn balls: */
  initYarnball();
  if (meta.name) {
    document.title = meta.name;
  }
  const entrypoint = meta.entrypoint || 'main';

  await Mewlix.run(async () => {
    await Mewlix.Modules.getModule(entrypoint);
  });
}
