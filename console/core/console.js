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

/* Settings menu : */
const settings = document.getElementById('menu-settings');
const exitSettings = document.getElementById('exit-settings');

/* Settings options: */
const promptColor = document.getElementById('select-color');
const hidePrompt = document.getElementById('hide-prompt');
const showOutline = document.getElementById('select-outline');
const consoleOpacity = document.getElementById('select-opacity');

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
}

const setProjectName = name => {
  if (name === '') return;
  projectName.textContent = name;
}

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

consoleOpacity.addEventListener('change', () => {
  consoleBox.style.opacity = `${consoleOpacity.value}%`;
});

showOutline.addEventListener('change', () => {
  if(showOutline.checked) {
    inputBox.classList.add('console__input--outline');
  }
  else {
    inputBox.classList.remove('console__input--outline');
  }
});

// Temporarily adding to global scope for easier debugging.
// Todo: Comment these out.
window.mewlixInput = getInput;
window.mewlixClear = clearConsole;
window.mewlixProject = setProjectName;

export { addLine, fixScroll, getInput, clearConsole };
