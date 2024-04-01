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
const promptMessage = '>> ';

const input             = document.getElementById('console-input');
const lines             = document.getElementById('console-lines');
const projectName       = document.getElementById('project-name');
const arrowButton       = document.getElementById('console-arrow');
const paperclipInput    = document.getElementById('paperclip-input');
const paperclipButton   = document.getElementById('console-paperclip');

const settingsMenu      = document.getElementById('settings');
const setColor          = document.getElementById('select-color');
const setErrorColor     = document.getElementById('select-error-color');
const showHighlight     = document.getElementById('show-highlight');
const saveLogButton     = document.getElementById('save-log');

/* -------------------------------------
 * Utils:
 * ------------------------------------- */
const removeTrailingNewline = text => {
  return text.replace(/\n$/, '');
};

const dateString = () => {
  return new Date().toJSON().slice(0, 10);
};

/* -------------------------------------
 * Console lines:
 * ------------------------------------- */
const createPrompt = () => {
  const span = document.createElement('span');
  span.style.color = setColor.value;
  span.classList.add('console_prompt');

  span.appendChild(document.createTextNode(promptMessage));
  return span;
};

const newLine = callback => {
  const line = document.createElement('li');
  line.classList.add('console_line');
  callback(line);
  lines.appendChild(line);
  scrollDown(lines);
};

const scrollDown = elem => {
  elem.scrollTop = elem.scrollHeight;
};

const addMessage = (str, fromUser = true) => {
  const message = removeTrailingNewline(str);
  newLine(line => {
    if (fromUser) {
      line.appendChild(createPrompt());
    }
    line.appendChild(document.createTextNode(message));
  });
};

const addError = str => {
  newLine(line => {
    line.style.color = setErrorColor.value;
    line.appendChild(document.createTextNode(`[Console] ${str}`));
  });
};

const clearConsole = () => {
  lines.replaceChildren();
};

/* -------------------------------------
 * File downloads:
 * ------------------------------------- */
const textBlob = text => {
  const blob = new Blob([text], { type: 'text/plain' });
  return URL.createObjectURL(blob);
};

const createLineButton = (contents, name) => {
  const filename = name ?? `mewlix-${dateString()}.txt`;
  const message = `Download ${JSON.stringify(filename)}`;

  const button = document.createElement('a');
  button.href = textBlob(contents + '\n');
  button.download = filename;
  button.appendChild(document.createTextNode(message));
  return button;
};

const addDownloadButton = (contents, name) => {
  newLine(line => {
    const button = createLineButton(contents, name);
    line.appendChild(button);
    line.classList.add('file-download');
  });
};

/* -------------------------------------
 * Console input:
 * ------------------------------------- */
const enableButtons = enable => {
  arrowButton.disabled = !enable; 
  paperclipInput.disabled = !enable;
  paperclipButton.disabled = !enable; 
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

        addMessage(line);
        resolve(text);
      }, 
      { once: true }
    );
  });
};

/* -------------------------------------
 * Additional utils:
 * ------------------------------------- */
const toggleHighlight = highlight => {
  if (highlight) {
    input.classList.add('highlight');
  }
  else {
    input.classList.remove('highlight');
  }
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

const setAcceptedFiles = keys => {
  paperclipInput.accept = nub(keys).join(', ')
};

/* -------------------------------------
 * Saving Data:
 * ------------------------------------- */
const getLines = () => Array.from(lines.getElementsByTagName('li'))
  .filter(li => !li.classList.contains('file-download'))
  .map(li => li.innerText)
  .join('\n');

const createLogDownload = () => {
  const filename = `mewlix-console-log-${dateString()}.txt`;
  const content = getLines() + '\n';

  const button = document.createElement('a');
  button.href = textBlob(content);
  button.download = filename;
  button.classList.add('hide');
  document.body.appendChild(button);

  return () => {
    button.click();
    button.remove();
  };
};

/* -------------------------------------
 * Screen Overlay
 * ------------------------------------- */
const createDarkOverlay = () => {
  const div = document.createElement('div');
  div.classList.add('screen-overlay', 'obscure');
  return div;
};

/* -------------------------------------
 * Initialization:
 * ------------------------------------- */
input.addEventListener('keyup', event => {
  if (event.key !== 'Enter' || event.shiftKey || input.value === '') return;
  input.dispatchEvent(inputReceived());
});

arrowButton.addEventListener('click', () => {
  if (input.disabled || input.value === '') return;
  input.dispatchEvent(inputReceived());
});

paperclipButton.addEventListener('click', event => {
  event.preventDefault();
  paperclipInput.click();
});

paperclipInput.addEventListener('change', () => {
  if (paperclipInput.files.length === 0) return;
  input.dispatchEvent(inputReceived(paperclipInput.files[0]));
});

document.getElementById('show-settings').addEventListener('click', () => {
  settingsMenu.classList.remove('hide');
  document.body.appendChild(createDarkOverlay());
});

document.getElementById('hide-settings').addEventListener('click', () => {
  settingsMenu.classList.add('hide');
  Array.from(document.getElementsByClassName('obscure')).forEach(x => x.remove());
});

showHighlight.addEventListener('change', () => {
  toggleHighlight(showHighlight.checked);
});

saveLogButton.addEventListener('click', () => {
  createLogDownload()();
});

/* -------------------------------------
 * Initialization (electric boogaloo):
 * ------------------------------------- */
toggleHighlight(showHighlight.checked);

/* -------------------------------------
 * Statements:
 * ------------------------------------- */
Mewlix.meow = message => {
  addMessage(message, false);
  return message;
};

Mewlix.listen = question => {
  if (!Mewlix.isNothing(question)) {
    addMessage(question, false);
  }
  return getInput();
};

/* -------------------------------------
 * Standard library:
 * ------------------------------------- */
const ensure = Mewlix.ensure;

/* The std.console library documentation can be found on the wiki:
 * > https://github.com/KBMackenzie/mewlix/wiki/Console#the-stdconsole-yarn-ball <
 *
 * It won't be included in this source file to avoid clutter.
 *
 * All standard library functions *should use snake_case*, as
 * they're going to be accessible from within Mewlix. */

Mewlix.Console = Mewlix.library('std.console', {
  clear: clearConsole,

  name: name => {
    ensure.string('console.name', name);
    setProjectName(name);
  },

  highlight: enable => {
    showHighlight.checked = enable;
    toggleHighlight(enable);
  },

  set_color: color => {
    ensure.string('console.set_color', color);
    setColor.value = color;
  },

  set_error_color: color => {
    ensure.string('console.set_error_color', color);
    setErrorColor.value = color;
  },

  accepted_files: accepted => {
    ensure.shelf('console.accepted_files', accepted);
    setAcceptedFiles(accepted.toArray());
  },

  write_file: (filename, contents) => {
    ensure.string('console.write_file', contents);
    if (filename) {
      ensure.string('console.write_file', filename);
    }
    addDownloadButton(contents, filename);
  },
});

/* Freezing the std.console library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Console);

/* -------------------------------------
 * Standard library - Curry:
 * ------------------------------------- */
Mewlix.ConsoleCurry = Mewlix.curryLibrary('std.console.curry', Mewlix.Console, {
  write_file: filename => contents => Mewlix.Console.write_file(filename, contents),
});

/* Freezing the curry library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.ConsoleCurry);

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
