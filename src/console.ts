'use strict';

export default function() {
  /* -------------------------------------
   * Events:
   * ------------------------------------- */
  type InputInfo = {
    fromFile: boolean;
    file?: File;
  };

  /* A custom event for when a user sends input to the console. */
  type InputReceivedEvent = CustomEvent<InputInfo>;

  function inputReceived(file?: File): InputReceivedEvent {
    return new CustomEvent('input-received', {
      detail: { fromFile: file !== undefined, file: file }
    });
  };

  /* -------------------------------------
   * Constants:
   * ------------------------------------- */
  const promptMessage = '>> ';

  const input           = document.getElementById('console-input')      as HTMLInputElement;
  const lines           = document.getElementById('console-lines')      as HTMLUListElement;
  const projectName     = document.getElementById('project-name')       as HTMLSpanElement;
  const projectStatus   = document.getElementById('project-status')     as HTMLSpanElement;
  const arrowButton     = document.getElementById('console-arrow')      as HTMLButtonElement;
  const paperclipInput  = document.getElementById('paperclip-input')    as HTMLInputElement;
  const paperclipButton = document.getElementById('console-paperclip')  as HTMLButtonElement;

  const settingsMenu    = document.getElementById('settings')           as HTMLElement;
  const setColor        = document.getElementById('select-color')       as HTMLInputElement;
  const setErrorColor   = document.getElementById('select-error-color') as HTMLInputElement;
  const showHighlight   = document.getElementById('show-highlight')     as HTMLInputElement;
  const saveLogButton   = document.getElementById('save-log')           as HTMLButtonElement;

  /* -------------------------------------
   * Utils:
   * ------------------------------------- */
  function isEmptyLine(line: string): boolean {
    return /^\n?$/.test(line);
  }

  function dateString(): string {
    return new Date().toJSON().slice(0, 10);
  }

  /* -------------------------------------
   * Console lines:
   * ------------------------------------- */
  function createPrompt(): HTMLSpanElement {
    const span = document.createElement('span');
    span.style.color = setColor.value;
    span.classList.add('console_prompt');

    span.appendChild(document.createTextNode(promptMessage));
    return span;
  }

  function newLine(callback: (line: HTMLLIElement) => void): void {
    const line = document.createElement('li');
    line.classList.add('console_line');
    callback(line);
    lines.appendChild(line);
    scrollDown(lines);
  }

  function scrollDown(elem: HTMLElement) {
    elem.scrollTop = elem.scrollHeight;
  }

  function addMessage(message: string, fromUser: boolean = true): void {
    newLine(line => {
      if (fromUser) {
        line.appendChild(createPrompt());
      }
      line.appendChild(document.createTextNode(message));
    });
  }

  function addError(str: string): void {
    newLine(line => {
      line.style.color = setErrorColor.value;
      line.appendChild(document.createTextNode(`[Console] ${str}`));
    });
  }

  function clearConsole(): void {
    lines.replaceChildren();
  }

  function setStatus(status: string): void {
    projectStatus.textContent = status;
  }

  /* -------------------------------------
   * File downloads:
   * ------------------------------------- */
  function textBlob(text: string): string {
    const blob = new Blob([text], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  }

  function createLineButton(contents: string, name: string | null): HTMLAnchorElement {
    const filename = name ?? `mewlix-${dateString()}.txt`;
    const message = `Download ${JSON.stringify(filename)}`;

    const button = document.createElement('a');
    button.href = textBlob(contents + '\n');
    button.download = filename;
    button.appendChild(document.createTextNode(message));
    return button;
  }

  function addDownloadButton(contents: string, name: string | null): void {
    newLine(line => {
      const button = createLineButton(contents, name);
      line.appendChild(button);
      line.classList.add('file-download');
    });
  }

  /* -------------------------------------
   * Console input:
   * ------------------------------------- */
  function enableButtons(enable: boolean): void {
    arrowButton.disabled = !enable; 
    paperclipInput.disabled = !enable;
    paperclipButton.disabled = !enable; 
  }

  function getInput(): Promise<string> {
    input.disabled = false;
    input.focus();
    enableButtons(true);

    return new Promise(resolve => {
      input.addEventListener(
        'input-received',
        (async (event: InputReceivedEvent) => {
          input.disabled = true;
          enableButtons(false);

          const text = event.detail.fromFile && event.detail.file
            ? await event.detail.file.text()
            : input.value;
          input.value = '';

          const line = event.detail.fromFile && event.detail.file
            ? `<Read file: "${event.detail.file.name}">`
            : text;

          addMessage(line);
          resolve(text);
        }) as any, /* A necessary sacrifice. This is fine. */ 
        { once: true }
      );
    });
  }

  /* -------------------------------------
   * Additional utils:
   * ------------------------------------- */
  function toggleHighlight(highlight: boolean): void {
    if (highlight) {
      input.classList.add('highlight');
    }
    else {
      input.classList.remove('highlight');
    }
  }

  function setProjectName(name: string): void {
    if (name === '') return;
    projectName.textContent = name;
  }

  /* -------------------------------------
   * Paperclip Button:
   * ------------------------------------- */
  function nub<T>(array: T[]): T[] {
    const set = new Set<T>();
    return array.filter(x => {
      if (set.has(x)) return false;
      set.add(x);
      return true;
    });
  }

  function setAcceptedFiles(keys: string[]): void {
    paperclipInput.accept = nub(keys).join(', ')
  }

  /* -------------------------------------
   * Saving Data:
   * ------------------------------------- */
  function getLines(): string {
    return Array.from(lines.getElementsByTagName('li'))
      .filter(li => !li.classList.contains('file-download'))
      .map(li => li.innerText)
      .join('\n');
  }

  function createLogDownload(): () => void {
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
  }

  /* -------------------------------------
   * Screen Overlay
   * ------------------------------------- */
  function createDarkOverlay(): HTMLDivElement {
    const div = document.createElement('div');
    div.classList.add('screen-overlay', 'obscure');
    return div;
  }

  /* -------------------------------------
   * Initialization:
   * ------------------------------------- */
  input.addEventListener('keydown', event => {
    if (event.repeat || event.key !== 'Enter' || event.shiftKey || isEmptyLine(input.value)) return;
    event.preventDefault();
    input.dispatchEvent(inputReceived());
  });

  arrowButton.addEventListener('click', () => {
    if (input.disabled || isEmptyLine(input.value)) return;
    input.dispatchEvent(inputReceived());
  });

  paperclipButton.addEventListener('click', event => {
    event.preventDefault();
    paperclipInput.click();
  });

  paperclipInput.addEventListener('change', () => {
    if (paperclipInput.files?.length === 0) return;
    input.dispatchEvent(inputReceived(paperclipInput.files?.[0]));
  });

  document.getElementById('show-settings')!.addEventListener('click', () => {
    settingsMenu.classList.remove('hide');
    document.body.appendChild(createDarkOverlay());
  });

  document.getElementById('hide-settings')!.addEventListener('click', () => {
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
   * Override 'meow':
   * ------------------------------------- */
  Mewlix.meow = (message: string) => {
    addMessage(message, false);
    return message;
  };

  /* -------------------------------------
   * Standard library:
   * ------------------------------------- */
  const ensure = Mewlix.ensure;

  /* The std.console library documentation can be found on the wiki:
   * > https://github.com/kbmackenzie/mewlix/wiki/Console#the-stdconsole-yarn-ball <
   *
   * It won't be included in this source file to avoid clutter.
   *
   * All standard library functions *should use snake_case*, as
   * they're going to be accessible from within Mewlix. */

  const Console = {
    clear: clearConsole,

    run: async (func: (x: string) => string) => {
      ensure.func('console.run', func);
      while (true) {
        const input = await getInput();
        const output = func(input);
        addMessage(Mewlix.purrify(output), false);
      }
    },

    name: (name: string) => {
      ensure.string('console.name', name);
      setProjectName(name);
    },

    highlight: (enable: boolean) => {
      showHighlight.checked = enable;
      toggleHighlight(enable);
    },

    set_color: (color: string) => {
      ensure.string('console.set_color', color);
      setColor.value = color;
    },

    set_error_color: (color: string) => {
      ensure.string('console.set_error_color', color);
      setErrorColor.value = color;
    },

    accepted_files: (accepted: any) => {
      ensure.shelf('console.accepted_files', accepted);
      setAcceptedFiles(accepted.toArray());
    },

    write_file: (filename: string | null, contents: string) => {
      ensure.string('console.write_file', contents);
      if (filename) {
        ensure.string('console.write_file', filename);
      }
      addDownloadButton(contents, filename);
    },
  };
  const ConsoleLibrary = Mewlix.library('std.console', Console);

  /* Freezing the std.console library, as it's going to be accessible inside Mewlix. */
  Object.freeze(ConsoleLibrary);

  /* -------------------------------------
   * Standard library - Curry:
   * ------------------------------------- */
  const ConsoleCurry = {
    write_file: (filename: string | null) =>
      (contents: string) =>
        Console.write_file(filename, contents),
  };
  const ConsoleCurryLibrary = Mewlix.curryLibrary('std.console.curry', ConsoleLibrary, ConsoleCurry);

  /* Freezing the curry library, as it's going to be accessible inside Mewlix. */
  Object.freeze(ConsoleCurryLibrary);

  /* -------------------------------------
   * Run Console:
   * ------------------------------------- */
  function setRunning(): void {
    setStatus('running: ');
    projectName.classList.remove('hide');
  }

  Mewlix.run = func => {
    try {
      setRunning();
      func();
    }
    catch (error) {
      addError(`Exception caught: ${error}`);
      addError('See the debugging console for more information!');
      throw error;
    }
  };

  /* -------------------------------------
   * Return Console Namespace:
   * ------------------------------------- */
  return [ConsoleLibrary, ConsoleCurryLibrary];
}
