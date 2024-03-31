/* Mewlix is a cat-themed esoteric programming language. 🐱
 * THis is a core file from Mewlix's base library.
 * 
 * Learn more at:
 * > https://github.com/KBMackenzie/mewlix <
 *
 * Copyright 2024 KBMackenzie. Released under the MIT License.
 * The full license details can be found at:
 * > https://github.com/KBMackenzie/mewlix-base/blob/main/LICENSE < */

'use strict';

export default async (options = {}) => {
  const { before, meow, listen, cleanUp } = options;

  await import('./core/mewlix.js');
  if (meow)   { Mewlix.meow   = meow;   }
  if (listen) { Mewlix.listen = listen; }
  await before?.(Mewlix);

  const run = await import('./core/run-mewlix.js');
  await run();
  if (cleanUp) { delete globalThis.Mewlix; }
};
