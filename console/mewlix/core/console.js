'use strict';

// A custom event for when a user sends input to the console.
const inputReceived = new Event('input-received');

const consoleInput = document.getElementById('input-box');
const consoleLines = document.getElementById('console-lines');

function addLine(text) {
  const line = document.createElement('li');
  line.appendChild(document.createTextNode(text));
  consoleLines.appendChild(line);
  fixScroll();
}

function fixScroll() {
  const parent = consoleLines.parentNode;
  parent.scrollTop = parent.scrollHeight;
}

function getInput() {
  consoleInput.disabled = false;
  consoleInput.focus();

  return new Promise(resolve => {
    consoleInput.addEventListener(
      'input-received',
      () => {
        const text = consoleInput.value;
        consoleInput.value = '';
        consoleInput.disabled = true;

        addLine(text);
        resolve(text);
      }, 
      { once: true }
    );
  });
}

function clearConsole() {
  consoleLines.replaceChildren();
}

consoleInput.addEventListener('keyup', event => {
  if (event.key !== 'Enter' || consoleInput.value === '') return;
  consoleInput.dispatchEvent(inputReceived);
});

// Temporarily adding to global scope for easier debugging.
// Todo: Comment these out.
window.mewlixInput = getInput;
window.mewlixClear = clearConsole;

export { addLine, fixScroll, getInput, clearConsole };
