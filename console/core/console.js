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

/* -------------------------------------
 * Events:
 * ------------------------------------- */
// A custom event for when a user sends input to the console.
const inputReceived = file => new CustomEvent('input-received', {
  detail: { fromFile: file !== undefined, file: file },
});

/* -------------------------------------
 * Constants:
 * ------------------------------------- */
const promptMessage = '=^-x-^= $ ';

const consoleBox        = document.getElementById('console');
const input             = document.getElementById('console-input');
const lines             = document.getElementById('console-lines');
const projectName       = document.getElementById('project-name');
const arrowButton       = document.getElementById('console-arrow');
const paperclipInput    = document.getElementById('paperclip-input');
const paperclipButton   = document.getElementById('console-paperclip');

const settingsMenu      = document.getElementById('menu-settings');
const promptColor       = document.getElementById('select-color');
const seePrompt         = document.getElementById('see-prompt');
const showHighlight     = document.getElementById('show-highlight');
const consoleOpacity    = document.getElementById('select-opacity');
const selectBackground  = document.getElementById('select-background');

/* -------------------------------------
 * Console functionality:
 * ------------------------------------- */
const createPrompt = () => {
  const span = document.createElement('span');
  span.style.color = promptColor.value;
  span.classList.add('console__prompt');

  span.appendChild(document.createTextNode(promptMessage));
  return span;
};

const addLine = (text, fromUser = true) => {
  const line = document.createElement('li');

  if (fromUser && seePrompt.checked) {
    line.appendChild(createPrompt());
  }

  line.appendChild(document.createTextNode(text));
  lines.appendChild(line);
  scrollDown(lines.parentNode);
};

const addError = text => {
  const line = document.createElement('li');
  line.style.color = '#c90e17';
  line.appendChild(document.createTextNode(`[Console] ${text}`));

  lines.appendChild(line);
  scrollDown(lines.parentNode);
};

const scrollDown = elem => {
  elem.scrollTop = elem.scrollHeight;
};

const enableButtons = enable => {
  if (enable) {
    arrowButton.classList.add('enabled');
    paperclipInput.disabled = false;
    paperclipButton.classList.add('enabled');
  }
  else {
    arrowButton.classList.remove('enabled');
    paperclipInput.disabled = true;
    paperclipButton.classList.remove('enabled');
  }
};

const getInput = () => {
  input.disabled = false;
  input.focus();
  enableButtons(true);

  return new Promise(resolve => {
    input.addEventListener(
      'input-received',
      async event => {
        input.disabled = true;
        enableButtons(false);

        const text = (event.detail.fromFile)
          ? await event.detail.file.text()
          : input.value;
        input.value = '';

        const line = (event.detail.fromFile)
          ? `<Read file: "${event.detail.file.name}">`
          : text;

        addLine(line);
        resolve(text);
      }, 
      { once: true }
    );
  });
};

const clearConsole = () => {
  lines.replaceChildren();
};

const toggleHighlight = highlight => {
  if (highlight)
    input.classList.add('console__input--highlight');
  else
    input.classList.remove('console__input--highlight');
};

const setOpacity = value => {
  consoleBox.style.opacity = `${value}%`;
};

const setProjectName = name => {
  if (name === '') return;
  projectName.textContent = name;
};

/* -------------------------------------
 * Paperclip Button:
 * ------------------------------------- */
const nub = array => {
  const set = new Set();
  return array.filter(x => {
    if (set.has(x)) return false;
    set.add(x);
    return true;
  });
};

const setAccepted = keys => {
  paperclipInput.accept = nub(keys).join(', ')
};

/* -------------------------------------
 * Background:
 * ------------------------------------- */
const createBackground = () => {
  const catBackground = document.createElement('div');
  catBackground.id = 'cat-background';
  catBackground.classList.add('cat-background');
  return catBackground;
};

const setBackground = path => fetch(path)
  .then(response => response.blob())
  .then(blob => {
    const catBackground = document.getElementById('cat-background');
    catBackground.style.backgroundImage = `url('${URL.createObjectURL(blob)}')`;
  });

const setBackgroundLocal = file => {
  const catBackground = document.getElementById('cat-background');
  catBackground.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
};

const obscureOverlay = () => {
  const div = document.createElement('div');
  div.classList.add('screen-overlay', 'obscure');
  return div;
};

/* -------------------------------------
 * Initialization:
 * ------------------------------------- */
input.addEventListener('keyup', event => {
  if (event.key !== 'Enter' || input.value === '') return;
  input.dispatchEvent(inputReceived());
});

arrowButton.addEventListener('click', () => {
  if (input.disabled || input.value === '') return;
  input.dispatchEvent(inputReceived());
});

paperclipInput.addEventListener('change', () => {
  if (paperclipInput.files.length === 0) return;
  input.dispatchEvent(inputReceived(paperclipInput.files[0]));
});

document.getElementById('show-settings').addEventListener('click', () => {
  settingsMenu.classList.remove('hide');
  document.body.appendChild(obscureOverlay());
});

document.getElementById('hide-settings').addEventListener('click', () => {
  settingsMenu.classList.add('hide');
  Array.from(document.getElementsByClassName('obscure')).forEach(x => x.remove());
});

consoleOpacity.addEventListener('change', () => {
  setOpacity(consoleOpacity.value);
});

showHighlight.addEventListener('change', () => {
  toggleHighlight(showHighlight.checked);
});

selectBackground.addEventListener('change', () => {
  if (selectBackground.files.length === 0) return;
  setBackgroundLocal(selectBackground.files[0]);
});

/* -------------------------------------
 * Initialization (electric boogaloo):
 * ------------------------------------- */
document.body.appendChild(createBackground());
setOpacity(consoleOpacity.value);
toggleHighlight(showHighlight.checked);

/* -------------------------------------
 * Statements:
 * ------------------------------------- */
Mewlix.meow = message => {
  const str = Mewlix.purrify(message);
  addLine(str, false);
  return str;
};

Mewlix.listen = question => {
  if (!Mewlix.isNothing(question)) {
    addLine(Mewlix.purrify(question), false);
  }
  return getInput();
};

/* -------------------------------------
 * Standard library:
 * ------------------------------------- */
const ensure = Mewlix.ensure;
const where  = Mewlix.where;

/* The std library documentation can be found on the wiki:
 * > https://github.com/KBMackenzie/mewlix/wiki/Console#the-stdconsole-yarn-ball <
 *
 * It won't be included in this source file to avoid clutter.
 *
 * All standard library functions *should use snake_case*, as
 * they're going to be accessible from within Mewlix. */

Mewlix.Console = Mewlix.library('std.console', {
  clear: clearConsole,

  name: name => {
    where('console.name')(ensure.string(name));
    setProjectName(name);
  },

  background: async path => {
    where('console.background')(ensure.string(path));
    await setBackground(path);
  },

  opacity: value => {
    const clamped = Mewlix.clamp(Math.floor(value), 0, 100);
    consoleOpacity.value = clamped.toString();
    setOpacity(clamped);
  },

  highlight: enable => {
    showHighlight.checked = enable;
    toggleHighlight(enable);
  },

  prompt_color: color => {
    where('console.prompt_color')(ensure.string(color));
    promptColor.value = color;
  },

  see_prompt: see => {
    where('console.see_prompt')(ensure.boolean(see));
    seePrompt.checked = see;
  },

  accepted_files: accepted => {
    where('console.accepted_files')(ensure.shelf(accepted));
    setAccepted(accepted.toArray());
  },
});

/* Freezing the std.console library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Console);

/* -------------------------------------
 * Run Console:
 * ------------------------------------- */
Mewlix.run = async f => {
  try {
    await f();
  }
  catch (error) {
    addError(`Exception caught: ${error}`);
    addError(`See the Javascript console for more information!`);
    throw error;
  }
};
