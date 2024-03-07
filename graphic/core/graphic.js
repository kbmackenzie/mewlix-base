'use strict';
const ensure = Mewlix.ensure;
const clamp  = Mewlix.clamp;

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
const percentToByte = p => Math.floor((255 * p) / 100);

/* -----------------------------------
 * Initializing Canvas:
 * ----------------------------------- */
const canvas  = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');

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
  );
};

const fromSpritesheet = async (path, keyBase, rects) => {
  const sheet = await loadImage(path);
  let counter = 0;

  for (const rect of Mewlix.Shelf.reverse(rects)) {
    const sprite = await createImageBitmap(sheet, rect.x, rect.y, rect.width, rect.height);
    const key = `${keyBase}-${counter++}`;
    spriteMap.set(key, sprite);
  }
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
  context.textAlign = options?.align ?? 'start';
  context.textBaseline = options?.base ?? 'top';
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
  const measurement = context.measureText(message);
  return Math.floor(measurement.width / sizeModifier);
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
masterVolume.setValueAtTime(0.5, audioContext.currentTime);

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
 * Core Utility:
 * ----------------------------------- */
/* A clowder type for a 2-dimensional vector.
 * Can represent a point in a 2D world. */
class Vector2 extends Mewlix.Clowder {
  wake(x, y) {
    ensure.all.number(x, y);
    this.x = x;
    this.y = y;

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

    return this;
  }
}

/* A clowder type for a 2-dimensional rectangle.
 * Can represent a region in a 2-dimensional plane. */
class Rectangle extends Mewlix.Clowder {
  wake(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.contains = (function(point) {
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

    return this;
  }
}

/* A clowder to represent a grid slot.
 * The row and column numbers are clamped in .wake()! */
class GridSlot extends Mewlix.Clowder {
  wake(row, column) {
    this.row    = clamp(row, 0, gridRows - 1);
    this.column = clamp(column, 0, gridColumns - 1);

    this.position = (function position() {
      return slotPoint(this.row, this.column);
    }).bind(this);

    return this;
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
  const image = await loadImage(
    '/core-assets/mewlix-play.png',
    new Rectangle(0, 0, 1024, 1024)
  );
  context.fillStyle = 'rgb(0 0 0 / 50%)';
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(image, 0, 0);
};

const init = async (callback) => {
  await loadFont('Munro', '/core-assets/munro.ttf');

  const nextFrame = () => new Promise(resolve => {
    window.requestAnimationFrame(resolve);
  });

  const run = async () => {
    let lastFrame; // Last frame's timestamp, in milliseconds.

    await thumbnail?.();
    await drawPlay();
    await awaitClick();
    flushKeyQueue();

    while (true) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      await callback();
      flushKeyQueue();
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
  wake(red, green, blue, opacity = 100) {
    ensure.all.number(red, green, blue, opacity);
    this.red      = clamp(red, 0, 255);
    this.green    = clamp(green, 0, 255);
    this.blue     = clamp(blue, 0, 255);
    this.opacity  = clamp(opacity, 0, 100);

    this.alpha = (function alpha() { /* alpha byte value! */
      return percentToByte(this.opacity);
    }).bind(this);

    this.to_hex = (function to_hex() {
      const r = this.red.toString(16);
      const g = this.green.toString(16);
      const b = this.blue.toString(16);
      return `#${r}${g}${b}`;
    }).bind(this);

    return this;
  }

  toString() {
    return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha()}%)`;
  }

  static fromHex(str) {
    ensure.string(str);
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

/* A simple animation container. It accepts a shelf of frames and, optionally, a frame rate.
 * The .draw() method can be called to draw an animation with a position. */
class SpriteAnimation extends Mewlix.Clowder {
  wake(frames, frame_rate) {
    ensure.shelf(frames);
    this.frames = frames;
    this.frame_rate = frame_rate ?? 12;
    this.frame_duration = 1 / this.frame_rate;

    this.timer = 0.0;
    this.frame_stack = frames.pop();
    this.current_frame = frames.peek();

    // Methods:
    this.draw = (function draw(x, y) {
      this.timer += deltaTime;
      if (this.timer >= this.frame_duration) {
        this.next_frame();
        this.timer = 0.0;
      }
      drawSprite(this.current_frame, x, y);
    }).bind(this);

    this.next_frame = (function next_frame() {
      this.current_frame = this.frame_stack?.peek();
      this.frame_stack = this.frame_stack?.pop();

      if (!this.current_frame) {
        this.frame_stack = this.frames.pop();
        this.current_frame = this.frames.peek();
      }
    }).bind(this);

    this.reset = (function reset() {
      this.timer = 0.0;
      this.frame_stack = this.frames.pop();
      this.current_frame = this.frames.peek();
    }).bind(this);

    return this;
  }

}

/* A pixel canvas for efficiently creating sprites.
 * The .to_image() creates a new sprite and adds it to spriteMap. */
class PixelCanvas extends Mewlix.Clowder {
  wake(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    Mewlix.opaque(this.data);

    // Methods:
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

    this.set_tile = (function set_tile(x, y, { data }) {
      const index = (x * this.width + y) * 4;
      const dataSize = Math.min(this.data.length - index, data.length);

      for (let i = 0; i < dataSize; i++) {
        this.data[index + i] = data[i];
      }
    }).bind(this);

    this.to_image = (async function to_image(key) {
      const data  = new ImageData(this.data, this.width, this.height);
      const image = await createImageBitmap(data);
      spriteMap.set(key, image);
    }).bind(this);

    return this;
  }
};

/* Dialogue util. */
const lineDuration = (message, charsPerSecond = 30.0) => {
  return message.length / charsPerSecond + 0.2;
};

/* A class designed to make the creation of dialogue boxes easier.
 * It accepts:
 *  1. A shelf of dialogue lines
 *  2. A 'draw' callback that controls how dialogue is drawn
 *  3. A box of additional options and parameters for the dialogue box:
 *    - A key to listen to to advance dialogue. (default: Space)
 *    - Character speed, in characters per second (default: 30.0)
 *    - Key of audio file to use as a sound (default: none)
 *    - Sound speed, in beeps per second (default: 2.0)
 * 
 * All you need to do to start a new dialogue event is call .play()
 * with a new shelf of lines.
 *
 * Note: Snake-case is used for all methods and properties in this class.
 * This is because it'll be accessible inside of Mewlix. */
class DialogueBox extends Mewlix.Clowder {
  /* The drawCallback parameter should be a function of type (string) -> nothing.
   * It will be called to draw a dialogue line every frame. */
  wake(draw_callback, options) {
    this.draw_callback = draw_callback;
    this.key = options?.key ?? ' ';
    this.speed = options?.speed ?? 30.0;

    // Sound options:
    this.sound = options?.sound;
    this.sound_speed = 1 / (options?.sound_speed ?? 20);
    console.log(this.sound);

    // Timers:
    this.dialogue_timer = 0.0;
    this.sound_timer = 0.0;

    // Methods:
    this.play = (function play(lines) {
      ensure.shelf(lines);
      this.buffer = '';
      this.lines = Mewlix.Shelf.reverse(lines);
      this.playing = true;
      this.next_line();
    }).bind(this);

    this.next_line = (function next_line() {
      const message = this.lines?.peek?.();
      this.current_line  = message ? {
        message: message,
        length: message.length,
        duration: lineDuration(message, this.speed),
        finished: false,
      } : null;
      this.lines = this.lines?.pop();
      this.buffer = '';

      this.playing = !!this.current_line;
    }).bind(this);

    this.line_lerp = (function line_lerp() {
      const len = this.current_line.length;
      const duration = this.current_line.duration;
      return Math.floor(lerp(0, len, this.dialogue_timer / duration));
    }).bind(this);

    this.draw = (function draw() {
      if (this.playing && isKeyPressed(this.key)) {
        if (this.current_line.finished) {
          this.next_line();
          this.dialogue_timer = 0.0;
          this.sound_timer = 0.0;
        }
        else {
          this.current_line.finished = true;
        }
      }

      if (!this.playing) return;
      this.dialogue_timer += deltaTime;

      const lineLength = this.current_line.finished
        ? this.current_line.length
        : clamp(this.line_lerp(), 0, this.current_line.length);

      if (!this.buffer || lineLength > this.buffer.length) {
        this.buffer = this.current_line.message.slice(0, lineLength);
      }

      this.draw_callback(this.buffer);

      if (this.sound && !this.current_line.finished) {
        this.sound_timer += deltaTime;

        if (this.sound_timer >= this.sound_speed) {
          this.sound_timer = 0.0;
          playSfx(this.sound);
        }
      }

      if (this.dialogue_timer >= this.current_line.duration) {
        this.current_line.finished = true;
      }
    }).bind(this);

    return this;
  }
}

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
    ensure.all.string(key, path);
    return loadAny(key, path, options);
  },

  /* Accepts a callback function to draw a 'thumbnail' for the game.
   * The thumbnail will be shown in the 'click to start' screen.
   *
   * type: (() -> nothing)) -> nothing */
  thumbnail: func => {
    ensure.func(func);
    thumbnail = func;
  },

  /* Load an image file and divide it into multiple sprites efficiently.
   *
   * It expects the following arguments:
   * - The path to the spritesheet.
   * - A 'base key' from which the key for each sprite will be created.
   * - A shelf of Rectangle boxes holding the regions of the spritesheet to crop.
   *
   * type: (string, string, shelf) -> nothing */
  spritesheet: (path, key, rects) => {
    ensure.all.string(path, key);
    ensure.shelf(rects);
    return fromSpritesheet(path, key, rects);
  },
  
  /* --------- Drawing ---------- */

  /* Draw a sprite on the screen at a specified (x, y) position.
   * The sprite should already be loaded!
   *
   * type: (string, number, number) -> nothing */
  draw: drawSprite,

  /* Draw text on the screen at a specified (x, y) position.
   *
   * An additional box argument can be passed iwht additional options:
   *  - font: The key for an already-loaded font family.
   *  - size: The font size.
   *  - color: The text color.
   *  - align: The text alignment.
   *
   * type: (any, number, number, box) -> nothing */
  write: (value, x, y, options) => {
    return drawText(Mewlix.purrify(value), x, y, options);
  },

  /* Measure the width of text in the canvas.
   *
   * An additional box argument can be passed with additional options:
   *  - font: The key for an already-loaded font family.
   *  - size: The font size.
   *  - color: The text color.
   *  - align: The text alignment.
   *
   * type: (string, box) -> nothing */
  measure_text: (value, options) => {
    return measureText(Mewlix.purrify(value), options);
  },

  /* Set text options for the 'meow' statement.
   * type: box -> nothing */
  meow_options: box => {
    ensure.box(box);
    meowOptions = box;
  },

  /* --------- IO ---------- */

  /* Asks whether a key has been pressed. Triggers only once for a single key press.
   * type: (string) -> boolean */
  key_pressed: isKeyPressed,

  /* Asks whether a key is down.
   * type: (string) -> boolean */
  key_down: isKeyDown,

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


  /* --------- Music/SFX ---------- */

  /* Begin playing an already-loaded music track on loop.
   * type: (string) -> nothing */
  play_music: key => {
    ensure.string(key);
    return playMusic(key);
  },

  /* Play an already-loaded soundbyte once.
   * type: (string) -> nothing */
  play_sfx: key => {
    ensure.string(key);
    return playSfx(key);
  },

  /* Set the master volume.
   * type: (number) -> nothing */
  volume: value => {
    ensure.number(value);
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(masterVolume, value / 2);
  },

  /* Set the music volume.
   * type: (number) -> nothing */
  music_volume: value => {
    ensure.number(value);
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(musicVolume, value);
  },

  /* Set the SFX volume.
   * type: (number) -> nothing */
  sfx_volume: value => {
    ensure.number(value);
    value = clamp(value, 0, 100) / 100;
    return setVolumeOf(sfxVolume, value);
  },

  /* Stop all music.
   * type: () -> nothing */
  stop_music: stopMusic,

  /* --------- Animation ---------- */

  /* Lerp function.
   * (number, number, number) -> number */
  lerp: (start, end, x) => {
    ensure.all.number(start, end, x);
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
  PixelCanvas: SpriteCanvas,

  /* SpriteAnimation clowder, simple container for animations. */
  SpriteAnimation: SpriteAnimation,

  /* Dialogue box clowder, simple container for generating dialogue boxes. */
  DialogueBox: DialogueBox,
});

/* -----------------------------------
 * Run Console:
 * ----------------------------------- */
Mewlix.run = async f => {
  try {
    await f();
  }
  catch (error) {
    const image = await loadImage(
      '/core-assets/mewlix-error.png',
      new Rectangle().wake(0, 0, 1024, 1024)
    );
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
