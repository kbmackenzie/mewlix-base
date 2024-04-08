/* Mewlix is a cat-themed esoteric programming language. 🐱
 * THis is a core file from Mewlix's base library.
 * 
 * Learn more at:
 * > https://github.com/kbmackenzie/mewlix <
 *
 * Copyright 2024 kbmackenzie. Released under the MIT License.
 * The full license details can be found at:
 * > https://github.com/kbmackenzie/mewlix-base/blob/main/LICENSE < */

'use strict';
const ensure = Mewlix.ensure;
const clamp  = Mewlix.clamp;

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
const percentageToByte = p => Math.floor((255 * p) / 100);
const byteToPercentage = b => Math.floor((100 * b) / 255);

/* -----------------------------------
 * Initializing Canvas:
 * ----------------------------------- */
const canvas  = document.getElementById('game-canvas');
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
 * Colors:
 * ----------------------------------- */
const toColor = Symbol('toColor');

const withColor = value => {
  if (typeof value === 'string') return value;    
  if (typeof value === 'object' && toColor in value) {
    return value[toColor]();
  }

  const typeOfValue = Mewlix.Reflection.typeOf(value);
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
    `Expected color value, received value of type "${typeOfValue}": ${value}`);
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
  context.fillStyle = withColor(color ?? 'black');
  context.fillRect(
    rect.x      * sizeModifier,
    rect.y      * sizeModifier,
    rect.width  * sizeModifier,
    rect.height * sizeModifier,
  );
};

const fillCanvas = (color) => {
  context.fillStyle = withColor(color ?? 'black');
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
  context.fillStyle = withColor(options?.color ?? 'black');
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
 * Playing Music:
 * ----------------------------------- */
const musicChannel = {
  track: null,
};

const playMusic = key => {
  musicChannel.track?.stop();
  const buffer = getBuffer(key);

  const track = audioContext.createBufferSource();
  track.buffer = buffer; 
  track.loop = true;
  track.connect(musicVolume);
  track.start();

  musicChannel.track = track;
};

const stopMusic = () => {
  musicChannel.track?.stop();
  musicChannel.track = null;
};

/* -----------------------------------
 * Playing Music:
 * ----------------------------------- */
const soundChannelCount = 8;
const soundChannels = new Array(soundChannelCount).fill(null);

const withSoundChannel = (index, callback) => {
  if (index < 0 || index >= soundChannelCount) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `Invalid sound channel index: ${index}`);
  }
  soundChannels[index] = callback(soundChannels[index]);
};

const playSfx = (key, index = 0) => {
  withSoundChannel(index, channel => {
    channel?.stop();
    const buffer = getBuffer(key);

    const sound = audioContext.createBufferSource();
    sound.buffer = buffer; 
    sound.connect(sfxVolume);
    sound.start();

    return sound;
  });
};

const stopSfx = (index = 0) => {
  withSoundChannel(index, channel => {
    channel?.stop();
    return null;
  });
};

const stopAllSfx = () => {
  soundChannels.forEach(channel => channel?.stop());
  soundChannels.fill(null);
};

/* -----------------------------------
 * Volume Control:
 * ----------------------------------- */
const gameVolume = {
  mute: false
};

const setVolumeOf = (node, volume) => {
  node.gain.cancelScheduledValues(audioContext.currentTime);
  node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
  node.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.5);
};

class VolumeControl {
  constructor(node) {
    this.node = node;
    this.volume = node.volume;
  }

  set(volume) {
    this.volume = volume;
    this.update();
  }

  update() {
    const value = this.volume * gameVolume.mute;
    setVolumeOf(this.node, value);
  }
}

gameVolume.master = new VolumeControl(masterVolume);
gameVolume.music  = new VolumeControl(musicVolume);
gameVolume.sfx    = new VolumeControl(sfxVolume);

gameVolume.update = function() {
  this.master.update();
  this.music.update();
  this.sfx.update();
};

/* -----------------------------------
 * Keyboard Events
 * ----------------------------------- */
const keysDown = new Set();
const keyQueue = new Set();

window.addEventListener('keydown', event => {
  if (event.repeat) return;
  keyQueue.add(event.key);
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

class Vector2 extends Mewlix.Clowder {
  constructor() {
    super();

    this[Mewlix.wake] = (function wake(x, y) {
      ensure.number('Vector2.wake', x);
      ensure.number('Vector2.wake', y);
      this.x = x;
      this.y = y;
      return this;
    }).bind(this);

    this.add = (function add(that) {
      return new Vector2()[Mewlix.wake](this.x + that.x, this.y + that.y);
    }).bind(this);

    this.mul = (function mul(that) {
      return new Vector2()[Mewlix.wake](this.x + that.x, this.y + that.y);
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
      return new Vector2()[Mewlix.wake](x, y);
    }).bind(this);
  }
}

class Rectangle extends Mewlix.Clowder {
  constructor() {
    super();

    this[Mewlix.wake] = (function wake(x, y, width, height) {
      [x, y, width, height].forEach(
        value => ensure.number('Rectangle.wake', value)
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

class GridSlot extends Mewlix.Clowder {
  constructor() {
    super();

    this[Mewlix.wake] = (function wake(row, column) {
      this.row    = clamp(row,    0, gridRows - 1);
      this.column = clamp(column, 0, gridColumns - 1);
      return this;
    }).bind(this);

    this.position = (function position() {
      return gridSlotToPosition(this.row, this.column);
    }).bind(this);
  }
}

const positionToGridSlot = (x, y) => {
  const row = Math.min(y / gridSlotHeight);
  const col = Math.min(x / gridSlotWidth);
  return new GridSlot()[Mewlix.wake](row, col);
};

const gridSlotToPosition = (row, col) => {
  return new Vector2()[Mewlix.wake](
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

const removeLoadingOverlay = () => {
  document.getElementById('loading-overlay')?.remove();
};

const drawPlay = async () => {
  const image = await loadImage('core-assets/mewlix-play.png');
  context.fillStyle = 'rgb(0 0 0 / 50%)';
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(image, 0, 0);
};

const init = async (callback) => {
  ensure.func('graphic.init', callback);
  await loadFont('Munro', 'core-assets/fonts/Munro/munro.ttf');

  const nextFrame = () => new Promise(resolve => {
    window.requestAnimationFrame(resolve);
  });

  const run = async () => {
    let lastFrame; // Last frame's timestamp, in milliseconds.

    removeLoadingOverlay();
    context.clearRect(0, 0, canvasWidth, canvasHeight);

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

    this[Mewlix.wake] = (function wake(red, green, blue, opacity = 100) {
      [red, green, blue, opacity].forEach(
        value => ensure.number('Color.wake', value)
      );
      this.red      = clamp(red, 0, 255);
      this.green    = clamp(green, 0, 255);
      this.blue     = clamp(blue, 0, 255);
      this.opacity  = clamp(opacity, 0, 100);
      return this;
    }).bind(this);

    this.alpha = (function alpha() { /* alpha byte value! */
      return percentageToByte(this.opacity);
    }).bind(this);

    this.to_hex = (function to_hex() {
      const r = this.red.toString(16);
      const g = this.green.toString(16);
      const b = this.blue.toString(16);
      return `#${r}${g}${b}`;
    }).bind(this);
  }

  [toColor]() {
      return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha()}%)`;
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

    return new Color()[Mewlix.wake](
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

    this[Mewlix.wake] = (function wake(width, height) {
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
      return new Color()[Mewlix.wake](
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
Mewlix.meow = message => {
  drawText(
    message,
    meowOptions?.x ?? 0,
    meowOptions?.y ?? 0,
    meowOptions
  );
  return message;
};

/* -----------------------------------
 * Standard library:
 * ----------------------------------- */
/* The std.graphic library documentation can be found on the wiki:
 * > https://github.com/kbmackenzie/mewlix/wiki/Graphic#the-stdgraphic-yarn-ball <
 *
 * It won't be included in this source file to avoid clutter.
 *
 * All standard library functions *should use snake_case*, as
 * they're going to be accessible from within Mewlix. */

Mewlix.Graphic = Mewlix.library('std.graphic', {
  init: init,
  delta: () => deltaTime,

  load: (key, path, options) => {
    ensure.string('graphic.load', key);
    ensure.string('graphic.load', path);
    return loadAny(key, path, options);
  },

  thumbnail: func => {
    ensure.func('graphic.thumbnail', func);
    thumbnail = func;
  },

  spritesheet: (path, frames) => {
    ensure.string('graphic.spritesheet', path);
    ensure.shelf('graphic.spritesheet', frames);
    return fromSpritesheet(path, frames);
  },
  
  draw: (key, x, y) => {
    ensure.string('graphic.draw', key);
    ensure.number('graphic.draw', x);
    ensure.number('graphic.draw', y);
    return drawSprite(key, x, y);
  },

  measure: key => {
    const image = getSprite(key);
    return new Mewlix.Box([
      ["width"  , image.width ]
      ["height" , image.height]
    ]);
  },

  rect: (rect, color) => {
    ensure.box('graphic.rect', rect);
    return drawRect(rect, color);
  },

  paint: fillCanvas,

  write: (value, x, y, options) => {
    ensure.number('graphic.write', x);
    ensure.number('graphic.write', y);
    return drawText(Mewlix.purrify(value), x, y, options);
  },

  measure_text: (value, options) => {
    return measureText(Mewlix.purrify(value), options);
  },

  meow_options: box => {
    ensure.box('graphic.meow_options', box);
    meowOptions = box;
  },

  key_pressed: key => {
    ensure.string('graphic.key_pressed', key);
    return isKeyPressed(key);
  },

  key_down: key => {
    ensure.string('graphic.key_down', key);
    return isKeyDown(key);
  },

  keys: new Mewlix.Box([
    ["space"  , " "         ],
    ["enter"  , "Enter"     ],
    ["left"   , "ArrowLeft" ],
    ["right"  , "ArrowRight"],
    ["up"     , "ArrowUp"   ],
    ["down"   , "ArrowDown" ],
  ]),

  mouse_click: isMousePressed,

  mouse_down: isMouseDown,

  mouse_position: () => new Vector2()[Mewlix.wake](mouseX, mouseY),

  play_music: key => {
    ensure.string('graphic.play_music', key);
    return playMusic(key);
  },

  play_sfx: (key, channel = 0) => {
    ensure.string('graphic.play_sfx', key);
    ensure.number('graphic.play_sfx', channel);
    return playSfx(key, channel);
  },

  volume: value => {
    ensure.number('graphic.volume', value);
    value = clamp(value, 0, 100) / 100;
    gameVolume.master.set(value);
  },

  music_volume: value => {
    ensure.number('graphic.music_volume', value);
    value = clamp(value, 0, 100) / 100;
    gameVolume.music.set(value);
  },

  sfx_volume: value => {
    ensure.number('graphic.sfx_volume', value);
    value = clamp(value, 0, 100) / 100;
    gameVolume.sfx.set(value);
  },

  stop_music: stopMusic,

  stop_sfx: channel => {
    ensure.number('graphic.stop_sfx', channel);
    return stopSfx(channel);
  },

  stop_all_sfx: stopAllSfx,

  lerp: (start, end, x) => {
    ensure.number('graphic.lerp', start);
    ensure.number('graphic.lerp', end);
    ensure.number('graphic.lerp', x);
    return lerp(start, end, x);
  },

  Vector2: Vector2,

  Rectangle: Rectangle,
  
  GridSlot: GridSlot,

  grid_slot: positionToGridSlot,

  slot_point: gridSlotToPosition,

  Color: Color,

  hex: Color.fromHex,

  PixelCanvas: PixelCanvas,
});

/* Freezing the std.graphic library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Graphic);

/* -----------------------------------
 * Standard library - Curry:
 * ----------------------------------- */
Mewlix.GraphicCurry = (() => {
  const graphic = Mewlix.Graphic;

  return Mewlix.curryLibrary('std.graphic.curry', Mewlix.Graphic, {
    load: key => path => options => graphic.load(key, path, options),
    spritesheet: path => frames => graphic.spritesheet(path, frames),

    draw: key => x => y => graphic.draw(key, x, y),
    rect: rect => color => graphic.rect(rect, color),
    write: value => x => y => options => graphic.write(value, x, y, options),
    measure_text: value => options => graphic.measure_text(value, options),
  
    play_sfx: key => channel => graphic.play_sfx(key, channel),

    lerp: start => end => x => graphic.lerp(start, end, x),
  });
})();

/* Freezing the curry library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.GraphicCurry);

/* -----------------------------------
 * Run Console:
 * ----------------------------------- */
Mewlix.run = async f => {
  try {
    await f();
  }
  catch (error) {
    const image = await loadImage('core-assets/mewlix-error.png');
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
