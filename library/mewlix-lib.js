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
