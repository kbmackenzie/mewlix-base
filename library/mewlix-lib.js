'use strict';

export default async (options = {}) => {
  const { before, meow, listen, cleanUp } = options;

  await import('./core/mewlix.js');
  if (meow)   { Mewlix.meow   = meow;   }
  if (listen) { Mewlix.listen = listen; }
  await before?.();

  Mewlix.run = async f => {
    await f();
    if (cleanUp) { delete globalThis.Mewlix; }
  };
  await import('./core/run-mewlix.js');
};
