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
  ensure,
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
    red:   matches[1].slice(0, 2) as Byte,
    green: matches[1].slice(2, 4) as Byte,
    blue:  matches[1].slice(4, 6) as Byte,
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

/* Canvas constants: */
export const virtualWidth  = 128;
export const virtualHeight = 128;

export const gridSlotWidth  = 16;
export const gridSlotHeight = 16;
export const gridColumns = Math.floor(virtualWidth  / gridSlotWidth );
export const gridRows    = Math.floor(virtualHeight / gridSlotHeight);

/* Colors: */
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
 * Vector2:
 * - * - * - * - * - * - * - * - * */
export type Vector2 = ClowderInstance<Vector2Bindings>;

type Vector2Bindings = {
  [wake](this: Vector2, x: number, y: number): void;
  x: number;
  y: number;
  add(this: Vector2, that: Vector2): Vector2;
  mul(this: Vector2, that: Vector2): Vector2;
  distance(this: Vector2, that: Vector2): number;
  dot(this: Vector2, that: Vector2): number;
  clamp(this: Vector2, min: Vector2, max: Vector2): Vector2;
};

export const Vector2 = createClowder<Vector2Bindings>('Vector2', null, () => {
  return {
    x: 0,
    y: 0,
    [wake](this: Vector2, x: number, y: number) {
      this.bindings.x = x;
      this.bindings.y = y;
      ensureVector2(this);
    },
    add(this: Vector2, that: Vector2): Vector2 {
      ensureVector2(this); ensureVector2(that);
      return instantiate(Vector2)(
        this.bindings.x + that.bindings.x,
        this.bindings.y + that.bindings.y,
      );
    },
    mul(this: Vector2, that: Vector2): Vector2 {
      ensureVector2(this); ensureVector2(that);
      return instantiate(Vector2)(
        this.bindings.x * that.bindings.x,
        this.bindings.y * that.bindings.y,
      );
    },
    distance(this: Vector2, that: Vector2): number {
      ensureVector2(this); ensureVector2(that);
      const ax = this.bindings.x;
      const ay = this.bindings.y;
      const bx = that.bindings.x;
      const by = that.bindings.y;
      return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
    },
    dot(this: Vector2, that: Vector2): number {
      ensureVector2(this); ensureVector2(that);
      const ax = this.bindings.x;
      const ay = this.bindings.y;
      const bx = that.bindings.x;
      const by = that.bindings.y;
      return ax * bx + ay * by;
    },
    clamp(this: Vector2, min: Vector2, max: Vector2): Vector2 {
      ensureVector2(this); ensureVector2(min); ensureVector2(max);
      return instantiate(Vector2)(
        clamp_(this.bindings.x, min.bindings.x, max.bindings.x),
        clamp_(this.bindings.y, min.bindings.y, max.bindings.y),
      );
    },
   }
});

function ensureVector2(value: Vector2): void {
  ensure.number('Vector2.x', value.bindings.x);
  ensure.number('Vector2.y', value.bindings.x);
}

/* - * - * - * - * - * - * - * - *
 * Rectangle:
 * - * - * - * - * - * - * - * - * */
type Rectangle = ClowderInstance<RectangleBindings>;

type RectangleBindings = {
  [wake](this: Rectangle, x: number, y: number, width: number, height: number): void;
  x: number;
  y: number;
  width: number;
  height: number;
  contains(this: Rectangle, point: Vector2): boolean;
  collides(this: Rectangle, that: Rectangle): boolean;
};

const Rectangle = createClowder<RectangleBindings>('Rectangle', null, () => {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    [wake](this: Rectangle, x: number, y: number, width: number, height: number) {
      this.bindings.x = x;
      this.bindings.y = y;
      this.bindings.width = width;
      this.bindings.height = height;
      ensureRectangle(this);
    },
    contains(this: Rectangle, point: Vector2): boolean {
      ensureRectangle(this); ensureVector2(point);
      const { x: px, y: py } = point.bindings;
      const { x: ax, y: ay, width: aw, height: ah } = this.bindings;
      return (px >= ax) && (py >= ay) && (px < ax + aw) && (py < ay + ah);
    },
    collides(this: Rectangle, that: Rectangle): boolean {
      ensureRectangle(this); ensureRectangle(that);
      const { x: ax, y: ay, width: aw, height: ah } = this.bindings;
      const { x: bx, y: by, width: bw, height: bh } = that.bindings;
      return (bx < ax + aw)
        && (bx + bw > ax)
        && (by < ay + ah)
        && (by + bh > ay);
    },
  };
});

function ensureRectangle(rect: Rectangle): void {
  ensure.number('Rectangle.x'     , rect.bindings.x);
  ensure.number('Rectangle.y'     , rect.bindings.y);
  ensure.number('Rectangle.width' , rect.bindings.width );
  ensure.number('Rectangle.height', rect.bindings.height);
}

/* - * - * - * - * - * - * - * - *
 * Grid Slot:
 * - * - * - * - * - * - * - * - * */
type GridSlot = ClowderInstance<GridSlotLike>;

type GridSlotLike = {
  [wake](this: GridSlot, x: number, y: number): void;
  row:    number;
  column: number;
  position(this: GridSlot): Vector2;
};

const GridSlot = createClowder<GridSlotLike>('GridSlot', null, () => {
  return {
    row: 0,
    column: 0,
    [wake](this: GridSlot, row: number, column: number): void {
      this.bindings.row    = row;
      this.bindings.column = column;
      ensureGridSlot(this);
    },
    position(this: GridSlot): Vector2 {
      return gridSlotToPosition(this);
    },
  };
});

function ensureGridSlot(slot: GridSlot): void {
  ensure.number('GridSlot.row'   , slot.bindings.row   );
  ensure.number('GridSlot.column', slot.bindings.column);
}

export function positionToGridSlot(point: Vector2) {
  ensureVector2(point);
  const row = point.bindings.x / gridSlotHeight;
  const col = point.bindings.y / gridSlotWidth;
  return instantiate(GridSlot)(row, col);
}

export function gridSlotToPosition(slot: GridSlot) {
  ensureGridSlot(slot);
  return instantiate(Vector2)(
    slot.bindings.column * gridSlotWidth,
    slot.bindings.row * gridSlotHeight,
  );
}

/* - * - * - * - * - * - * - * - *
 * Color:
 * - * - * - * - * - * - * - * - * */
/* Color container, wrapping a RGBA color value.
 * It accepts an opacity value too, in percentage. */
type Color = ClowderInstance<ColorLike>;

type ColorLike = {
  [wake]: (this: Color, red: number, green: number, blue: number, opacity?: number) => void;
  red:     number;
  green:   number;
  blue:    number;
  opacity: number;
  alpha(this: Color): number;
};

const Color = createClowder<ColorLike>('Color', null, () => {
  return {
    red:     0,
    green:   0,
    blue:    0,
    opacity: 0,
    [wake](this: Color, red: number, green: number, blue: number, opacity: number = 100): void {
      this.bindings.red = red;
      this.bindings.green = green;
      this.bindings.blue = blue;
      this.bindings.opacity = opacity;
      ensureColor(this);
    },
    alpha(this: Color): number {
      ensureColor(this);
      return percentageToByte(this.bindings.opacity);
    },
    to_hex(this: Color): string {
      ensureColor(this);
      const { red, green, blue } = this.bindings;
      return `#${red}${green}${blue}`;
    }
  }
});

function ensureColor(color: Color) {
  ensure.number('Color.red'    , color.bindings.red    );
  ensure.number('Color.green'  , color.bindings.green  );
  ensure.number('Color.blue'   , color.bindings.blue   );
  ensure.number('Color.opacity', color.bindings.opacity);
}

function colorToStyle(color: Color) {
  ensureColor(color);
  const red     = color.bindings.red;
  const green   = color.bindings.green;
  const blue    = color.bindings.blue;
  const opacity = color.bindings.opacity;
  return `rgb(${red} ${green} ${blue} / ${opacity}%)`;
}

export default function(mewlix: Mewlix): void {
  /* - * - * - * - * - * - * - * - *
   * Initializing Canvas:
   * - * - * - * - * - * - * - * - * */
  const canvas  = document.getElementById('game-canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;

  const canvasWidth  = canvas.width;
  const canvasHeight = canvas.height;
  const sizeModifier = Math.floor(canvas.width / virtualWidth);

  const spriteMap = new Map<string, ImageBitmap>();
  const audioMap  = new Map<string, AudioBuffer>();

  /* - * - * - * - * - * - * - * - *
   * Loading Images:
   * - * - * - * - * - * - * - * - * */
  /* Load an image file as ImageBitmap. */
  const loadImage = (path: string, rect?: Rectangle) => fetch(path)
    .then(response => response.blob())
    .then(blob => {
      if (!rect) return createImageBitmap(blob);
      return createImageBitmap(blob,
        rect.bindings.x,
        rect.bindings.y,
        rect.bindings.width,
        rect.bindings.height,
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
      const { key, rect } = frame.bindings;
      const { x, y, width, height } = rect.bindings;
      const sprite = await createImageBitmap(sheet, x, y, width, height);
      spriteMap.set(key, sprite);
    }
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
    const { x, y, width, height } = rect.bindings;
    context.fillRect(
      x      * sizeModifier,
      y      * sizeModifier,
      width  * sizeModifier,
      height * sizeModifier,
    );
  }

  function fillCanvas(color: Color): void {
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
   * Sound Button:
   * - * - * - * - * - * - * - * - * */
  const soundButton = document.getElementById('game-sound') as HTMLButtonElement;

  soundButton.addEventListener('click', () => {
    mute = !mute;

    if (mute) {
      soundButton.classList.add('muted');
    }
    else {
      soundButton.classList.remove('muted');
    }

    gameVolume.update();
  });

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

  /* A queue to store data about resources to be loaded.
   * Items queued will be loaded when graphic.init() is called!
   *
   * The queue stores data about three tpyes of resources:
   * - Generic (images, audio, fonts)
   * - Spritesheet sprites
   * - PixelCanvas sprite rendering
   *
   * The 'type' attribute in each object stored in the queue
   * indicates the type of resource it represents. */

  type Resource =
    | { type: 'generic'; key: string; path: string; options?: Rectangle }
    | { type: 'canvas'; key: string; data: ImageData; }
    | { type: 'spritesheet'; path: string; frames: Shelf<Box<SpriteDetails>>; }

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
  }

  async function loadResources(): Promise<void> {
    for (const resource of resourceQueue) {
      await loadResource(resource);
    }
    resourceQueue.length = 0;
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
   * Utility Clowders:
   * - * - * - * - * - * - * - * - * */
  /* A pixel canvas for efficiently creating sprites.
   * The .to_image() creates a new sprite and adds it to spriteMap. */
  type PixelCanvas = ClowderInstance<PixelCanvasLike>;

  type PixelCanvasLike = {
    [wake](this: PixelCanvas, width: number, height: number): void;
    width:  number;
    height: number;
    fill(this: PixelCanvas, color: Color): void;
    set_pixel(this: PixelCanvas, x: number, y: number, color: Color): void;
    get_pixel(this: PixelCanvas, x: number, y: number): Color;
    to_sprite(this: PixelCanvas, key: string): void;
  };

  const PixelCanvas = createClowder('PixelCanvas', null, () => {
    let data: Uint8ClampedArray | null;
    return {
      [wake](this: PixelCanvas, width: number, height: number) {
        this.bindings.width  = width;
        this.bindings.height = height;
        data = new Uint8ClampedArray(width * height * 4);
        ensurePixelCanvas(this);
      },
      width:  0,
      height: 0,
      fill(this: PixelCanvas, color: Color): void {
        if (!data) throw pixelCanvasError();
        ensurePixelCanvas(this);

        const { red, green, blue } = color.bindings;
        const alpha = color.bindings.alpha.call(color);

        for (let i = 0; i < data.length; i += 4) {
          data[i]     = red;
          data[i + 1] = green;
          data[i + 2] = blue;
          data[i + 3] = alpha;
        }
      },
      set_pixel(this: PixelCanvas, x: number, y: number, color: Color): void {
        if (!data) throw pixelCanvasError();
        ensurePixelCanvas(this);
        ensure.number('PixelCanvas.set_pixel', x);
        ensure.number('PixelCanvas.set_pixel', y);

        const { red, green, blue } = color.bindings;
        const alpha = color.bindings.alpha.call(color);

        const i = (x * this.bindings.width + y) * 4;
        data[i]     = red;
        data[i + 1] = green;
        data[i + 2] = blue;
        data[i + 3] = alpha;
      },
      get_pixel(this: PixelCanvas, x: number, y: number): Color {
        if (!data) throw pixelCanvasError();
        ensurePixelCanvas(this);
        ensure.number('PixelCanvas.get_pixel', x);
        ensure.number('PixelCanvas.get_pixel', y);

        const i = (x * this.bindings.width + y) * 4;
        return instantiate(Color)(
          data[i],
          data[i + 1],
          data[i + 2],
          data[i + 3],
        );
      },
      to_sprite(this: PixelCanvas, key: string): void {
        if (!data) throw pixelCanvasError();
        ensurePixelCanvas(this);
        ensure.string('PixelCanvas.to_sprite', key);

        const copy = new Uint8ClampedArray(data);
        resourceQueue.push({
          type: 'canvas',
          key: key,
          data: new ImageData(copy, this.bindings.width, this.bindings.height),
        });
      },
    };
  });

  function ensurePixelCanvas(canvas: PixelCanvas): void {
    ensure.number('PixelCanvas.width',  canvas.bindings.width );
    ensure.number('PixelCanvas.height', canvas.bindings.height);
  }

  function pixelCanvasError(): MewlixError {
    return new MewlixError(ErrorCode.InvalidOperation,
      'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
  }

  /* - * - * - * - * - * - * - * - *
   * Game Loop
   * - * - * - * - * - * - * - * - * */
  type GameLoop = (delta?: number) => void;

  let deltaTime: number = 0;        // Delta time, in seconds!
  let thumbnail: GameLoop | null;   // Callback function to generate a thumbnail;
  let initialized: boolean = false; // Flag indicating whether .init() has been called

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

  function removeLoadingOverlay(): void {
    document.getElementById('loading-overlay')?.remove();
  }

  async function drawPlay(): Promise<void> {
    const image = await loadImage('./core-assets/mewlix-play.png');
    context.fillStyle = 'rgb(0 0 0 / 50%)';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, 0, 0);
  }

  async function drawError(): Promise<void> {
    const image = await loadImage('./core-assets/mewlix-error.png');
    context.fillStyle = 'rgb(255 0 0 / 50%)';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, 0, 0);
    removeLoadingOverlay();
  }

  async function init(fn: GameLoop): Promise<void> {
    initialized = true;
    await loadFont('Munro', './core-assets/fonts/Munro/munro.ttf');

    function nextFrame(): Promise<number> {
      return new Promise(resolve => {
        window.requestAnimationFrame(resolve);
      });
    }

    async function run() {
      let lastFrame: number; // Last frame's timestamp, in milliseconds.

      try {
        await loadResources();
        removeLoadingOverlay();
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        thumbnail?.();
        await drawPlay();
        await awaitClick();
        flushKeyQueue(); flushClick();

        while (true) {
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          fn(deltaTime);
          flushKeyQueue(); flushClick();
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

    await run();
  }

  function resourceError(func: string, resource: string): void {
    console.warn(`[mewlix] Function ${func} cannot be called after .init().`);
    console.warn(`[mewlix] Resosurce "${resource}" will not be loaded.`);
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
   * Standard library:
   * - * - * - * - * - * - * - * - * */
  /* The std.graphic library documentation can be found on the wiki:
   * > https://github.com/kbmackenzie/mewlix/wiki/Graphic#the-stdgraphic-yarn-ball <
   *
   * It won't be included in this source file to avoid clutter.
   *
   * All standard library functions *should use snake_case*, as
   * they're going to be accessible from within Mewlix. */

  const Graphic = {
    init(fn: GameLoop): Promise<void> {
      ensure.func('graphic.init', fn);
      return init(fn);
    },

    init_(fn: GameLoop): Promise<void> {
      ensure.func('graphic.init_', fn);
      setThumbnail(fn);
      return init(fn);
    },

    delta: () => deltaTime,

    load(key: string, path: string, options?: Box<Rectangle>): void {
      if (initialized) {
        resourceError('graphic.load', path);
        return;
      }
      ensure.string('graphic.load', key);
      ensure.string('graphic.load', path);
      resourceQueue.push({
        type: 'generic',
        key: key,
        path: path, 
        options: options?.bindings,
      });
    },

    thumbnail(fn: GameLoop): void {
      ensure.func('graphic.thumbnail', fn);
      setThumbnail(fn)
    },

    spritesheet(path: string, frames: Shelf<Box<SpriteDetails>>): void {
      if (initialized) {
        resourceError('graphic.spritesheet', path);
        return;
      }
      ensure.string('graphic.spritesheet', path);
      ensure.shelf('graphic.spritesheet', frames);
      resourceQueue.push({
        type: 'spritesheet',
        path: path,
        frames: frames,
      });
    },
    
    draw(key: string, x: number = 0, y: number = 0) {
      ensure.string('graphic.draw', key);
      ensure.number('graphic.draw', x);
      ensure.number('graphic.draw', y);
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
      ensure.gettable('graphic.rect', rect);
      ensureRectangle(rect);
      return drawRect(rect, color);
    },

    paint: fillCanvas,

    write(value: MewlixValue, x: number = 0, y: number = 0, options?: Box<TextOptions>) {
      ensure.number('graphic.write', x);
      ensure.number('graphic.write', y);
      return drawText(purrify(value), x, y, options?.bindings);
    },

    measure_text(value: MewlixValue, options?: Box<TextOptions>) {
      return measureText(purrify(value), options?.bindings);
    },

    meow_options(box: Box<MeowOptions>): void {
      ensure.gettable('graphic.meow_options', box);
      meowOptions = box.bindings;
    },

    key_pressed(key: string) {
      ensure.string('graphic.key_pressed', key);
      return isKeyPressed(key);
    },

    key_down(key: string) {
      ensure.string('graphic.key_down', key);
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
      ensure.string('graphic.play_music', key);
      return playMusic(key);
    },

    play_sfx(key: string, channel: number = 0) {
      ensure.string('graphic.play_sfx', key);
      ensure.number('graphic.play_sfx', channel);
      return playSfx(key, channel);
    },

    volume(value: number) {
      ensure.number('graphic.volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.master.set(value);
    },

    music_volume(value: number) {
      ensure.number('graphic.music_volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.music.set(value);
    },

    sfx_volume(value: number) {
      ensure.number('graphic.sfx_volume', value);
      value = clamp_(value, 0, 100) / 100;
      gameVolume.sfx.set(value);
    },

    stop_music: stopMusic,

    stop_sfx(channel: number) {
      ensure.number('graphic.stop_sfx', channel);
      return stopSfx(channel);
    },

    stop_all_sfx: stopAllSfx,

    lerp(start: number, end: number, x: number): number {
      ensure.number('graphic.lerp', start);
      ensure.number('graphic.lerp', end);
      ensure.number('graphic.lerp', x);
      return lerp(start, end, x);
    },

    hex(str: string): Color {
      ensure.string('graphic.hex', str);
      return hexToColor(str);
    },

    Vector2: Vector2,
    Rectangle: Rectangle,
    GridSlot: GridSlot,
    grid_slot: positionToGridSlot,
    slot_point: gridSlotToPosition,
    Color: Color,
    PixelCanvas: PixelCanvas,

    page_background(color: string | Color): void {
      document.body.style.backgroundColor = withColor(color);
    },
  };
  mewlix.lib['std.graphic'] = createYarnBall('std.graphic', Graphic);

  /* - * - * - * - * - * - * - * - *
   * Standard library - Curry:
   * - * - * - * - * - * - * - * - * */
  const GraphicCurry = (() => {
    const graphic = Graphic;

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
  mewlix.lib['std.graphic.curry'] = mixYarnBall('std.graphic.curry', Graphic, GraphicCurry);

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

  /* - * - * - * - * - * - * - * - *
   * Prevent arrow-key scrolling:
   * - * - * - * - * - * - * - * - * */
  const preventKeys = new Set<string>([
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
}
