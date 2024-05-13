'use strict';

const scriptList = () => fetch('./core/script-list.json')
  .then(response => response.json());

const loadScript = src => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.type = 'module';
  script.src  = src;
  script.addEventListener('load', resolve);
  script.addEventListener('error', reject);

  document.body.appendChild(script);
});

const setTitle = name => {
  if (!name) return;
  document.title = name;
};

export default async () => {
  const data = await scriptList();
  setTitle(data.title);
  const entrypoint = data.entrypoint || 'main';
  
  for (const script of data.scripts) {
    await loadScript(script);
  }
  await Mewlix.run(() => Mewlix.Modules.getModule(entrypoint));
};
