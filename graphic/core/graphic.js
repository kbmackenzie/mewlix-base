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
context.textBaseline = 'top';

// premature optimization? maybe...
// i'm not taking chances!
const canvasWidth  = canvas.width;
const canvasHeight = canvas.height;

const sizeModifier = Math.floor(canvas.width / 128);

const spriteMap = new Map();
const audioMap  = new Map();

const spriteWidth  = 16;
const spriteHeight = 16;

/* -----------------------------------
 * Loading Images:
 * ----------------------------------- */
const loadImage = (key, path, width, height) => fetch(path)
  .then(response => response.blob())
  .then(blob => createImageBitmap(blob, 0, 0, width, height))
  .then(image => {
    spriteMap.set(key, image);
    return image;
  });

const loadSprite = (key, path) => loadImage(key, path, spriteWidth, spriteHeight);

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

const drawSprite = (key, x = 0, y = 0) => {
  const image = getSprite(key);
  context.drawImage(
    image,
    Math.floor(x) * sizeModifier,
    Math.floor(y) * sizeModifier,
    spriteWidth   * sizeModifier,
    spriteHeight  * sizeModifier,
  );
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

const drawText = (value, x = 0, y = 0, options = null) => {
  const text = Mewlix.purrify(value);
  const font = options?.font ?? defaultFont;
  const fontSize = Math.floor(options?.size ?? defaultFontSize);

  context.font = `${fontSize * sizeModifier}px ${font}, monospace`;
  context.fillStyle = options?.color?.toString() ?? 'black';

  context.fillText(
    text,
    Math.floor(x) * sizeModifier,
    Math.floor(y) * sizeModifier,
  );
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
});

window.addEventListener('keyup', event => {
  keysDown.delete(event.key);
});

const isKeyPressed  = key => keyQueue.has(key);
const isKeyDown     = key => keysDown.has(key);
const isKeyUp       = key => !keysDown.has(key);

const flushKeyQueue = () => {
  keyQueue.clear();
};

/* -----------------------------------
 * Game Loop
 * ----------------------------------- */
let deltaTime = 0;    // Delta time, in seconds!

const init = async (callback) => {
  await loadFont('Munro', '/assets/munro.ttf');

  const nextFrame = () => new Promise(resolve => {
    window.requestAnimationFrame(resolve);
  });

  const run = async () => {
    let lastFrame; // Last frame's timestamp, in milliseconds.

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

canvas.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
});

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

const loadAny = async (key, path) => {
  const extension = getExtensionOf(path)?.toLowerCase();
  if (!extension) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `Couldn't parse file extension in filepath "${path}"!`);
  }

  if (imageExtensions.has(extension)) {
    await loadSprite(key, path);
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

const lineDuration = (message, charsPerSecond = 30.0) => {
  return message.length / charsPerSecond + 0.2;
};

/* -----------------------------------
 * Animation - Utility Class
 * ----------------------------------- */
class Animation extends Mewlix.Clowder {
}

/* -----------------------------------
 * Utility Clowders:
 * ----------------------------------- */
/* All of the clowders in this section use *snake_case* naming for methods and properties.
 * This is because they'll be available inside of Mewlix! */

/* Color container, wrapping a RGBA color value.
 *
 * It also implements .toColor(), complying with the 'ToColor' interface concept:
 * Any object that implements a .toColor() method can be considered a valid color representation. */
class Color extends Mewlix.Clowder {
  constructor(red, green, blue, opacity = 100) {
    super();
    ensure.all.number(red, green, blue, opacity);
    this.red      = clamp(red, 0, 255);
    this.green    = clamp(green, 0, 255);
    this.blue     = clamp(blue, 0, 255);
    this.opacity  = clamp(opacity, 0, 100);
  }

  alpha() { /* alpha byte value! */
    return percentToByte(this.opacity);
  }

  toString() {
    return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha()}%)`;
  }

  static from_hex(str) {
    ensure.string(str);
    const hex = /^#?([a-z0-9]{3}|[a-z0-9]{6})$/i.exec(str.trim());

    if (hex === null) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
        `Couldn't parse string '${str}' as a valid hex code!`);
    }

    if (str.length === 3) {
      str = str.split('').map(x => x + x).join('');
    }

    return new Color(
      parseInt(str.slice(0, 1), 16),
      parseInt(str.slice(2, 3), 16),
      parseInt(str.slice(4, 5), 16),
    );
  }
}

/* A pixel canvas for efficiently creating sprites.
 * The .toImage() creates a new sprite and adds it to spriteMap. */
class PixelCanvas extends Mewlix.Clowder {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    Mewlix.opaque(this.data);
  }

  fill(color) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i]     = color.red;
      this.data[i + 1] = color.green;
      this.data[i + 2] = color.blue;
      this.data[i + 3] = color.alpha();
    }
  }

  set_pixel(x, y, color) {
    const index = (x * this.width + y) * 4;
    this.data[index]     = color.red;
    this.data[index + 1] = color.green;
    this.data[index + 2] = color.blue;
    this.data[index + 3] = color.alpha();
  }

  set_tile(x, y, { data }) {
    const index = (x * this.width + y) * 4;
    const dataSize = Math.min(this.data.length - index, data.length);

    for (let i = 0; i < dataSize; i++) {
      this.data[index + i] = data[i];
    }
  }

  async toImage(key) {
    const data  = new ImageData(this.data, this.width, this.height);
    const image = await createImageBitmap(data);
    spriteMap.set(key, image);
  }
};

/* A sprite-specific PixelCanvas, with pre-set sprite width and height.
 * The 'std.graphic' yarn ball will expose this instead of PixelCanvas. */
class SpriteCanvas extends PixelCanvas {
  constructor() {
    super(spriteWidth, spriteHeight);
  }
}

/* A clowder type for a 2-dimensional vector.
 * Can represent a point in a 2D world. */
class Vector2 extends Mewlix.Clowder {
  constructor(x, y) {
    super();
    ensure.all.number(x, y);
    this.x = x;
    this.y = y;
  }

  add(that) {
    new Vector2(this.x + that.x, this.y + that.y);
  }

  mul(that) {
    new Vector2(this.x * that.x, this.y * that.y);
  }

  clamp(min, max) {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
  }
}

/* A clowder type for a 2-dimensional rectangle.
 * Can represent a region in a 2-dimensional plane. */
class Rectangle extends Mewlix.Clowder {
}


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
    
    return this;
  }

  play(lines) {
    ensure.shelf(lines);
    this.buffer = '';
    this.lines = lines;
    this.playing = true;
    this.next_line();
  }

  next_line() {
    const message = this.lines?.peek?.();
    this.current_line  = message ? Mewlix.wrap({
      message: message,
      length: message.length,
      duration: lineDuration(message, this.speed),
      finished: false,
    }) : null;
    this.lines = this.lines?.pop();
    this.buffer = '';

    this.playing = !!this.current_line;
  }

  line_lerp() {
    const len = this.current_line.length;
    const duration = this.current_line.duration;
    return Math.floor(lerp(0, len, this.dialogue_timer / duration));
  }

  draw() {
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
  }
}

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
   * Audio files (.mp3, .wav, .ogg) will load an audio file.
   * Font files  (.ttf, .otf, .woff, .woff2) will load a new font.
   *
   * type: (string, string) -> nothing */
  load: (key, path) => {
    ensure.all.string(key, path);
    return loadAny(key, path);
  },
  
  /* --------- Drawing ---------- */

  /* Draw a sprite on the screen at a specified (x, y) position.
   * The sprite should already be loaded!
   *
   * No type-checking is done on this function for performance reasons.
   * It'll be called multiple times *every single frame*.
   * Type-checking input values every time would be an absolute waste.
   *
   * type: (string, number, number) -> nothing */
  draw: drawSprite,

  /* Draw text on the screen at a specified (x, y) position.
   * An additional box argument can be passed iwht additional options:
   *  - font: The key for an already-loaded font family.
   *  - size: The font size.
   *  - color: The text color.
   *
   * No type-checking is done on this function for performance reasons.
   * It'll be called multiple times *every single frame*.
   * Type-checking input values every time would be an absolute waste.
   *
   * type: (string, number, number, box) -> nothing */
  write: drawText,


  /* --------- IO ---------- */

  /* Asks whether a key has been pressed. Triggers only once for a single key press.
   * 
   * No type-checking is done on this function for performance reasons.
   * It'll be called multiple times *every single frame*.
   * Type-checking input values every time would be an absolute waste.
   *
   * type: (string) -> boolean */
  key_pressed: isKeyPressed,

  /* Asks whether a key is down.
   *
   * No type-checking is done on this function for performance reasons.
   * It'll be called multiple times *every single frame*.
   * Type-checking input values every time would be an absolute waste.
   *
   * type: (string) -> boolean */
  key_down: isKeyDown,

  /* A few constants for the key values of common keys often used in games.
   * Meant to be used with the other functions above.
   *
   * type: box */
  keys: new Mewlix.Box([
    ["space"  , " "         ]
    ["enter"  , "Enter"     ]
    ["left"   , "ArrowLeft" ]
    ["right"  , "ArrowRight"]
    ["up"     , "ArrowUp"   ]
    ["down"   , "ArrowDown" ]
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
    value = clamp(value, 0, 1);
    return setVolumeOf(masterVolume, value / 2);
  },

  /* Set the music volume.
   * type: (number) -> nothing */
  music_volume: value => {
    ensure.number(value);
    value = clamp(value, 0, 1);
    return setVolumeOf(musicVolume, value);
  },

  /* Set the SFX volume.
   * type: (number) -> nothing */
  sfx_volume: value => {
    ensure.number(value);
    value = clamp(value, 0, 1);
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


  /* --------- Utility Types ---------- */

  /* Color clowder, for representing color values. */
  Color: Color,

  /* Vector2 clowder. */
  Vector2: Vector2,

  /* Rectangle clowder. */
  Rectangle: Rectangle,

  /* SpriteCanvas clowder, for creating new sprites! */
  SpriteCanvas: SpriteCanvas,
});

/* -----------------------------------
 * Tests:
 * ----------------------------------- */
const d = new DialogueBox().wake(text => drawText(text, 20, 20), { sound: 'voice' });
d.play(Mewlix.Shelf.fromArray(["hello", "world"]));

const test = async () => {
  d.draw();
}

loadAny('voice', 'assets/voice.wav').init(test);
