'use strict';

export default function() {
  const ensure = Mewlix.ensure;
  const clamp  = Mewlix.clamp;

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
      return createImageBitmap(
        blob,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
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
  async function fromSpritesheet(path: string, frames: SpriteDetails[]) {
    const sheet = await loadImage(path);
    for (const frame of frames) {
      const { key, rect } = frame;
      const sprite = await createImageBitmap(sheet, rect.x, rect.y, rect.width, rect.height);
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

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
      `Expected color value, received value of type "${typeOfValue}": ${value}`);
  }

  /* -----------------------------------
   * Drawing:
   * ----------------------------------- */
  function getSprite(key: string): ImageBitmap {
    if (!spriteMap.has(key)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
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
    context.fillRect(
      rect.x      * sizeModifier,
      rect.y      * sizeModifier,
      rect.width  * sizeModifier,
      rect.height * sizeModifier,
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

  function measureText(message: string, options: TextOptions | null = null) {
    setupText(options);
    const metrics = context.measureText(message);

    const width  = metrics.width / sizeModifier;
    const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / sizeModifier;

    return new Mewlix.Box([
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
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
        `No existing audio track is associated with the key ${key}!`);
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
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
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
    | { type: 'spritesheet'; path: string; frames: SpriteDetails[]; }

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
   * They're declared in an odd way: fields are expected to be dynamic.
   * The [wake] contructor initializes fields and binds functions by force.
   * This makes it very hard to write type signatures for them, haha. @ -@ */

  class Vector2 extends Mewlix.Clowder {
    x: number;
    y: number;

    constructor() {
      super();
      this.x = 0;
      this.y = 0;

      this[Mewlix.wake] = (function wake(this: Vector2, x: number, y: number) {
        ensure.number('Vector2.wake', x);
        ensure.number('Vector2.wake', y);
        this.x = x;
        this.y = y;
        return this;
      }).bind(this);

      this.add = (function add(this: Vector2, that: Vector2): Vector2 {
        return (new Vector2() as any)[Mewlix.wake](this.x + that.x, this.y + that.y);
      }).bind(this);

      this.mul = (function mul(this: Vector2, that: Vector2): Vector2 {
        return (new Vector2() as any)[Mewlix.wake](this.x + that.x, this.y + that.y);
      }).bind(this);

      this.distance = (function distance(this: Vector2, that: Vector2): number {
        return Math.sqrt((that.x - this.x) ** 2 + (that.y - this.y) ** 2);
      }).bind(this);

      this.dot = (function dot(this: Vector2, that: Vector2): number {
        return this.x * that.x + this.y * that.y;
      }).bind(this);

      this.clamp = (function clamp(this: Vector2, min: Vector2, max: Vector2): number {
        const x = Mewlix.clamp(this.x, min.x, max.x);
        const y = Mewlix.clamp(this.y, min.y, max.y);
        return (new Vector2() as any)[Mewlix.wake](x, y);
      }).bind(this);
    }
  }

  class Rectangle extends Mewlix.Clowder {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor() {
      super();
      this.x = 0;
      this.y = 0;
      this.width = gridSlotWidth;
      this.height = gridSlotHeight;

      this[Mewlix.wake] = (function wake(this: Rectangle, x: number, y: number, width: number, height: number) {
        [x, y, width, height].forEach(
          value => ensure.number('Rectangle.wake', value)
        );
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
      }).bind(this);

      this.contains = (function contains(this: Rectangle, point: Vector2): boolean {
        return (point.x >= this.x)
          && (point.y >= this.y)
          && (point.x < this.x + this.width)
          && (point.y < this.y + this.height);
      }).bind(this);

      this.collides = (function collides(this: Rectangle, rect: Rectangle): boolean {
        return (rect.x < this.x + this.width)
          && (rect.x + rect.width > this.x)
          && (rect.y < this.y + this.height)
          && (rect.y + rect.height > this.y)
      }).bind(this);
    }
  }

  class GridSlot extends Mewlix.Clowder {
    row: number;
    column: number;

    constructor() {
      super();
      this.row = 0;
      this.column = 0;

      this[Mewlix.wake] = (function wake(this: GridSlot, row: number, column: number) {
        this.row    = clamp(row,    0, gridRows - 1);
        this.column = clamp(column, 0, gridColumns - 1);
        return this;
      }).bind(this);

      this.position = (function position(this: GridSlot) {
        return gridSlotToPosition(this);
      }).bind(this);
    }
  }

  function positionToGridSlot(point: Vector2): GridSlot {
    const row = Math.min(point.y / gridSlotHeight);
    const col = Math.min(point.x / gridSlotWidth);
    return (new GridSlot() as any)[Mewlix.wake](row, col);
  }

  function gridSlotToPosition(slot: GridSlot): Vector2 {
    return (new Vector2() as any)[Mewlix.wake](
      slot.column * gridSlotWidth,
      slot.row * gridSlotHeight,
    );
  }

  /* Color container, wrapping a RGBA color value.
   * It accepts an opacity value too, in percentage. */
  class Color extends Mewlix.Clowder {
    red: number;
    green: number;
    blue: number;
    opacity: number;
    alpha: () => number;

    constructor() {
      super();
      this.red   = 0;
      this.green = 0;
      this.blue  = 0;
      this.opacity = 0;

      this[Mewlix.wake] = (function wake(this: Color, red: number, green: number, blue: number, opacity: number = 100) {
        [red, green, blue, opacity].forEach(
          value => ensure.number('Color.wake', value)
        );
        this.red     = clamp(red, 0, 255);
        this.green   = clamp(green, 0, 255);
        this.blue    = clamp(blue, 0, 255);
        this.opacity = clamp(opacity, 0, 100);
        return this;
      }).bind(this);

      this.alpha = (function alpha(this: Color): number { /* alpha byte value! */
        return percentageToByte(this.opacity);
      }).bind(this);

      this.to_hex = (function to_hex(this: Color): string {
        const r = this.red.toString(16);
        const g = this.green.toString(16);
        const b = this.blue.toString(16);
        return `#${r}${g}${b}`;
      }).bind(this);
    }

    [toColor](): string {
      return `rgb(${this.red} ${this.green} ${this.blue} / ${this.opacity}%)`;
    }

    static fromHex(str: string): Color {
      const hex = /^#?([a-z0-9]{3}|[a-z0-9]{6})$/i.exec(str.trim());

      if (hex === null) {
        throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
          `Couldn't parse string '${str}' as a valid hex code!`);
      }

      if (str.length === 3) {
        str = str.split('').map(x => x + x).join('');
      }

      return (new Color() as any)[Mewlix.wake](
        parseInt(str.slice(0, 1), 16),
        parseInt(str.slice(2, 3), 16),
        parseInt(str.slice(4, 5), 16),
      );
    }
  }

  /* A pixel canvas for efficiently creating sprites.
   * The .to_image() creates a new sprite and adds it to spriteMap. */
  class PixelCanvas extends Mewlix.Clowder {
    width: number;
    height: number;
    data: any;

    constructor() {
      super();
      this.width = 0;
      this.height = 0;
      this.data = null;

      this[Mewlix.wake] = (function wake(this: PixelCanvas, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
        Mewlix.opaque(this.data);
        return this;
      }).bind(this);

      /* ------------------------------
       * Methods:
       * ------------------------------ */
      this.fill = (function fill(this: PixelCanvas, color: Color) {
        if (!this.data) {
          throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
            'PixelCanvas\'s "data" field hasn\'t been properly initialized!');
        };
        for (let i = 0; i < this.data.length; i += 4) {
          this.data[i]     = color.red;
          this.data[i + 1] = color.green;
          this.data[i + 2] = color.blue;
          this.data[i + 3] = color.alpha();
        }
      }).bind(this);

      this.set_pixel = (function set_pixel(this: PixelCanvas, x: number, y: number, color: Color) {
        const index = (x * this.width + y) * 4;
        this.data[index]     = color.red;
        this.data[index + 1] = color.green;
        this.data[index + 2] = color.blue;
        this.data[index + 3] = color.alpha();
      }).bind(this);

      this.get_pixel = (function get_pixel(this: PixelCanvas, x: number, y: number) {
        const index = (x * this.width + y) * 4;
        return (new Color() as any)[Mewlix.wake](
          this.data[index],
          this.data[index + 1],
          this.data[index + 2],
          byteToPercentage(this.data[index + 3])
        );
      }).bind(this);

      this.to_sprite = (function to_image(this: PixelCanvas, key: string) {
        const copy = new Uint8ClampedArray(this.data);
        resourceQueue.push({
          type: 'canvas',
          key: key,
          data: new ImageData(copy, this.width, this.height),
        });
      }).bind(this);
    }
  }

  /* -----------------------------------
   * Game Loop
   * ----------------------------------- */
  let deltaTime: number = 0;                // Delta time, in seconds!
  let thumbnail: Function | null = null;    // Callback function to generate a thumbnail;
  let initialized: boolean = false;         // Flag indicating whether .init() has been called

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
  }

  async function init(callback: Function) {
    ensure.func('graphic.init', callback);
    initialized = true;
    await loadResources();
    await loadFont('Munro', './core-assets/fonts/Munro/munro.ttf');

    function nextFrame(): Promise<number> {
      return new Promise(resolve => {
        window.requestAnimationFrame(resolve);
      });
    }

    async function run() {
      let lastFrame: number; // Last frame's timestamp, in milliseconds.

      removeLoadingOverlay();
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      await thumbnail?.();
      await drawPlay();
      await awaitClick();
      flushKeyQueue(); flushClick();

      try {
        while (true) {
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          await callback();
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

  function resourceWarning(func: string, resource: string): void {
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

  Mewlix.meow = (message: string) => {
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

  const Graphic = {
    init: init,
    delta: () => deltaTime,

    load: (key: string, path: string, options?: Rectangle): void => {
      if (initialized) {
        resourceWarning('graphic.load', path);
        return;
      }
      ensure.string('graphic.load', key);
      ensure.string('graphic.load', path);
      resourceQueue.push({
        type: 'generic',
        key: key,
        path: path, 
        options: options,
      });
    },

    thumbnail: (func: Function): void => {
      if (initialized) {
        console.warn('[mewlix] Cannot set thumbnail after .init()!');
        return;
      }
      ensure.func('graphic.thumbnail', func);
      thumbnail = func;
    },

    spritesheet: (path: string, frames: any): void => {
      if (!initialized) {
        resourceWarning('graphic.spritesheet', path);
        return;
      }
      ensure.string('graphic.spritesheet', path);
      ensure.shelf('graphic.spritesheet', frames);
      resourceQueue.push({
        type: 'spritesheet',
        path: path,
        frames: frames.toArray(),
      });
    },
    
    draw: (key: string, x: number = 0, y: number = 0) => {
      ensure.string('graphic.draw', key);
      ensure.number('graphic.draw', x);
      ensure.number('graphic.draw', y);
      return drawSprite(key, x, y);
    },

    measure: (key: string) => {
      const image = getSprite(key);
      return new Mewlix.Box([
        ["width"  , image.width ],
        ["height" , image.height]
      ]);
    },

    rect: (rect: Rectangle, color: string | Color): void => {
      ensure.box('graphic.rect', rect);
      return drawRect(rect, color);
    },

    paint: fillCanvas,

    write: (value: any, x: number = 0, y: number = 0, options?: TextOptions) => {
      ensure.number('graphic.write', x);
      ensure.number('graphic.write', y);
      return drawText(Mewlix.purrify(value), x, y, options);
    },

    measure_text: (value: any, options?: TextOptions) => {
      return measureText(Mewlix.purrify(value), options);
    },

    meow_options: (box: MeowOptions): void => {
      ensure.box('graphic.meow_options', box);
      meowOptions = box;
    },

    key_pressed: (key: string) => {
      ensure.string('graphic.key_pressed', key);
      return isKeyPressed(key);
    },

    key_down: (key: string) => {
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

    mouse_position: () => (new Vector2() as any)[Mewlix.wake](mouseX, mouseY),

    play_music: (key: string) => {
      ensure.string('graphic.play_music', key);
      return playMusic(key);
    },

    play_sfx: (key: string, channel: number = 0) => {
      ensure.string('graphic.play_sfx', key);
      ensure.number('graphic.play_sfx', channel);
      return playSfx(key, channel);
    },

    volume: (value: number) => {
      ensure.number('graphic.volume', value);
      value = clamp(value, 0, 100) / 100;
      gameVolume.master.set(value);
    },

    music_volume: (value: number) => {
      ensure.number('graphic.music_volume', value);
      value = clamp(value, 0, 100) / 100;
      gameVolume.music.set(value);
    },

    sfx_volume: (value: number) => {
      ensure.number('graphic.sfx_volume', value);
      value = clamp(value, 0, 100) / 100;
      gameVolume.sfx.set(value);
    },

    stop_music: stopMusic,

    stop_sfx: (channel: number) => {
      ensure.number('graphic.stop_sfx', channel);
      return stopSfx(channel);
    },

    stop_all_sfx: stopAllSfx,

    lerp: (start: number, end: number, x: number): number => {
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
  const GraphicLibrary = Mewlix.library('std.graphic', Graphic);

  /* Freezing the std.graphic library, as it's going to be accessible inside Mewlix. */
  Object.freeze(GraphicLibrary);

  /* -----------------------------------
   * Standard library - Curry:
   * ----------------------------------- */
  const GraphicCurry = (() => {
    const graphic = Graphic;

    return {
      load: (key: string) =>
        (path: string) =>
          (options?: Rectangle) =>
            graphic.load(key, path, options),

      spritesheet: (path: string) =>
        (frames: any) =>
          graphic.spritesheet(path, frames),

      draw: (key: string) =>
        (x: number) =>
          (y: number) =>
            graphic.draw(key, x, y),

      rect: (rect: Rectangle) =>
        (color: string | Color) =>
          graphic.rect(rect, color),

      write: (value: any) =>
        (x: number) =>
          (y: number) =>
            (options: TextOptions) =>
              graphic.write(value, x, y, options),

      measure_text: (value: any) =>
        (options: TextOptions) =>
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
  const GraphicCurryLibrary = Mewlix.curryLibrary('std.graphic.curry', GraphicLibrary, GraphicCurry);

  /* Freezing the curry library, as it's going to be accessible inside Mewlix. */
  Object.freeze(GraphicCurryLibrary);

  /* -----------------------------------
   * Run Console:
   * ----------------------------------- */
  Mewlix.run = func => {
    try {
      const value = func();
      return value;
    }
    catch (error) {
      drawError();
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

  /* -----------------------------------
   * Return Graphic Namespace
   * ----------------------------------- */
  return [GraphicLibrary, GraphicCurryLibrary];
}
