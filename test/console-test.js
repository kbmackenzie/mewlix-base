import TestSuite from './test-suite.js';

function consoleTests(mewlix) {
  'use strict';
  const test = new TestSuite();
  const console_ = mewlix.Console;

  test.run('console.name', () => {
    const name = 'console test suite';
    console_.name(name);
    return document.getElementById('project-name').innerText === name;
  });

  test.run('console.highlight', () => {
    console_.highlight(true);
    return document.getElementById('show-highlight').checked;
  });

  test.run('console.set_color', () => {
    const color = '#fb2bff';
    console_.set_color(color);
    return document.getElementById('select-color').value === color;
  });

  test.run('console.accepted', () => {
    const extensions = mewlix.API.shelf('.txt', '.md');
    console_.accepted_files(extensions);
    return document.getElementById('file-input').accept === extensions.toArray().join(', ');
  });

  test.run('console.write_file', () => {
    const name = 'this-name-should-be-visible.txt';
    const contents = 'example file';
    console_.write_file(name, contents);
    return true;
  });

  return {
    summary: test.summary(),
    message: test.message(),
    logFailures: () => test.logFailures(mewlix),
  };
}

export default function(mewlix) {
  let state = 'start';

  const prompt = {
    ['start']: 'Enter any input to begin testing.',
    ['clear']: 'Enter any input to clear the console.',
  };

  const actions = {
    ['start']: (input) => {
      mewlix.meow(`Successfully received input '${input}'`);
      mewlix.meow('Running tests...');

      const result = consoleTests(mewlix);
      result.logFailures();
      mewlix.meow(result.message);
      state = 'clear';
    },
    ['clear']: (_) => {
      mewlix.Console.clear();

      const success = document.getElementById('console-lines').childNodes.length === 0;
      mewlix.meow(success
        ? 'Successfully cleared the console.'
        : 'Failed to clear the console.'
      );
      state = 'start';
    },
  };

  mewlix.Modules.addModule('main', () => {
    mewlix.meow('Running tests...');
    mewlix.Console.run((input) => actions[state](input), () => prompt[state]);
  });
}
