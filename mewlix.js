'use strict';

const Mewlix = {};

/* -----------------------------------------------------
 * MewlixError -> Custom error type.
 * ----------------------------------------------------- */
Mewlix.ErrorCode = class ErrorCode {
  static TypeMismatch   = new ErrorCode('TypeMismatch'  , 1);
  static DivideByZero   = new ErrorCode('DivideByZero'  , 2);
  static BadConversion  = new ErrorCode('BadConversion' , 3);
  static CatOnComputer  = new ErrorCode('CatOnComputer' , 4);
  static Console        = new ErrorCode('Console'       , 5);
  static Graphic        = new ErrorCode('Graphic'       , 6);
  static InvalidImport  = new ErrorCode('InvalidImport' , 7);
  static CriticalError  = new ErrorCode('CriticalError' , 8);
  static ExternalError  = new ErrorCode('ExternalError' , 9);

  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  valueOf() {
    return this.id;
  }

  isEqual(x) {
    return x.valueOf() === this.valueOf();
  }

  makeMessage(str) {
    return `[${this.name}] ${str}`
  }
};

Mewlix.MewlixError = class MewlixError extends Error {
  constructor(errorCode, message) {
    super(errorCode.makeMessage(message));
    this.name = this.constructor.name;
    this.code = errorCode;
  }
}

/* -----------------------------------------------------
 * MewlixObject -> Base object class.
 * ----------------------------------------------------- */
Mewlix.MewlixObject = class MewlixObject {
  valueOf() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
  }
};

/* -----------------------------------------------------
 * Mewlix.Namespace -> Container for modules.
 * ----------------------------------------------------- */
Mewlix.Namespace = class Namespace extends Mewlix.MewlixObject {
  constructor(name) {
    super();
    this.name = name;
    this.modules = new Map();
    this.cache = new Map();
  }

  setName(name) {
    this.name = name;
  }

  addModule(key, func) {
    if (this.modules.has(key)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidImport,
        `Duplicate key: A module with the key "path" has already been imported!`);
    }
    this.modules.set(key, func);
  }

  async getModule(key) {
    if (!this.modules.has(key)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidImport,
        `The module "${key}" doesn't exist or hasn't been properly loaded!`);
    }

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const yarnball = await this.modules.get(key)();
    this.cache.set(key, yarnball);
    return yarnball;
  }
};

/* -----------------------------------------------------
 * Mewlix.Modules -> Default module container.
 * ----------------------------------------------------- */
Mewlix.Modules = new Mewlix.Namespace('default');

/* -----------------------------------------------------
 * Shelf -> Stack-like persistent data structure.
 * ----------------------------------------------------- */
Mewlix.Shelf = class Shelf extends Mewlix.MewlixObject {
  constructor() {
    super();
    Object.defineProperty(this, 'box', {
      value: () => {
        throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
          "Can't peek properties of a shelf!");
      },
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  toArray() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
      "Shelf error: 'toArray()' method not implemented!");
  }

  toString() {
    return Mewlix.purrifyArray(this.toArray());
  }

  *[Symbol.iterator]() {
    let node = this;
    while (node instanceof Mewlix.ShelfNode) {
      yield node.peek();
      node = node.pop();
    }
  }

  static isEqual(a, b) {
    if (a instanceof Mewlix.ShelfBottom) return b instanceof Mewlix.ShelfBottom;
    if (b instanceof Mewlix.ShelfBottom) return a instanceof Mewlix.ShelfBottom;

    return Mewlix.Compare.isEqual(a.peek(), b.peek()) && Shelf.isEqual(a.pop(), b.pop());
  }

  static concat(a, b) {
    if (a instanceof Mewlix.ShelfBottom) return b;
    if (b instanceof Mewlix.ShelfBottom) return a;

    const bucket = b.toArray();
    let output = a;

    for (const item of bucket) {
      output = output.push(item);
    }
    return output;
  }

  static reverse(a) {
    let b = new Mewlix.ShelfBottom();
    for (const value of a) {
      b = b.push(value);
    }
    return b;
  }

  static fromArray(arr) {
    return arr.reduce(
      (tail, value) => new Mewlix.ShelfNode(value, tail),
      new Mewlix.ShelfBottom()
    );
  }
}

Mewlix.ShelfBottom = class ShelfBottom extends Mewlix.Shelf {
  constructor() {
    super();
    Object.freeze(this);
  }

  peek() {
    return null;
  }

  pop() {
    return this;
  }

  push(value) {
    return new Mewlix.ShelfNode(value, this);
  }

  length() {
    return 0;
  }

  toArray() {
    return [];
  }
}

Mewlix.ShelfNode = class ShelfNode extends Mewlix.Shelf {
  constructor(value, tail) {
    super();
    this.value = value;
    this.next  = tail || new Mewlix.ShelfBottom();
    Object.freeze(this);
  }

  peek() {
    return this.value;
  }

  pop() {
    return this.next;
  }

  push(value) {
    return new ShelfNode(value, this);
  }

  length() {
    return 1 + this.next.length();
  }

  toArray() {
    const arr = this.next.toArray();
    arr.push(this.value);
    return arr;
  }
}

/* -----------------------------------------------------
 * Box -> A core part of a cat-oriented language.
 * ----------------------------------------------------- */
Mewlix.Box = class Box extends Mewlix.MewlixObject {
  constructor(entries = []) {
    super();

    Object.defineProperty(this, 'box', {
      value: () => this,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    for (const [key, value] of entries) {
      this[key] = value;
    }
  }

  toString() {
    return Mewlix.purrifyObject(this);
  }
};

/* -----------------------------------------------------
 * Mewlix.Clowder -> Base for all clowders.
 * ----------------------------------------------------- */
/* All clowders should inherit from this class.
 * It provides a default definition for .wake(), too! */
Mewlix.Clowder = class Clowder extends Mewlix.Box {
  constructor() {
    super();

    this.wake = (function wake() {
      return this;
    }).bind(this);

    this.to_string = (function to_string() {
      return Mewlix.purrifyObject(this);
    }).bind(this);
  }

  toString() {
    return this.to_string();
  }
}

/* -----------------------------------------------------
 * Mewlix.YarnBall  -> Yarn ball export list.
 * ----------------------------------------------------- */
Mewlix.YarnBall = class YarnBall extends Mewlix.MewlixObject {
  constructor(moduleKey, exportList = []) {
    super();
    this.key = moduleKey;

    for (const [field, func] of exportList) {
      Object.defineProperty(this, field, {
        get: func,
        set() {
          throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
            `Cannot set field '${field}': Yarn ball fields are read-only!`);
        }
      });
    }

    Object.defineProperty(this, 'box', {
      value: () => this,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  toString() {
    return `<yarn ball '${this.key}'>`
  }
}

/* -----------------------------------------------------
 * Generate standard yarn ball.
 * ----------------------------------------------------- */
Mewlix.library = function(key, object = {}) {
  const yarn = new Mewlix.YarnBall(key);
  for (const key in object) {
    yarn[key] = object[key];
  }
  return yarn;
}

/* -----------------------------------------------------
 * String utils.
 * ----------------------------------------------------- */
Mewlix.purrifyArray = function purrifyArray(arr) {
  const items = arr.map(Mewlix.purrify).join(', ');
  return `[${items}]`;
};

Mewlix.purrifyObject = function purrifyObject(obj) {
  const entries = Object.entries(obj).map(
    ([key, value]) => `${key}: ${Mewlix.purrify(value)}`
  ).join(', ');
  return `=^-x-^= [ ${entries} ]`;
}

Mewlix.purrify = function purrify(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) {
    return 'nothing';
  }
  switch (typeof value) {
    case 'function': return '<function>';
    default: return value.toString();
  }
};

/* -----------------------------------------------------
 * Type utils.
 * ----------------------------------------------------- */
const ensure = {
  number: x => {
    if (typeof x === 'number') return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected number, got ${typeOfValue}: ${x}!`);
  },
  string: x => {
    if (typeof x === 'string') return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected string, got ${typeOfValue}: ${x}!`);
  },
  boolean: x => {
    if (typeof x === 'boolean') return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected boolean, got ${typeOfValue}: ${x}!`);
  },
  shelf: x => {
    if (x instanceof Mewlix.Shelf) return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected shelf, got ${typeOfValue}: ${x}!`);
  },
  box: x => {
    if (x instanceof Mewlix.Box) return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected box, got ${typeOfValue}: ${x}!`);
  },
  func: x => {
    if (typeof x === 'function') return;
    const typeOfValue = Mewlix.Reflection.typeOf(x);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected function, got ${typeOfValue}: ${x}!`);
  },

  all: {
    number:  (...values) => values.forEach(ensure.number),
    string:  (...values) => values.forEach(ensure.string),
    boolean: (...values) => values.forEach(ensure.boolean),
    shelf:   (...values) => values.forEach(ensure.shelf),
    box:     (...values) => values.forEach(ensure.box),
    func:    (...values) => values.forEach(ensure.func),
  },
};

const isNothing = function isNothing(x) {
  return x === null || x === undefined;
};

const clamp = function clamp(x, min, max) {
  ensure.all.number(x, min, max);
  return x < min ? min : (x > max ? max : x);
};

const opaque = function opaque(x) {
  Object.defineProperty(x, 'box', {
    value: () => {
      const typeOfValue = Mewlix.Reflection.typeOf(x);
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Can't peek into object: Object "${x}" (type: ${typeOfValue}) isn't accessible through Mewlix!`);
    },
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

// Adding utils to Mewlix object for convenience:
Mewlix.ensure = ensure;
Mewlix.clamp = clamp;
Mewlix.isNothing = isNothing;
Mewlix.opaque = opaque;

/* -----------------------------------------------------
 * Comparison: Enum-like class.
 * ----------------------------------------------------- */
Mewlix.Comparison = class Comparison {
  static LessThan    = new Comparison('<'  , -1);
  static EqualTo     = new Comparison('==' ,  0);
  static GreaterThan = new Comparison('>'  ,  1);

  constructor(operator, id) {
    this.operator = operator;
    this.id = id;
  }

  valueOf() {
    return this.id;
  }

  isEqual(x) {
    return x.valueOf() === this.valueOf();
  }

  isOneOf(...xs) {
    return xs.some(x => x.valueOf() === this.valueOf());
  }
};

/* -----------------------------------------------------
 * Basic operations.
 * ----------------------------------------------------- */
Mewlix.Arithmetic = {
  add: function add(a, b) {
    ensure.all.number(a, b);
    return a + b;
  },
  sub: function sub(a, b) {
    ensure.all.number(a, b);
    return a - b;
  },
  mul: function mul(a, b) {
    ensure.all.number(a, b);
    return a * b;
  },
  div: function div(a, b) {
    ensure.all.number(a, b);
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  mod: function mod(a, b) {
    ensure.all.number(a, b);
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a % b;
  },
  pow: function pow(a, b) {
    ensure.all.number(a, b);
    return a ** b;
  },
  negate: function negate(a) {
    ensure.all.number(a, b);
    return -a;
  },
};

Mewlix.Boolean = {
  not: function not(a) {
    return !Mewlix.Conversion.toBool(a);
  },
  or: function or(a, fb) {
    return Mewlix.Conversion.toBool(a) ? a : fb();
  },
  and: function and(a, fb) {
    return Mewlix.Conversion.toBool(a) ? fb() : a;
  },
  ternary: function ternary(condition, fa, fb) {
    return Mewlix.Conversion.toBool(condition) ? fa() : fb();
  },
};

Mewlix.Compare = {
  isEqual: function isEqual(a, b) {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (a instanceof Mewlix.Shelf || b instanceof Mewlix.Shelf) {
      return Mewlix.Shelf.isEqual(a, b);
    }
    return a === b;
  },

  // -- Numeric comparison:
  compare: function compare(a, b) {
    ensure.all.number(a, b);
    if (a === b) return Mewlix.Comparison.EqualTo;
    return (a < b) ? Mewlix.Comparison.LessThan : Mewlix.Comparison.GreaterThan;
  },
};

Mewlix.Strings = {
  concat: function concat(a, b) {
    return Mewlix.purrify(a) + Mewlix.purrify(b);
  },
};

Mewlix.Shelves = {
  peek: function peek(shelf) {
    ensure.shelf(shelf);
    return shelf.peek();
  },
  pop: function pop(shelf) {
    ensure.shelf(shelf);
    return shelf.pop();
  },
  push: function push(shelf, value = null) {
    ensure.shelf(shelf);
    return shelf.push(value);
  },
  length: function length(value) {
    if (value instanceof Mewlix.Shelf) return value.length();
    if (typeof value === 'string') return value.length;
    if (value instanceof Mewlix.Box) return Object.entries(value).length;

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Can't calculate length for value of type "${typeOfValue}": ${value}`);
  },
};

Mewlix.Reflection = {
  typeOf: function typeOf(value) {
    if (value instanceof Mewlix.Shelf) return 'shelf';
    if (value instanceof Mewlix.Box) return 'box';
    if (value instanceof Mewlix.YarnBall) return 'yarn ball';
    if (value === null || value === undefined) return 'nothing';

    switch (typeof value) {
      case 'number':
      case 'string':
      case 'boolean':
      case 'function':
        return typeof value;
      default:
        return 'unrecognized';
    }
  },

  instanceOf: function instanceOf(a, b) {
    ensure.all.box(a, b);
    return a instanceof b;
  },
};

Mewlix.Boxes = {
  pairs: function pairs(value) {
    ensure.box(value);
    return Mewlix.Shelf.fromArray(Object.entries(value).map(
      ([key, value]) => new Mewlix.Box([["key", key], ["value", value]])
    ));
  },
};

Mewlix.Conversion = {
  toBool: function toBool(x) {
    switch (typeof x) {
      case 'object'   : return x !== null;
      case 'boolean'  : return x;
      case 'undefined': return false;
      default         : return true;
    }
  },
  toNumber: function toNumber(x) {
    switch (typeof x) {
      case 'number' : return x;
      case 'boolean': return x ? 1 : 0;
      case 'string' : {
        const number = Number(x);
        if (Number.isNaN(number)) break;
        return number;
      }
      default: break;
    }
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.BadConversion,
      `Value cannot be converted to a number: ${x}`);
  }
};

/* -----------------------------------------------------
 * Statement built-ins
 * ----------------------------------------------------- */
Mewlix.Inner = {
  // It's Raining: Type check iterable value.
  rainable: function rainable(iter) {
    if (typeof iter !== 'string' || !(iter instanceof Mewlix.Shelf)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Expected 'rainable' value; received "${iter}"!`);
    }
    return rainable;
  },
  // Watch/Pounce: Generate 'error box'.
  pounceError: function pounceError(error) {
    const errorCode = (error instanceof Mewlix.MewlixError)
      ? error.code 
      : Mewlix.ErrorCode.ExternalError;
    return new Mewlix.Box([
      [ "name" , errorCode.name ],
      [ "id"   , errorCode.id   ]
    ]);
  },
  // Assert: Self-explanatory, inspired by C's assert() macro.
  assert: function assert(expr, message) {
    if (Mewlix.Conversion.toBool(expr)) return;
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.CatOnComputer,
      `Assertion failed: ${message}`);
  }
};

/* -----------------------------------------------------
 * Deepcopying Utils
 * ----------------------------------------------------- */
const deepcopyShelf = function deepcopyShelf(shelf) {
  const copy = shelf.toArray().map(x => Mewlix.deepcopy(x));
  return Mewlix.Shelf.fromArray(copy);
};

const deepcopyBox = function deepcopyBox(box) {
  if (box instanceof Mewlix.Clowder && deepcopy in box) {
    return box.deepcopy();
  }
  return Mewlix.Box(Object.entries(box).map(
    ([key, value]) => [key, Mewlix.deepcopy(value)]
  ));
};

Mewlix.deepcopy = function deepcopy(value) {
  if (typeof value !== 'object') return value;

  if (value instanceof Mewlix.Shelf) { return deepcopyShelf(value); }
  if (value instanceof Mewlix.Box)   { return deepcopyBox(value);   }

  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    `Invalid object in Mewlix context - object isn't an instance of Mewlix.Box: ${value}`);
};

/* -----------------------------------------------------
 * IO:
 * ----------------------------------------------------- */
Mewlix.meow = function meow(_) {
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    "Core function 'Mewlix.meow' hasn't been implemented!");
};

Mewlix.listen = function listen(_) {
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    "Core function 'Mewlix.listen' hasn't been implemented!");
};

/* -----------------------------------------------------
 * API:
 * ----------------------------------------------------- */
Mewlix.BoxWrapper = class BoxWrapper extends Mewlix.MewlixObject {
  constructor(object) {
    super();
    Object.defineProperty(this, 'box', {
      value: () => object,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  toString() {
    return this.box().toString();
  }

  valueOf() {
    return this.box().valueOf();
  }
};

Mewlix.wrap = function wrap(object) {
  if (typeof object !== 'object') {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidImport,
      `Special import "${object}" isn't an object!`);
  }
  if (object instanceof Mewlix.YarnBall) {
    return object;
  }
  return new Mewlix.BoxWrapper(object);
};

/* Mewlix's API functions. */
Mewlix.API = {
  createShelf: Mewlix.Shelf.fromArray,
  createBox: (box) => new Mewlix.Box(Object.entries(box ?? {})),
};

/* -------------------------------------------------------
 * Base library.
 * ------------------------------------------------------- */

/* Note: The functions in the base library use snake-case intentionally.
 * They're visible in Mewlix, and I don't want to do name-mangling. */

Mewlix.Base = Mewlix.library('std', {
  /* Converts any value to a string.
   * type: (any) -> string        */
  purr: function purr(value) {
    return Mewlix.purrify(value);
  },

  /* Trims any whitespace at the start and end of a string.
   * type: (string) -> string */
  trim: function trim(str) {
    ensure.string(str);
    return str.trim();
  },

  /* Gets a substring from a string.
   * type: (string, number, number) -> string */
  tear: function tear(str, start, end) {
    ensure.string(str);
    ensure.all.number(start, end);
    return str.substring(start, end);
  },

  /* Converts a string to lowercase.
   * type: (string) -> string */
  push_down: function push_down(str) {
    ensure.string(str);
    return str.toLowerCase();
  },

  /* Converts a string to full upper-case.
   * type: (string) -> string */
  push_up: function push_up(str) {
    ensure.string(str);
    return str.toUpperCase();
  },

  /* Index into a shelf or string.
   * type: ((shelf | string), number) -> (shelf | string) */
  poke: function poke(value, index = 0) {
    ensure.number(index);
    if (typeof value === 'string') {
      return value[index];
    }

    if (value instanceof Mewlix.Shelf) {
      for (let i = 0; i < index; i++) {
        value = value?.pop();
      }
      return value?.peek();
    }

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.join: Can't index into value of type "${typeOfValue}": ${value}`);
  },

  /* Converts any value to a boolean.
   * type: (any) -> boolean */
  nuzzle: function nuzzle(value) {
    return Mewlix.Conversion.toBool(value);
  },

  /* Asks if a shelf or string is empty.
   * type: ((shelf | string)) -> boolean */
  empty: function empty(value) {
    if (typeof value === 'string') return value === '';
    if (value instanceof Mewlix.Shelf) return value instanceof Mewlix.ShelfBottom;

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.empty: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  },

  /* Concatenates two strings or two shelves. Values must be of the same type.
   * type: ((shelf | string), (shelf | string)) -> (shelf | string) */
  join: function join(a, b) {
    const typeofA = Mewlix.Reflection.typeOf(a);
    const typeofB = Mewlix.Reflection.typeOf(b);

    if (typeofA !== typeofB) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `std.join: Values are of different types!`);
    }

    switch (typeofA) {
      case 'string': return a + b;
      case 'shelf' : return Mewlix.Shelf.concat(a, b);
      default: throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `std.join: Values of type '${typeofA}' can't be concatenated!`);
    }
  },

  /* Reverses a shelf or a string.
   * type: ((shelf | string)) -> (shelf | string) */
  reverse: function reverse(value) {
    if (typeof value === 'string') return [...value].reverse().join('');
    if (value instanceof Mewlix.Shelf) return Mewlix.Shelf.reverse(value);

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  },

  /* Converts a value to a number.
   * type: ((number | string | boolean)) -> number */
  slap: function slap(value) {
    return Mewlix.Conversion.toNumber(value);
  },

  /* Rounds a number to its nearest integer.
   * type: (number) -> number */
  round: function round(value) {
    ensure.number(value);
    return Math.round(value);
  },

  /* Rounds down a number.
   * type: (number) -> number */
  floor: function floor(value) {
    ensure.number(value);
    return Math.floor(value);
  },

  /* Rounds up a number.
   * type: (number) -> number */
  ceiling: function ceiling(value) {
    ensure.number(value);
    return Math.ceil(value);
  },

  /* Clamps a number to a minimum and a maximum value.
   * type: (number, number, number) -> number */
  clamp: function clamp(value, min, max) {
    ensure.all.number(value, min, max);
    return Mewlix.clamp(value, min, max);
  },

  /* Generates a random number x between 0 and 1, where 0 <= x < 1.
   * type: () -> number */
  random: function random() {
    return Math.random();
  },

  /* Generates a random integer number between min and max, where min <= x <= max.
   * Thus, 'min' and 'max' are inclusive.
   * If only one argument 'n' is passed, this function generates a number between 0 and n.
   * type: (number, number) -> number */
  random_int: function random_int(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    ensure.all.number(min, max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  },

  /* Akin to python's range(). It aims be a little smart:
   * count(3) should give you 0, 1, 2, 3.
   * count(1, 3) should give you 1, 2, 3.
   * count(3, 1) should give you 3, 2, 1.
   *
   * type: (number, number?) -> shelf */
  count: function count(start = 0, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    ensure.all.number(start, end);

    const array = [];
    if (start < end) {
      for (let count = start; count <= end; count++) {
        array.push(count);
      }
    }
    else {
      for (let count = start; count >= end; count--) {
        array.push(count);
      }
    }
    return Mewlix.Shelf.fromArray(array);
  },

  /* Applies a function to each item in the shelf, returning a new shelf.
   * type: (shelf, (any) -> any) -> shelf */
  map: function map(shelf, callback) {
    ensure.shelf(shelf);
    ensure.func(callback);

    let accumulator = [];
    for (const value of shelf) {
      accumulator.push(callback(value));
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  /* Filters element in the shelf by a predicate. Returns a new shelf.
   * type: (shelf, (any) -> boolean) -> shelf */
  filter: function filter(shelf, predicate) {
    ensure.shelf(shelf);
    ensure.func(predicate);

    let accumulator = [];
    for (const value of shelf) {
      if (predicate(value)) {
        accumulator.push(value);
      }
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  /* Folds over a shelf.
   * type: (shelf, any, (any, any) -> any) -> shelf */
  fold: function fold(shelf, initial, callback) {
    ensure.shelf(shelf);
    ensure.func(callback);

    let accumulator = initial;
    for (const value of shelf) {
      accumulator = callback(accumulator, value);
    }
    return accumulator;
  },

  /* Zip two shelves into a shelf of tuples.
   * type: (shelf, shelf) -> shelf */
  zip: function zip(a, b) {
    ensure.all.shelf(a, b);
    const accumulator = [];
    while (a instanceof Mewlix.ShelfNode && b instanceof Mewlix.ShelfNode) {
      accumulator.push(new Mewlix.Box([
        ["first",  a.peek()],
        ["second", b.peek()],
      ]));
      a = a.pop();
      b = b.pop();
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  /* Create a tuple box.
   * type: (any, any) -> box */
  tuple: function tuple(a, b) {
    return new Mewlix.Box([
      ["first",  a],
      ["second", b],
    ]);
  },

  /* Create a magic box for storing key-value pairs.
   * () -> box */
  table: () => {
    const table = new Map();
    const box = new Mewlix.Box([
      ["add", (key, value) => {
        table.set(key, value);
        return box;
      }],
      ["has", key => {
        return table.has(key);
      }],
      ["get", key => {
        return table.get(key);
      }],
      ["remove", key => {
        table.delete(key);
        return box;
      }],
      ["clear", () => {
        table.clear();
        return box;
      }],
    ]);
    return box;
  },

  /* Create a magic box for storing unique values in a set.
   * () -> box */
  set: () => {
    const set = new Set();
    const box = new Mewlix.Box([
      ["add", value => {
        set.add(value);
        return box;
      }],
      ["has", value => {
        return set.has(value);
      }],
      ["remove", value => {
        set.delete(value);
        return box;
      }],
      ["clear", () => {
        set.clear();
        return box;
      }],
    ]);
    return box;
  },
});

/* Freezing the base library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Base);

/* -------------------------------------------------------
 * Final Touches
 * ------------------------------------------------------- */
/* A default implementation for the Mewlix.run entrypoint function.
 * The console and graphic templates override this implementation.
 *
 * As such, it can be used in `run-mewlix.js` in a template-agnostic way. */
Mewlix.run = f => f();

/* Add to globalThis -- make it available globally. This is necessary.
 * All of Mewlix's context is contained in the Mewlix object. */
globalThis.Mewlix = Mewlix;
