/* -------------------------
 * script loader 
 * ------------------------- */

const scriptList = () => fetch('./script-list.json')
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
