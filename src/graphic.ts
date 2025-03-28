'use strict';

import {
  Mewlix,
  Shelf,
  ErrorCode,
  MewlixError,
  MewlixValue,
  Box,
  reflection,
  wake,
  report,
  clamp_,
  purrify,
  createClowder,
  instantiate,
  isBox,
  isClowderInstance,
  shelfIterator,
  ClowderInstance,
  createBox,
  createYarnBall,
  mixYarnBall,
  isShelf,
  isGettable,
  ClowderBlueprint,
} from './mewlix.js';

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
export function percentageToByte(p: number) {
  return Math.floor((255 * p) / 100);
}

/* Convert byte (0 - 255) to percentage value (0% - 100%) */
export function byteToPercentage(b: number) {
  return Math.floor((100 * b) / 255);
}

/* Lerp (linear interpolation) util: */
export function lerp(start: number, end: number, x: number): number {
  return start + (end - start) * x;
}

/* - * - * - * - * - * - * - * - *
 * Resource Queue:
 * - * - * - * - * - * - * - * - * */

/* A queue to store data about resources to be loaded.
 * Items queued will be loaded when graphic.init() is called!
 *
 * The queue stores data about three types of resources:
 * - Generic (images, audio, fonts)
 * - Spritesheet sprites
 * - PixelCanvas sprite rendering
 * - Text files
 *
 * The 'type' attribute in each object stored in the queue
 * indicates the type of resource it represents. */

export type Resource =
  | { type: 'generic'; key: string; path: string; options?: Rectangle }
  | { type: 'canvas'; key: string; data: ImageData; }
  | { type: 'spritesheet'; path: string; frames: Shelf<SpritesheetCutout>; }
  | { type: 'text'; path: string; }

export type SpritesheetCutout = Box<{
  key:  string;
  rect: Rectangle;
}>;

export type ResourceLoader = (resource: Resource) => Promise<void>;

/* - * - * - * - * - * - * - * - *
 * Canvas Constants:
 * - * - * - * - * - * - * - * - * */
const virtualWidth  = 128;
const virtualHeight = 128;

const canvasWidth  = 1024;
const canvasHeight = 1024;
const sizeModifier = Math.floor(canvasWidth / virtualWidth);

/* - * - * - * - * - * - * - * - *
 * Assets:
 * - * - * - * - * - * - * - * - * */
function coreAsset(path: string): string {
  return './core/assets/' + path;
}

/* - * - * - * - * - * - * - * - *
 * Colors:
 * - * - * - * - * - * - * - * - * */
export type HexadecimalChar =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export type Byte = `${HexadecimalChar}${HexadecimalChar}`;

export type RGB = {
  red:   Byte;
  green: Byte;
  blue:  Byte;
};

const parseHex = /^#?([a-f0-9]{3}|[a-f0-9]{6})$/i;

export function hexToRGB(str: string): RGB | null {
  const matches = parseHex.exec(str.trim());
  if (matches === null) return null;

  const hexcode = matches[1];
  if (hexcode.length === 6) return {
    red:   hexcode.slice(0, 2) as Byte,
    green: hexcode.slice(2, 4) as Byte,
    blue:  hexcode.slice(4, 6) as Byte,
  };

  if (hexcode.length === 3) {
    const [r, g, b] = hexcode;
    return {
      red:   r + r as Byte,
      green: g + g as Byte,
      blue:  b + b as Byte,
    };
  }
  return null; /* Theoretically unreachable. */
}

export function hexToColor(str: string) {
  const rgb = hexToRGB(str);
  if (rgb === null) {
    throw new MewlixError(ErrorCode.Graphic,
      `Couldn't parse string '${str}' as a valid hex code!`);
  }
  return instantiate(Color)(
    parseInt(rgb.red  , 16),
    parseInt(rgb.green, 16),
    parseInt(rgb.blue , 16),
  );
}

export function rgbToHex(red: number, green: number, blue: number): string {
  return [red, green, blue].reduce((acc, x) => {
    const color = x.toString(16);
    return acc + (color.length < 2 ? '0' : '') + color;
  }, '#');
}

export const toColor: unique symbol = Symbol('toColor');

export function withColor(value: string | Color): string {
  if (typeof value === 'string') return value;    
  if (isClowderInstance(value) || isBox(value)) {
    return colorToStyle(value);
  }
  const typeOfValue = reflection.typeOf(value);
  throw new MewlixError(ErrorCode.Graphic,
    `Expected color value, received value of type "${typeOfValue}": ${value}`);
}

/* - * - * - * - * - * - * - * - *
 * Configuration:
 * - * - * - * - * - * - * - * - * */
type GraphicConfig = {
  mute?:  boolean;
  pause?: boolean;
};
const configKey = '_mewlix-graphic-config';

function tryParseJson<T>(input: string): T | null {
  /* We don't really care about JSON parser errors; just return 'null'.
   * Users will never write their own config manually.
   *
   * We're only try/catch-ing to be sure this won't blow up on users. */
  try { return JSON.parse(input) as T; } catch { return null; }
}

function readConfig(): GraphicConfig {
  const json   = globalThis.localStorage.getItem(configKey);
  const config = json && tryParseJson<GraphicConfig>(json);
  if (!config || typeof config !== 'object') {
    console.error('Couldn\'t load config from local storage!');
    return {};
  }
  return config;
}

function writeConfig(data: GraphicConfig): void {
  const config: GraphicConfig = {
    mute:  Boolean(data.mute),
  };
  globalThis.localStorage.setItem(
    configKey,
    JSON.stringify(config),
  );
}

/* - * - * - * - * - * - * - * - *
 * Vector2 Clowder:
 * - * - * - * - * - * - * - * - * */
type Vector2 = ClowderInstance;

export const Vector2 = createClowder('Vector2', null, {
  [wake](this: Vector2, x: number, y: number) {
    this.set('x', x);
    this.set('y', y);
    validateVector2(this);
  },
  add(this: Vector2, that: Vector2): Vector2 {
    validateVector2(this); validateVector2(that);
    return instantiate(Vector2)(
      (this.get('x') as number) + (that.get('x') as number),
      (this.get('y') as number) + (that.get('y') as number)
    );
  },
  mul(this: Vector2, that: Vector2): Vector2 {
    validateVector2(this); validateVector2(that);
    return instantiate(Vector2)(
      (this.get('x') as number) * (that.get('x') as number),
      (this.get('y') as number) * (that.get('y') as number),
    );
  },
  distance(this: Vector2, that: Vector2): number {
    validateVector2(this); validateVector2(that);
    const ax = this.get('x') as number;
    const ay = this.get('y') as number;
    const bx = that.get('x') as number;
    const by = that.get('y') as number;
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  },
  dot(this: Vector2, that: Vector2): number {
    validateVector2(this); validateVector2(that);
    const ax = this.get('x') as number;
    const ay = this.get('y') as number;
    const bx = that.get('x') as number;
    const by = that.get('y') as number;
    return ax * bx + ay * by;
  },
  clamp(this: Vector2, min: Vector2, max: Vector2): Vector2 {
    validateVector2(this); validateVector2(min); validateVector2(max);
    const x = clamp_(
      this.get('x') as number,
       min.get('x') as number,
       max.get('x') as number,
    );
    const y = clamp_(
      this.get('y') as number,
       min.get('y') as number,
       max.get('y') as number,
    );
    return instantiate(Vector2)(x, y);
  },
});

function validateVector2(value: Vector2): void {
  const x = value.get('x');
  const y = value.get('y');
  typeof x === 'number' || report.number('Vector2.x', x);
  typeof y === 'number' || report.number('Vector2.y', y);
}

/* - * - * - * - * - * - * - * - *
 * Rectangle Clowder:
 * - * - * - * - * - * - * - * - * */
type Rectangle = ClowderInstance;

const Rectangle = createClowder('Rectangle', null, {
  [wake](this: Rectangle, x: number, y: number, width: number, height: number) {
    this.set('x', x);
    this.set('y', y);
    this.set('width', width);
    this.set('height', height);
    validateRectangle(this);
  },
  contains(this: Rectangle, point: Vector2): boolean {
    validateRectangle(this); validateVector2(point);
    /* Point */
    const px = point.get('x') as number;
    const py = point.get('y') as number;

    /* Rectangle */
    const ax = this.get('x') as number;
    const ay = this.get('y') as number;
    const aw = this.get('width') as number;
    const ah = this.get('height') as number;

    return (px >= ax) && (py >= ay) && (px < ax + aw) && (py < ay + ah);
  },
  collides(this: Rectangle, that: Rectangle): boolean {
    validateRectangle(this); validateRectangle(that);

    /* Rectangle A */
    const ax = this.get('x') as number;
    const ay = this.get('y') as number;
    const aw = this.get('width') as number;
    const ah = this.get('height') as number;

    /* Rectangle B */
    const bx = that.get('x') as number;
    const by = that.get('y') as number;
    const bw = that.get('width') as number;
    const bh = that.get('height') as number;

    return (bx < ax + aw)
      && (bx + bw > ax)
      && (by < ay + ah)
      && (by + bh > ay);
  },
});

function validateRectangle(rect: Rectangle): void {
  const x = rect.get('x');
  const y = rect.get('y');
  const width  = rect.get('width');
  const height = rect.get('height');
  typeof x === 'number'      || report.number('Rectangle.x', x);
  typeof y === 'number'      || report.number('Rectangle.y', y);
  typeof width === 'number'  || report.number('Rectangle.width', width);
  typeof height === 'number' || report.number('Rectangle.height', height);
}

/* - * - * - * - * - * - * - * - *
 * Color Clowder:
 * - * - * - * - * - * - * - * - * */
/* Color container, wrapping a RGBA color value.
 * It accepts an opacity value too, in percentage. */
type Color = ClowderInstance;

const Color = createClowder('Color', null, {
  [wake](this: Color, red: number, green: number, blue: number, opacity: number = 100): void {
    this.set('red', red);
    this.set('green', green);
    this.set('blue', blue);
    this.set('opacity', opacity);
    validateColor(this);
  },
  alpha(this: Color): number {
    validateColor(this);
    return percentageToByte(this.get('opacity') as number);
  },
  to_hex(this: Color): string {
    validateColor(this);
    const red   = this.get('red')   as number;
    const green = this.get('green') as number;
    const blue  = this.get('blue')  as number;
    return rgbToHex(red, green, blue);
  }
});

function validateColor(color: Color) {
  const red     = color.get('red');
  const green   = color.get('green');
  const blue    = color.get('blue');
  const opacity = color.get('opacity');
  typeof red === 'number'     || report.number('Color.red', red);
  typeof green === 'number'   || report.number('Color.green', green);
  typeof blue === 'number'    || report.number('Color.blue', blue);
  typeof opacity === 'number' || report.number('Color.opacity', opacity);
}

function colorToStyle(color: Color) {
  validateColor(color);
  const red     = color.get('red')     as number;
  const green   = color.get('green')   as number;
  const blue    = color.get('blue')    as number;
  const opacity = color.get('opacity') as number;
  return `rgb(${red} ${green} ${blue} / ${opacity}%)`;
}

function valueToColor(value: string | Color): Color {
  if (typeof value === 'string') {
    return hexToColor(value);
  }
  validateColor(value);
  return value;
}

/* - * - * - * - * - * - * - * - *
 * Page Preparations:
 * - * - * - * - * - * - * - * - * */
function preventArrowKeys() {
  const preventKeys = new Set<string>([
    ' ',
    'Spacebar',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
  ]);

  window.addEventListener('keydown', event => {
    if (preventKeys.has(event.key)) {
      event.preventDefault();
    }
  }, { passive: false });
}

/* - * - * - * - * - * - * - * - *
 * Initializing Canvas:
 * - * - * - * - * - * - * - * - * */
export default function(mewlix: Mewlix): void {
  const canvas  = document.createElement('canvas');
  canvas.id     = 'game-canvas';
  canvas.width  = canvasWidth;
  canvas.height = canvasHeight;
  canvas.classList.add('contained', 'game-canvas');

  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;

  const spriteMap = new Map<string, ImageBitmap>();
  const audioMap  = new Map<string, AudioBuffer>();

  let inDOM = false;
  function addCanvasToDOM() {
    if (inDOM) return;
    inDOM = true;
    const container = document.getElementById('container') as HTMLDivElement;
    container.appendChild(canvas);
  }

  /* - * - * - * - * - * - * - * - *
   * Loading Images:
   * - * - * - * - * - * - * - * - * */
  /* Load an image file as ImageBitmap. */
  const loadImage = (path: string, rect?: Rectangle) => fetch(path)
    .then(response => response.blob())
    .then(blob => {
      if (!rect) return createImageBitmap(blob);
      return createImageBitmap(blob,
        rect.get('x')      as number,
        rect.get('y')      as number,
        rect.get('width')  as number,
        rect.get('height') as number,
      );
    });

  /* Load an image file as a sprite + add it to spriteMap. */
  const loadSprite = (key: string, path: string, rect?: Rectangle) => loadImage(path, rect)
    .then(image => {
      spriteMap.set(key, image);
      return image;
    });

  type SpriteDetails = {
    key: string;
    rect: Rectangle;
  };

  /* Load a spritesheet image and divide it into sprites. */
  async function fromSpritesheet(path: string, frames: Shelf<Box<SpriteDetails>>) {
    const sheet = await loadImage(path);
    const iterator = shelfIterator(frames)
    for (const frame of iterator) {
      validateSpriteDetails(frame);
      const key  = frame.get('key')  as SpriteDetails['key'];
      const rect = frame.get('rect') as SpriteDetails['rect'];
      const sprite = await createImageBitmap(
        sheet,
        rect.get('x')      as number,
        rect.get('y')      as number,
        rect.get('width')  as number,
        rect.get('height') as number,
      );
      spriteMap.set(key, sprite);
    }
  }

  function validateSpriteDetails(details: Box<SpriteDetails>) {
    isGettable(details) || report.gettable('SpriteDetails', details);
    const key  = details.get('key')  as SpriteDetails['key'];
    const rect = details.get('rect') as SpriteDetails['rect'];
    typeof key === 'string' || report.string('SpriteDetails.key', key);
    isGettable(rect)        || report.gettable('SpriteDetails.rect', rect);
    validateRectangle(rect);
  }

  /* - * - * - * - * - * - * - * - *
   * Drawing:
   * - * - * - * - * - * - * - * - * */
  function getSprite(key: string): ImageBitmap {
    if (!spriteMap.has(key)) {
      throw new MewlixError(ErrorCode.Graphic,
        `No loaded image resource associated with key "${key}"!`);
    }
    return spriteMap.get(key)!;
  }

  function drawSprite(key: string, x: number, y: number): void {
    const image = getSprite(key);
    context.drawImage(
      image,
      Math.floor(x ?? 0) * sizeModifier,
      Math.floor(y ?? 0) * sizeModifier,
      image.width  * sizeModifier,
      image.height * sizeModifier,
    );
  }

  function drawRect(rect: Rectangle, color: string | Color): void {
    context.fillStyle = withColor(color ?? 'black');
    const x = rect.get('x') as number;
    const y = rect.get('y') as number;
    const width  = rect.get('width') as number;
    const height = rect.get('height') as number;
    context.fillRect(
      x      * sizeModifier,
      y      * sizeModifier,
      width  * sizeModifier,
      height * sizeModifier,
    );
  }

  function fillCanvas(color: string | Color): void {
    context.fillStyle = withColor(color ?? 'black');
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /* - * - * - * - * - * - * - * - *
   * Loading Fonts:
   * - * - * - * - * - * - * - * - * */
  const loadFont = (name: string, url: string): Promise<void> => new FontFace(name, `url(${url})`)
    .load()
    .then(font => {
      document.fonts.add(font);
    });

  /* - * - * - * - * - * - * - * - *
   * Drawing Fonts:
   * - * - * - * - * - * - * - * - * */
  const defaultFont = 'Munro';
  const defaultFontSize = 8;

  type TextOptions = {
    font?: string;
    size?: number;
    color?: string | Color;
  };

  function setupText(options: TextOptions | null) {
    const font = options?.font ?? defaultFont;
    const fontSize = Math.floor(options?.size ?? defaultFontSize);

    context.font = `${fontSize * sizeModifier}px "${font}", monospace`;
    context.fillStyle = withColor(options?.color ?? 'black');
    context.textAlign = 'start';
    context.textBaseline = 'top';
  }

  function drawText(message: string, x: number = 0, y: number = 0, options: TextOptions | null = null) {
    setupText(options);
    context.fillText(
      message,
      Math.floor(x) * sizeModifier,
      Math.floor(y) * sizeModifier,
    );
  }

  function measureText(message: string, options: TextOptions | null = null) {
    setupText(options);
    const metrics = context.measureText(message);

    const width  = metrics.width / sizeModifier;
    const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / sizeModifier;

    return createBox({
      width:  Math.round(width),
      height: Math.round(height),
    });
  }

  /* - * - * - * - * - * - * - * - *
   * Loading Text Assets:
   * - * - * - * - * - * - * - * - * */
  const textMap: Map<string, string> = new Map();

  const loadText = (path: string): Promise<string> => fetch(path)
    .then(response => response.text())
    .then(text => {
      textMap.set(path, text);
      return text;
    });

  /* - * - * - * - * - * - * - * - *
   * Initializing Audio:
   * - * - * - * - * - * - * - * - * */
  const audioContext = new AudioContext();
  const masterVolume = audioContext.createGain();
  const compressor   = audioContext.createDynamicsCompressor();

  masterVolume.connect(compressor).connect(audioContext.destination);

  const musicVolume = audioContext.createGain();
  const sfxVolume   = audioContext.createGain();

  musicVolume.connect(masterVolume);
  sfxVolume.connect(masterVolume);
  masterVolume.gain.setValueAtTime(0.5, audioContext.currentTime);

  /* - * - * - * - * - * - * - * - *
   * Loading Audio:
   * - * - * - * - * - * - * - * - * */
  const loadAudio = (key: string, path: string): Promise<AudioBuffer> => fetch(path)
    .then(response => response.arrayBuffer())
    .then(buffer => audioContext.decodeAudioData(buffer))
    .then(audio => {
      audioMap.set(key, audio);
      return audio;
    });

  function getBuffer(key: string): AudioBuffer {
    if (!audioMap.has(key)) {
      throw new MewlixError(ErrorCode.Graphic,
        `No existing audio track is associated with the key "${key}"!`);
    }
    return audioMap.get(key)!;
  }

  /* - * - * - * - * - * - * - * - *
   * Playing Music:
   * - * - * - * - * - * - * - * - * */
  type MusicChannel = {
    track: AudioBufferSourceNode | null;
  };

  const musicChannel: MusicChannel = {
    track: null,
  };

  function playMusic(key: string) {
    musicChannel.track?.stop();
    const buffer = getBuffer(key);

    const track = audioContext.createBufferSource();
    track.buffer = buffer; 
    track.loop = true;
    track.connect(musicVolume);
    track.start();

    musicChannel.track = track;
  }

  function stopMusic(): void {
    musicChannel.track?.stop();
    musicChannel.track = null;
  }

  /* - * - * - * - * - * - * - * - *
   * Playing Music:
   * - * - * - * - * - * - * - * - * */
  type SoundChannel = AudioBufferSourceNode | null;

  const soundChannelCount = 8;
  const soundChannels: Array<SoundChannel> = new Array(soundChannelCount).fill(null);

  function withSoundChannel(index: number, callback: (audio: SoundChannel) => SoundChannel) {
    if (index < 0 || index >= soundChannelCount) {
      throw new MewlixError(ErrorCode.Graphic,
        `Invalid sound channel index: ${index}`);
    }
    soundChannels[index] = callback(soundChannels[index]);
  }

  function playSfx(key: string, index: number = 0) {
    withSoundChannel(index, channel => {
      channel?.stop();
      const buffer = getBuffer(key);

      const sound = audioContext.createBufferSource();
      sound.buffer = buffer; 
      sound.connect(sfxVolume);
      sound.start();

      return sound;
    });
  }

  function stopSfx(index: number = 0) {
    withSoundChannel(index, channel => {
      channel?.stop();
      return null;
    });
  }

  function stopAllSfx(): void {
    soundChannels.forEach(channel => channel?.stop());
    soundChannels.fill(null);
  }

  /* - * - * - * - * - * - * - * - *
   * Volume Control:
   * - * - * - * - * - * - * - * - * */
  let mute: boolean = false;

  function setVolumeOf(node: GainNode, volume: number) {
    node.gain.cancelScheduledValues(audioContext.currentTime);
    node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
    node.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.5);
  }

  class VolumeControl {
    node: GainNode;
    volume: number;

    constructor(node: GainNode) {
      this.node = node;
      this.volume = node.gain.value;
    }

    set(volume: number) {
      this.volume = volume;
      this.update();
    }

    update(): void {
      const value = this.volume * Number(!mute);
      setVolumeOf(this.node, value);
    }
  }

  const gameVolume = {
    master: new VolumeControl(masterVolume),
    music: new VolumeControl(musicVolume),
    sfx: new VolumeControl(sfxVolume),
    update: function() {
      this.master.update();
      this.music.update();
      this.sfx.update();
    },
  }

  /* - * - * - * - * - * - * - * - *
   * Generic Loading:
   * - * - * - * - * - * - * - * - * */
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

  function getExtensionOf(path: string): string | undefined {
    return /\.([a-zA-Z0-9]{3,4})$/.exec(path)?.[1];
  }

  async function loadAny(key: string, path: string, options?: Rectangle) {
    const extension = getExtensionOf(path)?.toLowerCase();
    if (!extension) {
      throw new MewlixError(ErrorCode.Graphic,
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

    throw new MewlixError(ErrorCode.Graphic,
      `Unrecognized file format "${extension}" in 'load' function!`);
  }

  /* - * - * - * - * - * - * - * - *
   * Resource Queue:
   * - * - * - * - * - * - * - * - * */
  const resourceQueue: Resource[] = [];

  async function loadResource(resource: Resource) {
    if (resource.type === 'generic') {
      const { key, path, options } = resource;
      await loadAny(key, path, options);
    }
    else if (resource.type === 'canvas') {
      const { key, data } = resource;
      const image = await createImageBitmap(data);
      spriteMap.set(key, image);
    }
    else if (resource.type === 'spritesheet') {
      const { path, frames } = resource;
      await fromSpritesheet(path, frames);
    }
    else if (resource.type === 'text') {
      const { path } = resource;
      await loadText(path);
    }
  }

  async function loadResources() {
    const loadingCat = document.getElementById('loading-cat') as HTMLImageElement;
    context.drawImage(loadingCat, 0, 0, canvasWidth, canvasHeight);

    /* Add canvas to DOM once we're ready to draw. */
    addCanvasToDOM();
    loadingCat.remove();

    function drawProgressBar(progress: number) {
      const width = (progress * 512) / (resourceQueue.length - 1);
      context.fillStyle = '#5F4375';
      context.fillRect(256, 668, Math.floor(width), 24);
    }

    let progress = 0;
    for (const resource of resourceQueue) {
      await loadResource(resource);
      drawProgressBar(progress++);
    }
  }

  /* - * - * - * - * - * - * - * - *
   * Keyboard Events
   * - * - * - * - * - * - * - * - * */
  const keysDown = new Set<string>();
  const keyQueue = new Set<string>();

  window.addEventListener('keydown', event => {
    if (event.repeat) return;
    keyQueue.add(event.key);
    keysDown.add(event.key);
  }, { passive: true });

  window.addEventListener('keyup', event => {
    keysDown.delete(event.key);
  }, { passive: true });

  const isKeyPressed  = (key: string) => keyQueue.has(key);
  const isKeyDown     = (key: string) => keysDown.has(key);
  //const isKeyUp       = (key: string) => !keysDown.has(key);

  function flushKeyQueue(): void {
    keyQueue.clear();
  }

  /* - * - * - * - * - * - * - * - *
   * Mouse Events:
   * - * - * - * - * - * - * - * - * */
  let mouseX: number = 0;
  let mouseY: number = 0;

  let mouseClick: boolean = false;
  let mouseDown:  boolean = false;

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

  const isMousePressed = () => mouseClick;
  const isMouseDown    = () => mouseDown;

  function flushClick(): void {
    mouseClick = false;
  }

  /* - * - * - * - * - * - * - * - *
   * Screenshots:
   * - * - * - * - * - * - * - * - * */
  async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob)));
  }

  function screenshotName(date: Date): string {
    const prefix = 'mewlix-screenshot';
    const day   = date.getDate();
    const month = date.getMonth() + 1;
    const year  = date.getFullYear();
    const hour  = date.getHours();
    const seconds = date.getSeconds();
    return `${prefix}-${month}-${day}-${year}-at-${hour}-${seconds}.png`;
  }

  async function takeScreenshot(): Promise<void> {
    const blob = await canvasBlob(canvas);
    const url  = blob && URL.createObjectURL(blob);
    if (!url) {
      throw new MewlixError(ErrorCode.Graphic,
        `Couldn't take screenshot: couldn't generate canvas blob!`);
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = screenshotName(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();

    /* Q: "Can you really revoke the object URL yet?"
     * A: Hopefully, in theory...?
     * https://github.com/whatwg/html/issues/954#issue-144165132
     * I am setting a little timeout purely to be safe. c': */
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /* - * - * - * - * - * - * - * - *
   * Utility Clowders:
   * - * - * - * - * - * - * - * - * */
  /* A pixel canvas for efficiently creating sprites.
   * The .to_sprite() method creates a new sprite and adds it to spriteMap. */
  type PixelCanvas = ClowderInstance & {
    data: Uint8ClampedArray;
  };

  const PixelCanvas = createClowder('PixelCanvas', null, {
    [wake](this: PixelCanvas, width: number, height: number) {
      this.set('width', width);
      this.set('height', height);
      this.data = new Uint8ClampedArray(width * height * 4);
      validatePixelCanvas(this);
    },
    fill(this: PixelCanvas, color: string | Color): void {
      const data = this.data;
      if (!data) throw pixelCanvasError();
      validatePixelCanvas(this);

      const trueColor = valueToColor(color);
      const red   = trueColor.get('red')   as number;
      const green = trueColor.get('green') as number;
      const blue  = trueColor.get('blue')  as number;

      const getAlpha = trueColor.get('alpha') as () => number;
      const alpha = getAlpha();

      for (let i = 0; i < data.length; i += 4) {
        data[i]     = red;
        data[i + 1] = green;
        data[i + 2] = blue;
        data[i + 3] = alpha;
      }
    },
    set_pixel(this: PixelCanvas, x: number, y: number, color: string | Color): void {
      const data = this.data;
      if (!data) throw pixelCanvasError();
      validatePixelCanvas(this);
      typeof x === 'number' || report.number('PixelCanvas.set_pixel', x);
      typeof y === 'number' || report.number('PixelCanvas.set_pixel', y);

      const trueColor = valueToColor(color);
      const red   = trueColor.get('red')   as number;
      const green = trueColor.get('green') as number;
      const blue  = trueColor.get('blue')  as number;

      const getAlpha = trueColor.get('alpha') as () => number;
      const alpha = getAlpha();

      const width = this.get('width') as number;
      const i = (x * width + y) * 4;
      data[i]     = red;
      data[i + 1] = green;
      data[i + 2] = blue;
      data[i + 3] = alpha;
    },
    get_pixel(this: PixelCanvas, x: number, y: number): Color {
      const data = this.data;
      if (!data) throw pixelCanvasError();
      validatePixelCanvas(this);
      typeof x === 'number' || report.number('PixelCanvas.get_pixel', x);
      typeof y === 'number' || report.number('PixelCanvas.get_pixel', y);

      const width = this.get('width') as number;
      const i = (x * width + y) * 4;
      return instantiate(Color)(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
      );
    },
    to_sprite(this: PixelCanvas, key: string): void {
      const data = this.data;
      if (!data) throw pixelCanvasError();
      validatePixelCanvas(this);
      typeof key === 'string' || report.string('PixelCanvas.to_sprite', key);

      const width  = this.get('width')  as number;
      const height = this.get('height') as number;
      const copy = new Uint8ClampedArray(data);
      resourceQueue.push({
        type: 'canvas',
        key: key,
        data: new ImageData(copy, width, height),
      });
    },
  } as ClowderBlueprint);

  function validatePixelCanvas(canvas: PixelCanvas): void {
    const width  = canvas.get('width');
    const height = canvas.get('height');
    typeof width === 'number'  || report.number('PixelCanvas.width', width);
    typeof height === 'number' || report.number('PixelCanvas.height', height);
  }

  function pixelCanvasError(): MewlixError {
    return new MewlixError(ErrorCode.InvalidOperation,
      'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
  }

  /* - * - * - * - * - * - * - * - *
   * Game Loop
   * - * - * - * - * - * - * - * - * */
  type GameLoop = (delta: number) => void;

  let deltaTime: number = 0;        /* Δt (delta time), in seconds. */
  let thumbnail: GameLoop | null;   /* Function for generating a game preview. */
  let initialized: boolean = false; /* Flag indicating whether .init() has been called. */

  const config = readConfig();      /* Graphic config (e.g. sound settings). */
  let paused: boolean = false;      /* "Is the game paused?" */
  let screenshot: boolean = false;  /* "Should a screenshot be taken this frame?" */
  let saveConfig: boolean = false;  /* "Should graphic config (e.g. sound settings) be saved?" */

  function setThumbnail(fn: GameLoop): void {
    if (initialized) {
      console.warn('[mewlix] Setting thumbnail after .init() has no effect!');
    }
    thumbnail = fn;
  }

  function awaitClick(): Promise<void> {
    return new Promise(resolve => {
      canvas.addEventListener(
        'click',
        () => audioContext.resume().then(resolve),
        { once: true }
      )
    });
  }

  async function awaitStart() {
    /* Load image asset. */
    const play = await loadImage(coreAsset('mewlix-play.png'));

    /* Draw 'play' screen once everything is ready. */
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    thumbnail?.(0);
    context.fillStyle = 'rgb(0 0 0 / 50%)';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(play, 0, 0);

    /* Await click. Once clicked, conclude. */
    await awaitClick();
    play.close();
  }

  async function drawError(): Promise<void> {
    const image = await loadImage(coreAsset('mewlix-error.png'));
    context.fillStyle = 'rgb(255 0 0 / 50%)';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, 0, 0);
  }

  async function init(fn: GameLoop): Promise<void> {
    initialized = true;
    preventArrowKeys();

    /* Load core font. */
    await loadFont('Munro', coreAsset('fonts/Munro/munro.ttf'));

    /* Wait for next frame. */
    function nextFrame(): Promise<number> {
      return new Promise(resolve => {
        window.requestAnimationFrame(resolve);
      });
    }

    try {
      /* Run resources, dynamically update progress bar. */
      await loadResources();

      /* Show 'play' screen; await a click. */
      await awaitStart();

      /* Store last frame's timestamp, in milliseconds. */
      let lastFrame: number; 

      /* Flush key queues, in case they're dirty. XP */
      flushKeyQueue();
      flushClick();

      /* Run game loop. */
      while (true) {
        if (!paused) {
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          fn(deltaTime);
        }
        if (screenshot) {
          await takeScreenshot();
          screenshot = false;
        }
        if (saveConfig) {
          writeConfig(config);
          saveConfig = false;
        }

        /* Flush key queue every frame. */
        flushKeyQueue();
        flushClick();

        /* Calculate Δt (delta time). */
        const now = await nextFrame();
        lastFrame ??= now;

        deltaTime = (now - lastFrame) / 1000;
        lastFrame = now;
      }
    }
    catch(error) {
      await drawError();
      throw error;
    }
  }

  function resourceError(func: string, resource: string): void {
    throw new MewlixError(ErrorCode.Graphic,
      `Couldn't load resource "${resource}" with ${func}: Resources cannot be called after .init().`);
  }

  function noGameLoopError(func: string): void {
    throw new MewlixError(ErrorCode.Graphic,
      `Couldn't call function ${func}: Game loop not yet initialized!`);
  }

  /* - * - * - * - * - * - * - * - *
   * Meow Expression
   * - * - * - * - * - * - * - * - * */
  type MeowOptions = TextOptions & {
    x?: number;
    y?: number;
  };

  let meowOptions: MeowOptions | null = null;

  mewlix.setMeow((message: string) => {
    drawText(
      message,
      meowOptions?.x ?? 0,
      meowOptions?.y ?? 0,
      meowOptions
    );
    return message;
  });

  /* - * - * - * - * - * - * - * - *
   * Navigation Buttons:
   * - * - * - * - * - * - * - * - * */
  const soundButton  = document.getElementById('game-sound') as HTMLButtonElement;
  const pauseButton  = document.getElementById('game-pause') as HTMLButtonElement;
  const cameraButton = document.getElementById('game-screenshot') as HTMLButtonElement;

  /* Make changes to page from config! */
  if (config.mute) { soundToggle() };

  function soundToggle(): void {
    mute = !mute;
    config.mute = mute;
    if (mute) {
      soundButton.classList.add('muted');
    }
    else {
      soundButton.classList.remove('muted');
    }
    gameVolume.update();
  }

  function pauseToggle(): void {
    paused = !paused;
    config.pause = paused;

    /* When pausing a game, pause audio context too. */
    if (paused) {
      pauseButton.classList.add('paused');
      if (audioContext.state === 'running') {
        audioContext.suspend();
      }
    }
    else {
      pauseButton.classList.remove('paused');
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
  }

  soundButton.addEventListener('click', event => {
    event.preventDefault();
    soundToggle();
    saveConfig = true;
  });

  pauseButton.addEventListener('click', event => {
    event.preventDefault();
    pauseToggle();
    saveConfig = true;
  });

  cameraButton.addEventListener('click', event => {
    event.preventDefault();
    /* We ~always~ want to screenshot when this button is clicked. */
    screenshot = true;
  });

  /* - * - * - * - * - * - * - * - *
   * Standard library:
   * - * - * - * - * - * - * - * - * */
  /* The std.graphic library documentation can be found in... (see readme).
   *
   * It won't be included in this source file to avoid clutter.
   * All standard library functions *should use snake_case*. */

  const graphicLib = {
    init(fn: GameLoop): Promise<void> {
      typeof fn === 'function' || report.func('graphic.init', fn);
      if (initialized) {
        throw new MewlixError(ErrorCode.Graphic,
          'Cannot call .init(): Game loop has already been initialized!');
      }
      return init(fn);
    },

    init_(fn: GameLoop): Promise<void> {
      typeof fn === 'function' || report.func('graphic.init_', fn);
      setThumbnail(fn);
      return init(fn);
    },

    delta: () => deltaTime,

    load(key: string, path: string, options?: Box<Rectangle>): void {
      typeof key  === 'string' || report.string('graphic.load', key);
      typeof path === 'string' || report.string('graphic.load', path);
      !initialized || resourceError('graphic.load', path);
      resourceQueue.push({
        type: 'generic',
        key: key,
        path: path, 
        options: options?.bindings,
      });
    },

    thumbnail(fn: GameLoop): void {
      typeof fn === 'function' || report.func('graphic.thumbnail', fn);
      setThumbnail(fn)
    },

    spritesheet(path: string, frames: Shelf<Box<SpriteDetails>>): void {
      typeof path === 'string' || report.string('graphic.spritesheet', path);
      isShelf(frames)          || report.shelf('graphic.spritesheet', frames)
      !initialized || resourceError('graphic.spritesheet', path);
      resourceQueue.push({
        type: 'spritesheet',
        path: path,
        frames: frames,
      });
    },

    draw(key: string, x: number = 0, y: number = 0): void {
      typeof key === 'string' || report.string('graphic.draw', key);
      typeof x === 'number'   || report.number('graphic.draw', x);
      typeof y === 'number'   || report.number('graphic.draw', y);
      initialized || noGameLoopError('graphic.draw');
      return drawSprite(key, x, y);
    },

    measure(key: string) {
      const image = getSprite(key);
      return createBox({
        width:  image.width,
        height: image.height,
      });
    },

    rect(rect: Rectangle, color: string | Color): void {
      isGettable(rect) || report.gettable('graphic.rect', rect);
      validateRectangle(rect);
      initialized || noGameLoopError('graphic.rect');
      return drawRect(rect, color);
    },

    paint(color: string | Color): void {
      initialized || noGameLoopError('graphic.color');
      return fillCanvas(color);
    },

    write(value: MewlixValue, x: number = 0, y: number = 0, options?: Box<TextOptions>) {
      typeof x === 'number' || report.number('graphic.write', x);
      typeof y === 'number' || report.number('graphic.write', y);
      initialized || noGameLoopError('graphic.write');
      return drawText(purrify(value), x, y, options?.bindings);
    },

    measure_text(value: MewlixValue, options?: Box<TextOptions>) {
      return measureText(purrify(value), options?.bindings);
    },

    load_text(path: string): void {
      typeof path === 'string' || report.string('graphic.load_text', path);
      !initialized || resourceError('graphic.load_text', path)
      resourceQueue.push({
        type: 'text',
        path: path,
      });
    },

    get_text(path: string): string {
      typeof path === 'string' || report.string('graphic.get_text', path);
      initialized || noGameLoopError('graphic.load_text')
      const text = textMap.get(path);
      if (text === undefined) {
        throw new MewlixError(ErrorCode.Graphic,
          `Can't load text asset: no asset matches key: ${path}`);
      }
      return text;
    },

    meow_options(box: Box<MeowOptions>): void {
      isGettable(box) || report.gettable('graphic.meow_options', box);
      meowOptions = box.bindings;
    },

    key_pressed(key: string) {
      typeof key === 'string' || report.string('graphic.key_pressed', key);
      initialized || noGameLoopError('graphic.key_pressed')
      return isKeyPressed(key);
    },

    key_down(key: string) {
      typeof key === 'string' || report.string('graphic.key_down', key);
      initialized || noGameLoopError('graphic.key_down')
      return isKeyDown(key);
    },

    keys: createBox({
      space: ' ',
      enter: 'Enter',
      left : 'ArrowLeft',
      right: 'ArrowRight',
      up   : 'ArrowUp',
      down : 'ArrowDown',
    }),

    mouse_click: isMousePressed,
    mouse_down: isMouseDown,

    mouse_position: () => instantiate(Vector2)(
      mouseX,
      mouseY,
    ),

    play_music(key: string) {
      typeof key === 'string' || report.string('graphic.play_music', key);
      initialized || noGameLoopError('graphic.play_music')
      return playMusic(key);
    },

    play_sfx(key: string, channel: number = 0) {
      typeof key     === 'string' || report.string('graphic.play_sfx', key);
      typeof channel === 'number' || report.number('graphic.play_sfx', channel);
      initialized || noGameLoopError('graphic.play_sfx')
      return playSfx(key, channel);
    },

    volume(value: number) {
      typeof value === 'number' || report.number('graphic.volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.master.set(value);
    },

    music_volume(value: number) {
      typeof value === 'number' || report.number('graphic.music_volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.music.set(value);
    },

    sfx_volume(value: number) {
      typeof value === 'number' || report.number('graphic.sfx_volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.sfx.set(value);
    },

    stop_music: stopMusic,

    stop_sfx(channel: number) {
      typeof channel === 'number' || report.number('graphic.stop_sfx', channel);
      return stopSfx(channel);
    },

    stop_all_sfx: stopAllSfx,

    lerp(start: number, end: number, x: number): number {
      typeof start === 'number' || report.number('graphic.lerp', start);
      typeof end   === 'number' || report.number('graphic.lerp', end);
      typeof x     === 'number' || report.number('graphic.lerp', x);
      return lerp(start, end, x);
    },

    hex(str: string): Color {
      typeof str === 'string' || report.string('graphic.hex', str);
      return hexToColor(str);
    },

    Vector2: Vector2,
    Rectangle: Rectangle,
    Color: Color,
    PixelCanvas: PixelCanvas,

    page_background(color: string | Color): void {
      document.body.style.backgroundColor = withColor(color);
    },
  };
  mewlix.lib['std.graphic'] = createYarnBall('std.graphic', graphicLib);

  /* - * - * - * - * - * - * - * - *
   * Standard library - Curry:
   * - * - * - * - * - * - * - * - * */
  const GraphicCurry = (() => {
    const graphic = graphicLib;

    return {
      load: (key: string) =>
        (path: string) =>
          (options?: Box<Rectangle>) =>
            graphic.load(key, path, options),

      spritesheet: (path: string) =>
        (frames: Shelf<Box<SpriteDetails>>) =>
          graphic.spritesheet(path, frames),

      draw: (key: string) =>
        (x: number) =>
          (y: number) =>
            graphic.draw(key, x, y),

      rect: (rect: Rectangle) =>
        (color: string | Color) =>
          graphic.rect(rect, color),

      write: (value: MewlixValue) =>
        (x: number) =>
          (y: number) =>
            (options: Box<TextOptions>) =>
              graphic.write(value, x, y, options),

      measure_text: (value: MewlixValue) =>
        (options: Box<TextOptions>) =>
          graphic.measure_text(value, options),
    
      play_sfx: (key: string) =>
        (channel: number) =>
          graphic.play_sfx(key, channel),

      lerp: (start: number) =>
        (end: number) =>
          (x: number) =>
            graphic.lerp(start, end, x),
    };
  })();
  mewlix.lib['std.graphic.curry'] = mixYarnBall('std.graphic.curry', graphicLib, GraphicCurry);

  /* - * - * - * - * - * - * - * - *
   * Run Console:
   * - * - * - * - * - * - * - * - * */
  mewlix.run = async (func) => {
    try {
      return func();
    }
    catch (error) {
      await drawError();
      throw error;
    }
  };
}
