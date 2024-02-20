// -------------------------------------------------------
// Script Loader 
// -------------------------------------------------------
const scriptLoader = function scriptLoader(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.setAttribute('src', src);
    script.addEventListener('load', resolve);
    script.addEventListener('error', reject);

    document.body.appendChild(script);
  });
};


