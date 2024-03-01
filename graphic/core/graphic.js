'use strict';
const ensure = Mewlix.ensure;
const clamp  = Mewlix.clamp;

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
const percentToByte = p => Math.floor((255 * p) / 100);

/* -----------------------------------
 * Initializing Canvas:
 * ----------------------------------- */
/** @type {HTMLCanvasElement} */
const canvas  = document.getElementById('drawing-canvas');
/** @type {CanvasRenderingContext2D} */
const context = canvas.getContext('2d');

// premature optimization? maybe...
// i'm not taking chances!
const canvasWidth  = canvas.width;
const canvasHeight = canvas.height;

const sizeModifier = Math.floor(canvas.width / 128);

/** @type {Map<string, ImageBitmap>} */
const spriteMap = new Map();
/** @type {Map<string, AudioBuffer>} */
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
 * Types:
 * ----------------------------------- */
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

  toColor() {
    return this;
  }

  toString() {
    return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha()}%)`;
  }

  static fromHex(hex) {
    ensure.string(hex);
    if (hex[0] === '#') { hex = hex.slice(1); }

    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    if (hex.length < 6) return null;

    return new Color(
      parseInt(hex.slice(0, 1), 16),
      parseInt(hex.slice(2, 3), 16),
      parseInt(hex.slice(4, 5), 16),
    );
  }
}

/* A pixel canvas for efficiently creating sprites and sprites.
 *
 * The .toImage() creates a new ImageBitmap object from the pixel data.
 * The generated ImageBitmap object can be used with the HTML5 Canvas .drawImage() method! */
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

  setPixel(x, y, color) {
    const index = (x * this.width + y) * 4;
    this.data[index]     = color.red;
    this.data[index + 1] = color.green;
    this.data[index + 2] = color.blue;
    this.data[index + 3] = color.alpha();
  }

  setTile(x, y, { data }) {
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

class SpriteCanvas extends PixelCanvas {
  constructor() {
    super(spriteWidth, spriteHeight);
  }
}

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

/* -----------------------------------
 * Loading Fonts:
 * ----------------------------------- */
const loadFont = (name, path) => fetch(path)
  .then(response => response.arrayBuffer())
  .then(buffer => {
    const font = new FontFace(name, buffer);
    document.fonts.add(font);
  });

/* -----------------------------------
 * Drawing Fonts:
 * ----------------------------------- */
const defaultFont = 'Courier New';

const drawText = (value, x = 0, y = 0, fontSize = 8, font = null, color = null) => {
  ensure.number(fontSize);
  const text = Mewlix.purrify(value);

  context.font = `${Math.floor(fontSize) * sizeModifier}px ${font ?? defaultFont}, monospace`;
  context.fillStyle = color?.toString() ?? 'black';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

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

// Mutable state my behated!
/** @type {AudioBufferSourceNode} */
let musicSource = null;
/** @type {AudioBufferSourceNode} */
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
let initialized = false;  // Convenient flag.
let deltaTime = 0;        // Delta time, in seconds!

const init = async (callback) => {
  await loadFont('Silkscreen', '/assets/sinkscreen.ttf');
  initialized = true;

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
 * Standard library:
 * ----------------------------------- */
Mewlix.Graphic = {
  /* Delta time getter; readonly. */
  get delta() { return deltaTime },
};

/* -----------------------------------
 * Tests
 * ----------------------------------- */
async function dummy() {
  if (keyQueue.has('a')) {
    console.log('yay!');
  }
}

init(dummy);
