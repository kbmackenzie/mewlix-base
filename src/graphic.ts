'use strict';

import {
  Mewlix,
  Shelf,
  Clowder,
  YarnBall,
  ErrorCode,
  MewlixError,
  MewlixValue,
  Box,
  GenericBox,
  BoxLike,
  reflection,
  opaque,
  wake,
  ensure,
  clamp_,
  purrify,
} from './mewlix.js';

export default function(mewlix: Mewlix): void {
  /* Convert percentage value (0% - 100%) to byte (0 - 255) */
  function percentageToByte(p: number) {
    return Math.floor((255 * p) / 100);
  }

  /* Convert byte (0 - 255) to percentage value (0% - 100%) */
  function byteToPercentage(b: number) {
    return Math.floor((100 * b) / 255);
  }

  /* -----------------------------------
   * Initializing Canvas:
   * ----------------------------------- */
  const canvas  = document.getElementById('game-canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;

  const canvasWidth  = canvas.width;
  const canvasHeight = canvas.height;

  const virtualWidth  = 128;
  const virtualHeight = 128;

  const sizeModifier = Math.floor(canvas.width / virtualWidth);

  const spriteMap = new Map<string, ImageBitmap>();
  const audioMap  = new Map<string, AudioBuffer>();

  const gridSlotWidth  = 16;
  const gridSlotHeight = 16;
  const gridColumns = Math.floor(virtualWidth  / gridSlotWidth );
  const gridRows    = Math.floor(virtualHeight / gridSlotHeight);

  /* -----------------------------------
   * Loading Images:
   * ----------------------------------- */
  /* Load an image file as ImageBitmap. */
  const loadImage = (path: string, rect?: Rectangle) => fetch(path)
    .then(response => response.blob())
    .then(blob => {
      if (!rect) return createImageBitmap(blob);
      const { x, y, width, height } = rect.box();
      return createImageBitmap(blob, x, y, width, height);
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
  async function fromSpritesheet(path: string, frames: Shelf<BoxLike<SpriteDetails>>) {
    const sheet = await loadImage(path);
    for (const frame of frames) {
      const { key, rect } = frame.box();
      const { x, y, width, height } = rect.box();
      const sprite = await createImageBitmap(sheet, x, y, width, height);
      spriteMap.set(key, sprite);
    }
  }

  /* -----------------------------------
   * Colors:
   * ----------------------------------- */
  const toColor: unique symbol = Symbol('toColor');

  function withColor(value: string | Color): string {
    if (typeof value === 'string') return value;    
    if (typeof value === 'object' && toColor in value) {
      return value[toColor]();
    }

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.Graphic,
      `Expected color value, received value of type "${typeOfValue}": ${value}`);
  }

  /* -----------------------------------
   * Drawing:
   * ----------------------------------- */
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
    const { x, y, width, height } = rect.box();
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

  /* -----------------------------------
   * Loading Fonts:
   * ----------------------------------- */
  const loadFont = (name: string, url: string): Promise<void> => new FontFace(name, `url(${url})`)
    .load()
    .then(font => {
      document.fonts.add(font);
    });

  /* -----------------------------------
   * Drawing Fonts:
   * ----------------------------------- */
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

  function measureText(message: string, options: TextOptions | null = null): Box<number> {
    setupText(options);
    const metrics = context.measureText(message);

    const width  = metrics.width / sizeModifier;
    const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / sizeModifier;

    return new Box<number>([
      ["width"  , Math.round(width)  ],
      ["height" , Math.round(height) ],
    ]);
  }

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

  /* -----------------------------------
   * Playing Music:
   * ----------------------------------- */
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

  /* -----------------------------------
   * Playing Music:
   * ----------------------------------- */
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

  /* -----------------------------------
   * Volume Control:
   * ----------------------------------- */
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

  /* -----------------------------------
   * Sound Button:
   * ----------------------------------- */
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

  /* -----------------------------------
   * Resource Queue:
   * ----------------------------------- */

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
    | { type: 'spritesheet'; path: string; frames: Shelf<BoxLike<SpriteDetails>>; }

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

  /* -----------------------------------
   * Keyboard Events
   * ----------------------------------- */
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

  /* -----------------------------------
   * Mouse Events:
   * ----------------------------------- */
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

  /* -----------------------------------
   * Utility Functions:
   * ----------------------------------- */
  function lerp(start: number, end: number, x: number): number {
    return start + (end - start) * x;
  }

  /* -----------------------------------
   * Core Utility:
   * ----------------------------------- */

  /* *** Clowders are VERY HARD to add typings to because they're WEIRD! ***
   *
   * They will be declared in a very unusual way to get the best of both worlds:
   * - The type of _box should be: <specific-type> & GenericBox
   *
   * The struggles of writing the base library for dynamic language in statically typed one.*/

  interface Vector2Like {
    x: number;
    y: number;
  };

  class Vector2 extends Clowder<MewlixValue> {
    [wake]: (x: number, y: number) => Vector2;
    _box: Vector2Like & GenericBox;

    box() {
      return this._box;
    }

    constructor() {
      super();
      this._box = { x: 0, y: 0 };

      this[wake] = (x: number, y: number) => {
        ensure.number('Vector2.wake', x);
        ensure.number('Vector2.wake', y);
        this.box().x = x;
        this.box().y = y;
        return this;
      };

      this.box().add = (that: Vector2) => {
        const { x: ax, y: ay } = this.box();
        const { x: bx, y: by } = that.box();
        [ax, ay, bx, by].forEach(value => {
          ensure.number('Vector2.add', value);
        });
        return new Vector2()[wake](ax + bx, ay + by);
      };

      this.box().mul = (that: Vector2) => {
        const { x: ax, y: ay } = this.box();
        const { x: bx, y: by } = that.box();
        [ax, ay, bx, by].forEach(value => {
          ensure.number('Vector2.mul', value);
        });
        return new Vector2()[wake](ax * bx, ay * by);
      };

      this.box().distance = (that: Vector2) => {
        const { x: ax, y: ay } = this.box();
        const { x: bx, y: by } = that.box();
        [ax, ay, bx, by].forEach(value => {
          ensure.number('Vector2.distance', value);
        });
        return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
      };

      this.box().dot = (that: Vector2) => {
        const { x: ax, y: ay } = this.box();
        const { x: bx, y: by } = that.box();
        [ax, ay, bx, by].forEach(value => {
          ensure.number('Vector2.dot', value);
        });
        return ax * bx + ay * by;
      };

      this.box().clamp = (min: Vector2, max: Vector2) => {
        const { x, y } = this.box();
        const { x: minX, y: minY } = min.box();
        const { x: maxX, y: maxY } = max.box();
        [x, y, minX, minY, maxX, maxY].forEach(value => {
          ensure.number('Vector2.clamp', value);
        });
      };
    }
  }

  interface RectangleLike {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  class Rectangle extends Clowder<MewlixValue> {
    [wake]: (x: number, y: number, width: number, height: number) => Rectangle;
    _box: RectangleLike & GenericBox;

    box() {
      return this._box;
    }

    constructor() {
      super();
      this._box = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };

      this[wake] = (x: number, y: number, width: number, height: number) => {
        [x, y, width, height].forEach(value => {
          ensure.number('Rectangle.wake', value)
        });
        this.box().x = x;
        this.box().y = y;
        this.box().width = width;
        this.box().height = height;
        return this;
      };

      this.box().contains = (point: Vector2) => {
        const { x: rx, y: ry, width: rw, height: rh } = this.box();
        const { x: px, y: py } = point.box();
        [rx, ry, rw, rh, px, py].forEach(value => {
          ensure.number('Rectangle.contains', value);
        });
        return (px >= rx) && (py >= ry) && (px < rx + rw) && (py < ry + rh);
      };

      this.box().collides = (that: Rectangle) => {
        const { x: ax, y: ay, width: aw, height: ah} = this.box();
        const { x: bx, y: by, width: bw, height: bh } = that.box();
        [ax, ay, aw, ah, bx, by, bw, bh].forEach(value => {
          ensure.number('Rectangle.collides', value);
        });
        return (bx < ax + aw)
          && (bx + bw > ax)
          && (by < ay + ah)
          && (by + bh > ay);
      };
    }
  }

  interface GridSlotLike {
    row: number;
    column: number;
  };

  class GridSlot extends Clowder<MewlixValue> {
    [wake]: (row: number, column: number) => GridSlot;
    _box: GridSlotLike & GenericBox;

    box() {
      return this._box;
    }

    constructor() {
      super();
      this._box = { row: 0, column: 0 };

      this[wake] = (row: number, column: number) => {
        ensure.number('GridSlot.wake', row);
        ensure.number('GridSlot.wake', column);

        this.box().row    = clamp_(row,    0, gridRows - 1);
        this.box().column = clamp_(column, 0, gridColumns - 1);
        return this;
      };

      this.box().position = () => {
        ensure.number('GridSlot.position', this.box().x);
        ensure.number('GridSlot.position', this.box().y);

        gridSlotToPosition(this);
      };
    }
  }

  function positionToGridSlot(point: Vector2): GridSlot {
    const { x: px, y: py } = point.box();

    const row = Math.min(py / gridSlotHeight);
    const col = Math.min(px / gridSlotWidth);
    return new GridSlot()[wake](row, col);
  }

  function gridSlotToPosition(slot: GridSlot): Vector2 {
    const { row, column } = slot.box();

    return new Vector2()[wake](
      column * gridSlotWidth,
      row * gridSlotHeight,
    );
  }

  /* Color container, wrapping a RGBA color value.
   * It accepts an opacity value too, in percentage. */
  interface ColorLike {
    red: number;
    green: number;
    blue: number;
    opacity: number;
    alpha(): number;
  };

  class Color extends Clowder<MewlixValue> {
    [wake]: (red: number, green: number, blue: number, opacity?: number) => Color;
    _box: ColorLike & GenericBox;

    box() {
      return this._box;
    }

    constructor() {
      super();
      this._box = {
        red: 0,
        green: 0,
        blue: 0,
        opacity: 0,
        alpha() { return 0; },
      };

      this[wake] = (red: number, green: number, blue: number, opacity: number = 100) => {
        [red, green, blue, opacity].forEach(
          value => ensure.number('Color.wake', value)
        );
        this.box().red     = clamp_(red, 0, 255);
        this.box().green   = clamp_(green, 0, 255);
        this.box().blue    = clamp_(blue, 0, 255);
        this.box().opacity = clamp_(opacity, 0, 100);
        return this;
      };

      this.box().alpha = () => {
        ensure.number('Color.alpha', this.box().opacity);
        return percentageToByte(this.box().opacity);
      };

      this.box().to_hex = () => {
        const { red, green, blue } = this.box();
        [red, green, blue].forEach(value => {
          ensure.number('Color.to_hex', value);
        });

        const r = red.toString(16);
        const g = green.toString(16);
        const b = blue.toString(16);
        return `#${r}${g}${b}`;
      };
    }

    [toColor](): string {
      const { red, green, blue, opacity } = this.box();
      return `rgb(${red} ${green} ${blue} / ${opacity}%)`;
    }

    static fromHex(str: string): Color {
      const hex = /^#?([a-z0-9]{3}|[a-z0-9]{6})$/i.exec(str.trim());

      if (hex === null) {
        throw new MewlixError(ErrorCode.Graphic,
          `Couldn't parse string '${str}' as a valid hex code!`);
      }

      if (str.length === 3) {
        str = str.split('').map(x => x + x).join('');
      }

      return new Color()[wake](
        parseInt(str.slice(0, 1), 16),
        parseInt(str.slice(2, 3), 16),
        parseInt(str.slice(4, 5), 16),
      );
    }
  }

  /* A pixel canvas for efficiently creating sprites.
   * The .to_image() creates a new sprite and adds it to spriteMap. */
  class PixelCanvas extends Clowder<MewlixValue> {
    [wake]: (width: number, height: number) => PixelCanvas;
    width: number;
    height: number;
    data: Uint8ClampedArray | null;

    constructor() {
      super();
      this.width = 0;
      this.height = 0;
      this.data = null;

      this[wake] = (width: number, height: number) => {
        ensure.number('PixelCanvas.wake', width);
        ensure.number('PixelCanvas.wake', height);

        this.width  = width;
        this.height = height;
        this.data   = new Uint8ClampedArray(width * height * 4);
        opaque(this.data!);
        return this;
      };

      this.box().fill = (color: Color) => {
        if (!this.data) {
          throw new MewlixError(ErrorCode.InvalidOperation,
            'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
        };

        const { red, green, blue } = color.box();
        const alpha = color.box().alpha();

        for (let i = 0; i < this.data.length; i += 4) {
          this.data[i]     = red;
          this.data[i + 1] = green;
          this.data[i + 2] = blue;
          this.data[i + 3] = alpha;
        }
      };

      this.box().set_pixel = (x: number, y: number, color: Color) => {
        if (!this.data) {
          throw new MewlixError(ErrorCode.InvalidOperation,
            'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
        };

        const { red, green, blue } = color.box();
        const alpha = color.box().alpha();

        const index = (x * this.width + y) * 4;
        this.data[index]     = red;
        this.data[index + 1] = green;
        this.data[index + 2] = blue;
        this.data[index + 3] = alpha;
      };

      this.box().get_pixel = (x: number, y: number) => {
        ensure.number('PixelCanvas.get_pixel', x);
        ensure.number('PixelCanvas.get_pixel', y);

        if (!this.data) {
          throw new MewlixError(ErrorCode.InvalidOperation,
            'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
        };

        const index = (x * this.width + y) * 4;
        return new Color()[wake](
          this.data[index],
          this.data[index + 1],
          this.data[index + 2],
          byteToPercentage(this.data[index + 3])
        );
      };

      this.box().to_sprite = (key: string) => {
        ensure.string('PixelCanvas.to_sprite', key);

        if (!this.data) {
          throw new MewlixError(ErrorCode.InvalidOperation,
            'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
        };

        const copy = new Uint8ClampedArray(this.data);
        resourceQueue.push({
          type: 'canvas',
          key: key,
          data: new ImageData(copy, this.width, this.height),
        });
      };
    }
  }

  /* -----------------------------------
   * Game Loop
   * ----------------------------------- */
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

  /* -----------------------------------
   * Meow Expression
   * ----------------------------------- */
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

    load(key: string, path: string, options?: BoxLike<Rectangle>): void {
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
        options: options?.box(),
      });
    },

    thumbnail(fn: GameLoop): void {
      ensure.func('graphic.thumbnail', fn);
      setThumbnail(fn)
    },

    spritesheet(path: string, frames: Shelf<BoxLike<SpriteDetails>>): void {
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
      return new Box<number>([
        ["width"  , image.width ],
        ["height" , image.height]
      ]);
    },

    rect(rect: Rectangle, color: string | Color): void {
      ensure.box('graphic.rect', rect);
      return drawRect(rect, color);
    },

    paint: fillCanvas,

    write(value: MewlixValue, x: number = 0, y: number = 0, options?: BoxLike<TextOptions>) {
      ensure.number('graphic.write', x);
      ensure.number('graphic.write', y);
      return drawText(purrify(value), x, y, options?.box());
    },

    measure_text(value: MewlixValue, options?: BoxLike<TextOptions>) {
      return measureText(purrify(value), options?.box());
    },

    meow_options(box: BoxLike<MeowOptions>): void {
      ensure.box('graphic.meow_options', box);
      meowOptions = box.box();
    },

    key_pressed(key: string) {
      ensure.string('graphic.key_pressed', key);
      return isKeyPressed(key);
    },

    key_down(key: string) {
      ensure.string('graphic.key_down', key);
      return isKeyDown(key);
    },

    keys: new Box<string>([
      ["space"  , " "         ],
      ["enter"  , "Enter"     ],
      ["left"   , "ArrowLeft" ],
      ["right"  , "ArrowRight"],
      ["up"     , "ArrowUp"   ],
      ["down"   , "ArrowDown" ],
    ]),

    mouse_click: isMousePressed,

    mouse_down: isMouseDown,

    mouse_position: () => new Vector2()[wake](mouseX, mouseY),

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

    Vector2: Vector2,

    Rectangle: Rectangle,
    
    GridSlot: GridSlot,

    grid_slot: positionToGridSlot,

    slot_point: gridSlotToPosition,

    Color: Color,

    hex: Color.fromHex,

    PixelCanvas: PixelCanvas,
  };
  const GraphicYarnBall = new YarnBall('std.graphic', Graphic);
  mewlix.Graphic = GraphicYarnBall;

  /* -----------------------------------
   * Standard library - Curry:
   * ----------------------------------- */
  const GraphicCurry = (() => {
    const graphic = Graphic;

    return {
      load: (key: string) =>
        (path: string) =>
          (options?: BoxLike<Rectangle>) =>
            graphic.load(key, path, options),

      spritesheet: (path: string) =>
        (frames: Shelf<BoxLike<SpriteDetails>>) =>
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
            (options: BoxLike<TextOptions>) =>
              graphic.write(value, x, y, options),

      measure_text: (value: MewlixValue) =>
        (options: BoxLike<TextOptions>) =>
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

  const GraphicCurryYarnBall = YarnBall.mix('std.graphic.curry', GraphicYarnBall, GraphicCurry);
  mewlix.GraphicCurry = GraphicCurryYarnBall;

  /* -----------------------------------
   * Run Console:
   * ----------------------------------- */
  mewlix.run = async (func) => {
    try {
      return func();
    }
    catch (error) {
      await drawError();
      throw error;
    }
  };

  /* -----------------------------------
   * Prevent arrow-key scrolling:
   * ----------------------------------- */
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
