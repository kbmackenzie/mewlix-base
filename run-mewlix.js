/* Mewlix is a cat-themed esoteric programming language. 🐱
 * THis is a core file from Mewlix's base library.
 * 
 * Learn more at:
 * > https://github.com/KBMackenzie/mewlix <
 *
 * This file is released under the MIT license. 
 * The full license details can be found at:
 * > https://github.com/KBMackenzie/mewlix-base/blob/main/LICENSE < */

'use strict';

const scriptList = () => fetch('/core/script-list.json')
  .then(response => response.json());

const loadScript = function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src  = src;
    script.addEventListener('load', resolve);
    script.addEventListener('error', reject);

    document.body.appendChild(script);
  });
};

const run = async () => {
  const data = await scriptList();
  const entrypoint = data.entrypoint || 'main';
  
  for (const script of data.scripts) {
    await loadScript(script);
  }
  await Mewlix.run(() => Mewlix.Modules.getModule(entrypoint));
};

run();
