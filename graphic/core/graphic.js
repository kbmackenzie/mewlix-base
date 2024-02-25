'use strict';
const ensure = Mewlix.ensure;

/* .toColor() : interface
 * Any object that implements a .toColor() method can be considered a valid color representation. */

class Color extends Mewlix.MewlixClowder {
  constructor(red, green, blue) {
    super();
    ensure.all.number(red, green, blue);
    this.red = red;
    this.green = green;
    this.blue = blue;
  }

  toColor() {
    return this;
  }

  toString() {
    return `rgb(${this.red} ${this.green} ${this.blue})`;
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

  fill({ red, green, blue }) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i]     = red;
      this.data[i + 1] = green;
      this.data[i + 2] = blue;
      this.data[i + 3] = 1;
    }
  }

  setPixel(x, y, { red, green, blue }) {
    const index = (x * this.width + y) * 4;
    this.data[index]     = red;
    this.data[index + 1] = green;
    this.data[index + 2] = blue;
    this.data[index + 3] = 1;
  }

  setData(x, y, { data }) {
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
