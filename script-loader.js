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
  const entrypoint = data.entrypoint ?? 'main';
  
  for (const script of data.scripts) {
    await loadScript(script);
  }
  await Mewlix.Modules.getModule(entrypoint);
};

run();
