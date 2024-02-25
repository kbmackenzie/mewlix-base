'use strict';
const ensure = Mewlix.ensure;
const clamp  = Mewlix.clamp;

/* Convert percentage value (0% - 100%) to byte (0 - 255) */
const percentToByte = p => Math.floor((255 * p) / 100);

/* Color contained, wrapping a RGBA color value.
 *
 * It also implements .toColor(), complying with the 'ToColor' interface concept:
 * Any object that implements a .toColor() method can be considered a valid color representation. */

class Color extends Mewlix.MewlixClowder {
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
    return `rgb(${this.red} ${this.green} ${this.blue} / ${this.opacity}%)`;
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

/* A pixel canvas for efficiently creating sprites and tiles.
 *
 * The .toImage() creates a new ImageData object from the pixel data.
 * The generated ImageData object can be used with the HTML5 Canvas .drawImage() method! */
class PixelCanvas extends Mewlix.MewlixClowder {
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

  toImage() {
    return new ImageData(this.data, this.width, this.height);
  }
};



/* -----------------------------------
 * Canvas:
 * ----------------------------------- */
const canvas = document.getElementById('drawing-canvas');
const drawingCtx = canvas.getContext('2d');

const imageCanvas = document.createElement('canvas');
const imageCtx = imageCanvas.getContext('2d');

const tileMap = Map();
const soundMap = Map();

/* -----------------------------------
 * Loading:
 * ----------------------------------- */
const tileWidth  = 8;
const tileHeight = 8;

const loadImage = (path, width, height) => {
  return new Promise((resolve, reject) => {
    const img = new Image(width, height);
    img.src = path;
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
  });
}

const loadTile = async path => {
  return await loadImage(path, tileWidth, tileHeight);
};

/* -----------------------------------
 * Making:
 * ----------------------------------- */
const makeSprite = transforms => {
};

/* -----------------------------------
 * Drawing:
 * ----------------------------------- */
