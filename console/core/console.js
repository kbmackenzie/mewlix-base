'use strict';

/* -------------------------------------
 * Constants:
 * ------------------------------------- */
/* A custom event for when a user sends input to the console. */
const inputReceived = new Event('input-received');

/* The console prompt string: */
const promptMessage = '=^-x-^= $ ';

/* Console: */
const consoleBox = document.getElementById('console');
const input = document.getElementById('console-input');
const lines = document.getElementById('console-lines');
const projectName = document.getElementById('project-name');
const inputButton = document.getElementById('console-arrow');
const showSettings = document.getElementById('show-settings');

/* Background: */
const catBackground = document.getElementById('cat-background');
const imageCredits = document.getElementById('image-credits');

/* Settings menu : */
const settings = document.getElementById('menu-settings');
const exitSettings = document.getElementById('exit-settings');

/* Settings options: */
const promptColor = document.getElementById('select-color');
const hidePrompt = document.getElementById('hide-prompt');
const showHighlight = document.getElementById('show-highlight');
const consoleOpacity = document.getElementById('select-opacity');
const selectBackground = document.getElementById('select-background');

/* -------------------------------------
 * Console functionality:
 * ------------------------------------- */
const createPrompt = () => {
  const span = document.createElement('span');
  span.style.color = promptColor.value;
  span.classList.add('console__prompt');
  span.appendChild(document.createTextNode(promptMessage));
  return span;
}

const addLine = (text, fromUser = true) => {
  const line = document.createElement('li');
  if (fromUser && !hidePrompt.checked) {
    line.appendChild(createPrompt());
  }
  line.appendChild(document.createTextNode(text));

  lines.appendChild(line);
  fixScroll();
}

const fixScroll = () => {
  const parent = lines.parentNode;
  parent.scrollTop = parent.scrollHeight;
}

const getInput = () => {
  input.disabled = false;
  input.focus();

  return new Promise(resolve => {
    input.addEventListener(
      'input-received',
      () => {
        const text = input.value;
        input.value = '';
        input.disabled = true;

        addLine(text);
        resolve(text);
      }, 
      { once: true }
    );
  });
}

const clearConsole = () => {
  lines.replaceChildren();
};

const toggleHighlight = () => {
  if (showHighlight.checked)
    input.classList.add('console__input--highlight');
  else
    input.classList.remove('console__input--highlight');
};

const setOpacity = () => {
  consoleBox.style.opacity = `${consoleOpacity.value}%`;
};

const setProjectName = name => {
  if (name === '') return;
  projectName.textContent = name;
};

const setBackground = path => {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(path);
    reader.addEventListener('load', () => {
      catBackground.style.backgroundImage = `url('${reader.result}')`;
      imageCredits.classList.add('hide');
      resolve();
    });
  });
};

/* -------------------------------------
 * Events:
 * ------------------------------------- */
input.addEventListener('keyup', event => {
  if (event.key !== 'Enter' || input.value === '') return;
  input.dispatchEvent(inputReceived);
});

inputButton.addEventListener('click', () => {
  if (input.value === '') return;
  input.dispatchEvent(inputReceived);
});

showSettings.addEventListener('click', () => {
  settings.classList.remove('hide');
});

exitSettings.addEventListener('click', () => {
  settings.classList.add('hide');
});

consoleOpacity.addEventListener('change', setOpacity);
showHighlight.addEventListener('change', toggleHighlight);

selectBackground.addEventListener('change', () => {
  if (selectBackground.files.length === 0) return;
  setBackground(selectBackground.files[0]);
});

/* -------------------------------------
 * Initialize:
 * ------------------------------------- */
setOpacity();
toggleHighlight();

// Temporarily adding to global scope for easier debugging.
// Todo: Comment these out.
window.mewlixInput = getInput;
window.mewlixClear = clearConsole;
window.mewlixProject = setProjectName;

export { addLine, fixScroll, getInput, clearConsole };
