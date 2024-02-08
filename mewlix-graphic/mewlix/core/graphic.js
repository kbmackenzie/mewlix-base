const MewlixGraphic = {};

MewlixGraphic.Color = class Color {
  constructor(r, g, b) {
    this.red = r || 0;
    this.green = g || 0;
    this.blue = b || 0;
  }

  toString() {
    const toHex = decimal => decimal.toString(16);
    return `#${toHex(this.red)}${toHex(this.green)}${toHex(this.blue)}`;
  }

  static fromHex(code) {
    /* The compiler will take care of passing a valid string to this.
     * No more validation is really needed. */
    if (typeof code !== 'string' || code.length < 6) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.Graphic,
        `Expected a valid 6-character hex string. Received ${code}.`);
    }
    const decode = hex => parseInt(hex, 16);
    return new Color(
      decode(code.slice(0, 1)),
      decode(code.slice(2, 3)),
      decode(code.slice(4, 5)),
    );
  }
}

MewlixGraphic.canvasInfo = {
  width: 1920,
  height: 1080,
  background: new MewlixGraphic.Color(),
};

/* Add to global context: */
Mewlix.Graphic = MewlixGraphic;
