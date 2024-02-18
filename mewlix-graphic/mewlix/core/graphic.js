const MewlixGraphic = {};

MewlixGraphic.Vector2 = class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return `Vector2(${this.x}, ${this.y})`
  }

  static add(a, b) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static mul(a, b) {
    return new Vector2(a.x * b.x, a.y * b.y);
  }
}


// ---------------------------------------------------------
// Canvas:
// ---------------------------------------------------------
const tileSize = 16;
const canvasRows = 16;
const canvasColumns = 16;

MewlixGraphic.TileCanvas = class TileCanvas {
  constructor(rows, columns) {
    this.rows = rows;
    this.columns = columns;
    this.matrix = Array(rows * columns);
  }

  setTile(row, col, tile) {
    if (!this.isValidSlot(row, col)) return;
    this.matrix[row][col] = tile;
  }

  isValidSlot(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }
}

MewlixGraphic.Tile = class Tile {
  constructor(image) {
  }
}

MewlixGraphic.canvasInfo = {
  background: new MewlixGraphic.Color(),
};

// ----------------------------------------------------------------------------------------

/* Commenting out for debugging:
const canvasElement = document.getElementById('mewlix-canvas');
const drawingContext = canvasElement.getContext('2d');

const draw = () => undefined;

// Add event listeners:
window.addEventListener('load', draw)

// Add to global context:
Mewlix.Graphic = MewlixGraphic; */

globalThis.PixelCanvas = PixelCanvas;
