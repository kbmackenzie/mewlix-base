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
const ensure = Mewlix.ensure;
const where  = Mewlix.where;
const clamp  = Mewlix.clamp;

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
const percentageToByte = p => Math.floor((255 * p) / 100);
const byteToPercentage = b => Math.floor((100 * b) / 255);

/* -----------------------------------
 * Initializing Canvas:
 * ----------------------------------- */
const canvas  = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

const canvasWidth  = canvas.width;
const canvasHeight = canvas.height;

const virtualWidth  = 128;
const virtualHeight = 128;

const sizeModifier = Math.floor(canvas.width / virtualWidth);

const spriteMap = new Map();
const audioMap  = new Map();

const gridSlotWidth  = 16;
const gridSlotHeight = 16;
const gridColumns  = Math.floor(virtualWidth  / gridSlotWidth );
const gridRows     = Math.floor(virtualHeight / gridSlotHeight);

/* -----------------------------------
 * Loading Images:
 * ----------------------------------- */
/* Load an image file as ImageBitmap. */
const loadImage = (path, rect) => fetch(path)
  .then(response => response.blob())
  .then(blob => {
    if (!rect) return createImageBitmap(blob);
    return createImageBitmap(
      blob,
      rect?.x ?? 0,
      rect?.y ?? 0,
      rect?.width  ?? gridSlotWidth,
      rect?.height ?? gridSlotHeight,
    );
  });

/* Load an image file as a sprite + add it to spriteMap. */
const loadSprite = (key, path, rect) => loadImage(path, rect)
  .then(image => {
    spriteMap.set(key, image);
    return image;
  });

/* Load a spritesheet image and divide it into sprites. */
const fromSpritesheet = async (path, frames) => {
  const sheet = await loadImage(path);
  for (const frame of frames) {
    const { key, rect } = frame;
    const sprite = await createImageBitmap(sheet, rect.x, rect.y, rect.width, rect.height);
    spriteMap.set(key, sprite);
  }
};

/* -----------------------------------
 * Drawing:
 * ----------------------------------- */
const getSprite = key => {
  if (!spriteMap.has(key)) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `No loaded image resource associated with key "${key}"!`);
  }
  return spriteMap.get(key);
}

const drawSprite = (key, x, y) => {
  const image = getSprite(key);
  context.drawImage(
    image,
    Math.floor(x ?? 0) * sizeModifier,
    Math.floor(y ?? 0) * sizeModifier,
    image.width  * sizeModifier,
    image.height * sizeModifier,
  );
};

const drawRect = (rect, color) => {
  context.fillStyle = color?.toString() ?? 'black';
  context.fillRect(
    rect.x      * sizeModifier,
    rect.y      * sizeModifier,
    rect.width  * sizeModifier,
    rect.height * sizeModifier,
  );
};

const fillCanvas = (color) => {
  context.fillStyle = color?.toString() ?? 'black';
  context.fillRect(0, 0, canvasWidth, canvasHeight);
};

/* -----------------------------------
 * Loading Fonts:
 * ----------------------------------- */
const loadFont = (name, url) => new FontFace(name, `url(${url})`)
  .load()
  .then(font => {
    document.fonts.add(font);
  });

/* -----------------------------------
 * Drawing Fonts:
 * ----------------------------------- */
const defaultFont = 'Munro';
const defaultFontSize = 8;

const setupText = options => {
  const font = options?.font ?? defaultFont;
  const fontSize = Math.floor(options?.size ?? defaultFontSize);

  context.font = `${fontSize * sizeModifier}px ${font}, monospace`;
  context.fillStyle = options?.color?.toString() ?? 'black';
  context.textAlign = 'start';
  context.textBaseline = 'top';
};

const drawText = (message, x = 0, y = 0, options = null) => {
  setupText(options);
  context.fillText(
    message,
    Math.floor(x) * sizeModifier,
    Math.floor(y) * sizeModifier,
  );
};

const measureText = (message, options) => {
  setupText(options);
  const metrics = context.measureText(message);

  const width  = metrics.width / sizeModifier;
  const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / sizeModifier;

  return new Mewlix.Box([
    ["width"  , Math.round(width)  ],
    ["height" , Math.round(height) ],
  ]);
};

/* -----------------------------------
 * Initializing Audio:
 * ----------------------------------- */
const audioContext = new AudioContext();
const masterVolume = audioContext.createGain();
const compressor   = audioContext.createDynamicsCompressor();

masterVolume.connect(compressor).connect(audioContext.destination);

const musicVolume = audioContext.createGain();
const sfxVolume   = audioContext.createGain();

musicVolume.connect(masterVolume);
sfxVolume.connect(masterVolume);
masterVolume.gain.setValueAtTime(0.5, audioContext.currentTime);

// Mutable state my behated
let musicSource = null;
let sfxSource   = null;

/* -----------------------------------
 * Loading Audio:
 * ----------------------------------- */
const loadAudio = (key, path) => fetch(path)
  .then(response => response.arrayBuffer())
  .then(buffer => audioContext.decodeAudioData(buffer))
  .then(audio => {
    audioMap.set(key, audio);
    return audio;
  });

const getBuffer = key => {
  if (!audioMap.has(key)) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `No existing audio track is associated with the key ${key}!`);
  }
  return audioMap.get(key);
};

/* -----------------------------------
 * Playing Audio:
 * ----------------------------------- */
const playMusic = key => {
  musicSource?.stop();
  const buffer = getBuffer(key);

  musicSource = audioContext.createBufferSource();
  musicSource.buffer = buffer; 
  musicSource.loop = true;
  musicSource.connect(musicVolume);
  musicSource.start();
};

const playSfx = key => {
  sfxSource?.stop();
  const buffer = getBuffer(key);

  sfxSource = audioContext.createBufferSource();
  sfxSource.buffer = buffer; 
  sfxSource.connect(sfxVolume);
  sfxSource.start();
};

const stopMusic = () => {
  musicSource?.stop();
  musicSource = null;
};

const stopSfx = () => {
  sfxSource?.stop();
  sfxSource = null;
};

const setVolumeOf = (node, volume) => {
  node.gain.cancelScheduledValues(audioContext.currentTime);
  node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
  node.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.5);
};

/* -----------------------------------
 * Keyboard Events
 * ----------------------------------- */
const keysDown = new Set();
const keyQueue = new Set();

window.addEventListener('keydown', event => {
  if (!keysDown.has(event.key)) { keyQueue.add(event.key); }
  keysDown.add(event.key);
}, { passive: true });

window.addEventListener('keyup', event => {
  keysDown.delete(event.key);
}, { passive: true });

const isKeyPressed  = key => keyQueue.has(key);
const isKeyDown     = key => keysDown.has(key);
const isKeyUp       = key => !keysDown.has(key);

const flushKeyQueue = () => {
  keyQueue.clear();
};

/* -----------------------------------
 * Mouse Events:
 * ----------------------------------- */
let mouseX = 0;
let mouseY = 0;

let mouseClick = false;
let mouseDown  = false;

/* A big thanks to this StackOverflow answer for saving my life:
 * https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas/17130415#17130415 */

canvas.addEventListener('mousemove', event => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (event.clientX - rect.left) * (virtualWidth / rect.width);
  mouseY = (event.clientY - rect.top) * (virtualHeight / rect.height);
});

canvas.addEventListener('mousedown', event => {
  if (event.button !== 0) return;

  if (!mouseDown) { mouseClick = true; }
  mouseDown = true;
});

canvas.addEventListener('mouseup', event => {
  if (event.button !== 0) return;
  mouseDown = false;
  mouseClick = false;
});

const isMousePressed  = () => mouseClick;
const isMouseDown     = () => mouseDown;

const flushClick = () => { mouseClick = false; };

/* -----------------------------------
 * Core Utility:
 * ----------------------------------- */
/* A clowder type for a 2-dimensional vector.
 * Can represent a point in a 2D world. */
class Vector2 extends Mewlix.Clowder {
  constructor() {
    super();

    this.wake = (function wake(x, y) {
      where('Vector2.wake')(ensure.all.number(x, y));
      this.x = x;
      this.y = y;
      return this;
    }).bind(this);

    this.add = (function add(that) {
      return new Vector2().wake(this.x + that.x, this.y + that.y);
    }).bind(this);

    this.mul = (function mul(that) {
      return new Vector2().wake(this.x + that.x, this.y + that.y);
    }).bind(this);

    this.distance = (function distance(that) {
      return Math.sqrt((that.x - this.x) ** 2 + (that.y - this.y) ** 2);
    }).bind(this);

    this.dot = (function dot(that) {
      return this.x * that.x + this.y * that.y;
    }).bind(this);

    this.clamp = (function clamp(min, max) {
      const x = clamp(this.x, min.x, max.x);
      const y = clamp(this.y, min.y, max.y);
      return new Vector2().wake(x, y);
    }).bind(this);
  }
}

/* A clowder type for a 2-dimensional rectangle.
 * Can represent a region in a 2-dimensional plane. */
class Rectangle extends Mewlix.Clowder {
  constructor() {
    super();

    this.wake = (function wake(x, y, width, height) {
      where('Rectangle.wake')(
        ensure.all.number(x, y, width, height)
      );
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      return this;
    }).bind(this);

    this.contains = (function contains(point) {
      return (point.x >= this.x)
        && (point.y >= this.y)
        && (point.x < this.x + this.width)
        && (point.y < this.y + this.height);
    }).bind(this);

    this.collides = (function collides(rect) {
      return (this.x < rect.x + rect.width)
        && (this.y < rect.y + rect.height)
        && (this.x + this.width > rect.x)
        && (this.y + this.height > rect.height);
    }).bind(this);
  }
}

/* A clowder to represent a grid slot.
 * The row and column numbers are clamped in .wake()! */
class GridSlot extends Mewlix.Clowder {
  constructor() {
    super();

    this.wake = (function wake(row, column) {
      this.row    = clamp(row,    0, gridRows - 1);
      this.column = clamp(column, 0, gridColumns - 1);
      return this;
    }).bind(this);

    this.position = (function position() {
      return slotPoint(this.row, this.column);
    }).bind(this);
  }
}

/* Convert world position to a grid slot. */
const gridSlot = (x, y) => {
  const row = Math.min(y / gridSlotHeight);
  const col = Math.min(x / gridSlotWidth);
  return new GridSlot().wake(row, col);
};

/* Convert grid slot to world position. */
const slotPoint = (row, col) => {
  return new Vector2().wake(
    col * gridSlotWidth,
    row * gridSlotHeight,
  );
};

/* -----------------------------------
 * Game Loop
 * ----------------------------------- */
let deltaTime = 0;      // Delta time, in seconds!
let thumbnail = null;   // Callback function to generate a thumbnail;

const awaitClick = () => new Promise(resolve => {
  canvas.addEventListener(
    'click',
    () => audioContext.resume().then(resolve),
    { once: true }
  )
});

const drawPlay = async () => {
  const image = await loadImage('/core-assets/mewlix-play.png');
  context.fillStyle = 'rgb(0 0 0 / 50%)';
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(image, 0, 0);
};

const init = async (callback) => {
  where('graphic.init')(ensure.func(callback));
  await loadFont('Munro', '/core-assets/fonts/Munro/munro.ttf');

  const nextFrame = () => new Promise(resolve => {
    window.requestAnimationFrame(resolve);
  });

  const run = async () => {
    let lastFrame; // Last frame's timestamp, in milliseconds.

    await thumbnail?.();
    await drawPlay();
    await awaitClick();
    flushKeyQueue(); flushClick();

    while (true) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      await callback();
      flushKeyQueue(); flushClick();
      const now = await nextFrame();
      lastFrame ??= now;

      deltaTime = (now - lastFrame) / 1000;
      lastFrame = now;
    }
  };

  await run();
};

/* -----------------------------------
 * Generic Loading:
 * ----------------------------------- */
let imageExtensions = new Set([
  'png',
  'jpg',
  'bmp',
  'jpeg',
]);

let audioExtensions = new Set([
  'mp3',
  'wav',
  'ogg',
]);

const fontExtensions = new Set([
  'ttf',
  'otf',
  'woff',
  'woff2',
]);

const getExtensionOf = path => {
  return /\.([a-zA-Z0-9]{3,4})$/.exec(path)?.[1];
};

const loadAny = async (key, path, options) => {
  const extension = getExtensionOf(path)?.toLowerCase();
  if (!extension) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `Couldn't parse file extension in filepath "${path}"!`);
  }

  if (imageExtensions.has(extension)) {
    await loadSprite(key, path, options);
    return;
  }

  if (audioExtensions.has(extension)) {
    await loadAudio(key, path);
    return;
  }

  if (fontExtensions.has(extension)) {
    await loadFont(key, path);
    return;
  }

  throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
    `Unrecognized file format "${extension}" in 'load' function!`);
};

/* -----------------------------------
 * Utility Functions:
 * ----------------------------------- */
const lerp = (start, end, x) => start + (end - start) * x;

/* -----------------------------------
 * Additional Clowders:
 * ----------------------------------- */
/* All of the clowders in this section use *snake_case* naming for methods and properties.
 * This is because they'll be available inside of Mewlix! */

/* Color container, wrapping a RGBA color value.
 * It accepts an opacity value too, in percentage. */
class Color extends Mewlix.Clowder {
  constructor() {
    super();

    this.wake = (function wake(red, green, blue, opacity = 100) {
      where('Color.wake')(
        ensure.all.number(red, green, blue, opacity)
      );
      this.red      = clamp(red, 0, 255);
      this.green    = clamp(green, 0, 255);
      this.blue     = clamp(blue, 0, 255);
      this.opacity  = clamp(opacity, 0, 100);
      return this;
    }).bind(this);

    /* ------------------------------
     * Methods:
     * ------------------------------ */
    this.alpha = (function alpha() { /* alpha byte value! */
      return percentageToByte(this.opacity);
    }).bind(this);

    this.to_hex = (function to_hex() {
      const r = this.red.toString(16);
      const g = this.green.toString(16);
      const b = this.blue.toString(16);
      return `#${r}${g}${b}`;
    }).bind(this);

    this.to_string = (function to_string() {
      return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha()}%)`;
    }).bind(this);
  }

  static fromHex(str) {
    const hex = /^#?([a-z0-9]{3}|[a-z0-9]{6})$/i.exec(str.trim());

    if (hex === null) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
        `Couldn't parse string '${str}' as a valid hex code!`);
    }

    if (str.length === 3) {
      str = str.split('').map(x => x + x).join('');
    }

    return new Color().wake(
      parseInt(str.slice(0, 1), 16),
      parseInt(str.slice(2, 3), 16),
      parseInt(str.slice(4, 5), 16),
    );
  }
}

/* A pixel canvas for efficiently creating sprites.
 * The .to_image() creates a new sprite and adds it to spriteMap. */
class PixelCanvas extends Mewlix.Clowder {
  constructor() {
    super();

    this.wake = (function wake(width, height) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
      Mewlix.opaque(this.data);
      return this;
    }).bind(this);

    /* ------------------------------
     * Methods:
     * ------------------------------ */
    this.fill = (function fill(color) {
      for (let i = 0; i < this.data.length; i += 4) {
        this.data[i]     = color.red;
        this.data[i + 1] = color.green;
        this.data[i + 2] = color.blue;
        this.data[i + 3] = color.alpha();
      }
    }).bind(this);

    this.set_pixel = (function set_pixel(x, y, color) {
      const index = (x * this.width + y) * 4;
      this.data[index]     = color.red;
      this.data[index + 1] = color.green;
      this.data[index + 2] = color.blue;
      this.data[index + 3] = color.alpha();
    }).bind(this);

    this.get_pixel = (function get_pixel(x, y) {
      const index = (x * this.width + y) * 4;
      return new Color().wake(
        this.data[index],
        this.data[index + 1],
        this.data[index + 2],
        byteToPercentage(this.data[index + 3])
      );
    }).bind(this);

    this.to_sprite = (async function to_image(key) {
      const data  = new ImageData(this.data, this.width, this.height);
      const image = await createImageBitmap(data);
      spriteMap.set(key, image);
    }).bind(this);
  }
};

/* -----------------------------------
 * Meow Expression
 * ----------------------------------- */
let meowOptions = null;
Mewlix.meow = value => {
  const message = Mewlix.purrify(value);
  drawText(
    value,
    meowOptions?.x ?? 0,
    meowOptions?.y ?? 0,
    meowOptions
  );
  return message;
};

/* -----------------------------------
 * Standard library:
 * ----------------------------------- */
/* Note: The functions in the base library use snake-case intentionally.
 * They're visible in Mewlix, and I don't want to do name-mangling. */

Mewlix.Graphic = Mewlix.library('std.graphic', {
  /* Initialize the canvas, passing your game loop function as argument.
   * type: (() -> nothing) -> nothing */
  init: init,

  /* Delta time getter. If init() hasn't been called yet, this returns 0.
   * type: () -> number */
  delta: () => deltaTime,

  /* Load a resource file. The resource type is determined by the file extension:
   * Image files (.png, .jpg, .bmp) will load a sprite.
   * Audio files (.mp3, .wav, .ogg) will load a sound.
   * Font files  (.ttf, .otf, .woff, .woff2) will load a new font.
   *
   * When loading images, the 'options' argument should be a Rectangle.
   * The 'options' parameter is ignored for audio and font files.
   *
   * type: (string, string, box?) -> nothing */
  load: (key, path, options) => {
    where('graphic.load')(
      ensure.all.string(key, path)
    );
    return loadAny(key, path, options);
  },

  /* Accepts a callback function to draw a 'thumbnail' for the game.
   * The thumbnail will be shown in the 'click to start' screen.
   *
   * type: (() -> nothing)) -> nothing */
  thumbnail: func => {
    where('graphic.thumbnail')(ensure.func(func));
    thumbnail = func;
  },

  /* Load an image file and divide it into multiple sprites efficiently.
   *
   * It expects the following arguments:
   * - The path to the spritesheet.
   * - A shelf of boxes for each sprite, where each holds:
   *   - A key for the sprite.
   *   - A Rectangle box defining the region of the spritesheet to crop.
   * The order of the frames do not matter.
   *
   * type: (string, string, shelf) -> nothing */
  spritesheet: (path, frames) => {
    where('graphic.spritesheet')(
      ensure.string(path),
      ensure.shelf(frames),
    );
    return fromSpritesheet(path, frames);
  },
  
  /* --------- Drawing ---------- */

  /* Draw a sprite on the screen at a specified (x, y) position.
   * The sprite should already be loaded!
   *
   * type: (string, number, number) -> nothing */
  draw: (key, x, y) => {
    where('graphic.draw')(
      ensure.string(key),
      ensure.all.number(x, y),
    );
    return drawSprite(key, x, y);
  },

  /* Ask the dimensions of a loaded sprite.
   * type: (string) -> box */
  measure: key => {
    const image = getSprite(key);
    return new Mewlix.Box([
      ["width"  , image.width ]
      ["height" , image.height]
    ]);
  },

  /* Draw a rectangle on the screen from a Rectangle instance.
   * The color can be defined with the second argument.
   *
   * type: (box, (box | string)) -> nothing */
  rect: (rect, color) => {
    where('graphic.rect')(ensure.box(rect));
    return drawRect(rect, color);
  },

  /* Paints the canvas with a given color.
   * type: ((box | string)) -> nothing */
  paint: fillCanvas,

  /* Draw text on the screen at a specified (x, y) position.
   *
   * An additional box argument can be passed iwht additional options:
   *  - font: The key for an already-loaded font family.
   *  - size: The font size.
   *  - color: The text color.
   *
   * type: (any, number, number, box) -> nothing */
  write: (value, x, y, options) => {
    where('graphic.write')(ensure.all.number(x, y));
    return drawText(Mewlix.purrify(value), x, y, options);
  },

  /* Measure the width of text in the canvas.
   *
   * An additional box argument can be passed with additional options:
   *  - font: The key for an already-loaded font family.
   *  - size: The font size.
   *  - color: The text color.
   *
   * type: (any, box) -> nothing */
  measure_text: (value, options) => {
    return measureText(Mewlix.purrify(value), options);
  },

  /* Set text options for the 'meow' statement.
   * type: box -> nothing */
  meow_options: box => {
    where('graphic.meow_options')(ensure.box(box));
    meowOptions = box;
  },

  /* --------- Keyboard IO ---------- */

  /* Asks whether a key has been pressed. Triggers only once for a single key press.
   * type: (string) -> boolean */
  key_pressed: key => {
    where('graphic.key_pressed')(ensure.string(key));
    return isKeyPressed(key);
  },

  /* Asks whether a key is down.
   * type: (string) -> boolean */
  key_down: key => {
    where('graphic.key_down')(ensure.string(key));
    return isKeyDown(key);
  },

  /* A few constants for the key values of common keys often used in games.
   * Meant to be used with the other functions above.
   *
   * type: box */
  keys: new Mewlix.Box([
    ["space"  , " "         ],
    ["enter"  , "Enter"     ],
    ["left"   , "ArrowLeft" ],
    ["right"  , "ArrowRight"],
    ["up"     , "ArrowUp"   ],
    ["down"   , "ArrowDown" ],
  ]),

  /* --------- Mouse IO ---------- */

  /* Asks whether the left mouse button has been pressed. Triggers only once for every click.
   * type: () -> boolean */
  mouse_click: isMousePressed,

  /* Asks whether the left mouse button is down.
   * type: () -> boolean */
  mouse_down: isMouseDown,

  /* Asks the mouse position relative to the canvas.
   * Returns a Vector2 instance.
   *
   * type: () -> box */
  mouse_position: () => new Vector2().wake(mouseX, mouseY),

  /* --------- Music/SFX ---------- */

  /* Begin playing an already-loaded music track on loop.
   * type: (string) -> nothing */
  play_music: key => {
    where('graphic.play_music')(ensure.string(key));
    return playMusic(key);
  },

  /* Play an already-loaded soundbyte once.
   * type: (string) -> nothing */
  play_sfx: key => {
    where('graphic.play_sfx')(ensure.string(key));
    return playSfx(key);
  },

  /* Set the master volume.
   * type: (number) -> nothing */
  volume: value => {
    where('graphic.volume')(ensure.number(value));
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(masterVolume, value / 2);
  },

  /* Set the music volume.
   * type: (number) -> nothing */
  music_volume: value => {
    where('graphic.music_volume')(ensure.number(value));
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(musicVolume, value);
  },

  /* Set the SFX volume.
   * type: (number) -> nothing */
  sfx_volume: value => {
    where('graphic.sfx_volume')(ensure.number(value));
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(sfxVolume, value);
  },

  /* Stop all music.
   * type: () -> nothing */
  stop_music: stopMusic,

  /* Stop all SFX.
   * type: () -> nothing */
  stop_sfx: stopSfx,

  /* --------- Animation ---------- */

  /* Lerp function.
   * (number, number, number) -> number */
  lerp: (start, end, x) => {
    where('graphic.lerp')(ensure.all.number(start, end, x));
    return lerp(start, end, x);
  },

  /* --------- Core Clowders ---------- */

  /* Vector2 clowder. */
  Vector2: Vector2,

  /* Rectangle clowder. */
  Rectangle: Rectangle,
  
  /* Grid slot clowder. */
  GridSlot: GridSlot,

  /* Convert world point to grid slot. */
  grid_slot: gridSlot,

  /* Convert grid slot to world point. */
  slot_point: slotPoint,

  /* --------- Additional Utility ---------- */

  /* Color clowder, for representing color values. */
  Color: Color,

  /* Convert a hex color code string to a Color.
   * type: (string) -> box */
  hex: Color.fromHex,

  /* PixelCanvas clowder, for creating new sprites. */
  PixelCanvas: PixelCanvas,
});

/* Freezing the std.graphic library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Graphic);

/* -----------------------------------
 * Run Console:
 * ----------------------------------- */
Mewlix.run = async f => {
  try {
    await f();
  }
  catch (error) {
    const image = await loadImage('/core-assets/mewlix-error.png');
    context.fillStyle = 'rgb(255 0 0 / 50%)';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, 0, 0);
    throw error;
  }
};

/* -----------------------------------
 * Prevent arrow-key scrolling:
 * ----------------------------------- */
const preventKeys = new Set([
  'Space',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);

window.addEventListener('keydown', event => {
  if (preventKeys.has(event.code)) {
    event.preventDefault();
  }
}, { passive: false });
