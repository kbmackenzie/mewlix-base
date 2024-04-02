/* Mewlix is a cat-themed esoteric programming language. 🐱
 * THis is a core file from Mewlix's base library.
 * 
 * Learn more at:
 * > https://github.com/kbmackenzie/mewlix <
 *
 * Copyright 2024 kbmackenzie. Released under the MIT License.
 * The full license details can be found at:
 * > https://github.com/kbmackenzie/mewlix-base/blob/main/LICENSE < */

'use strict';

const Mewlix = {};

/* -----------------------------------------------------
 * MewlixError -> Custom error type.
 * ----------------------------------------------------- */
Mewlix.ErrorCode = class ErrorCode {
  static TypeMismatch       = new ErrorCode('TypeMismatch'      , 0);
  static InvalidOperation   = new ErrorCode('InvalidOperation'  , 1);
  static InvalidConversion  = new ErrorCode('InvalidConversion' , 2);
  static CatOnComputer      = new ErrorCode('CatOnComputer'     , 3);
  static Console            = new ErrorCode('Console'           , 4);
  static Graphic            = new ErrorCode('Graphic'           , 5);
  static InvalidImport      = new ErrorCode('InvalidImport'     , 6);
  static CriticalError      = new ErrorCode('CriticalError'     , 7);
  static ExternalError      = new ErrorCode('ExternalError'     , 8);

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

  /* Inject object as a valid Mewlix module.
   * The key should be a non-empty string. */
  injectModule(key, object) {
    const wrapped = Mewlix.wrap(object);
    this.cache.set(key, wrapped);
    this.modules.set(key, () => wrapped);
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

  push(value) {
    return new Mewlix.ShelfNode(value, this);
  }

  toArray() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
      "Shelf error: 'toArray()' method not implemented!");
  }

  toString() {
    return Mewlix.purrifyArray(this.toArray());
  }

  toJSON() {
    return this.toArray();
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

  length() {
    return 0;
  }

  contains(_) {
    return false;
  }

  toArray() {
    return [];
  }
}

Mewlix.ShelfNode = class ShelfNode extends Mewlix.Shelf {
  constructor(value, tail) {
    super();
    this.value = value;
    this.next  = tail ?? new Mewlix.ShelfBottom();
    Object.freeze(this);
  }

  peek() {
    return this.value;
  }

  pop() {
    return this.next;
  }

  length() {
    return 1 + this.next.length();
  }

  contains(value) {
    return Mewlix.Compare.isEqual(value, this.value)
      ? true
      : this.next.contains(value);
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
/* The clowder constructor symbol. */
const wakeSymbol = Symbol('wake');
Mewlix.wake = wakeSymbol;

/* All clowders should inherit from this class.
 * It has a default definition for wake(), too. */
Mewlix.Clowder = class Clowder extends Mewlix.Box {
  constructor() {
    super();

    this[wakeSymbol] = (function wake() {
      return this;
    }).bind(this);
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
Mewlix.library = function(libkey, libobj = {}) {
  const yarn = new Mewlix.YarnBall(libkey);
  for (const key in libobj) {
    yarn[key] = libobj[key];
  }
  return yarn;
};

/* -----------------------------------------------------
 * Generate curried yarn ball.
 * ----------------------------------------------------- */
Mewlix.curryLibrary = function(libkey, base, libobj = {}) {
  const yarn = new Mewlix.YarnBall(libkey);
  for (const key in libobj) {
    yarn[key] = libobj[key];
  }
  for (const key in base) {
    if (key in yarn) continue;
    yarn[key] = base[key];
  }
  return yarn;
};

/* -----------------------------------------------------
 * String utils.
 * ----------------------------------------------------- */
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

Mewlix.purrifyItem = function purrifyItem(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  return Mewlix.purrify(value);
};

Mewlix.purrifyArray = function purrifyArray(arr) {
  const items = arr.map(Mewlix.purrifyItem).join(', ');
  return `[${items}]`;
};

Mewlix.purrifyObject = function purrifyObject(obj) {
  const entries = Object.entries(obj).map(
    ([key, value]) => `${key}: ${Mewlix.purrifyItem(value)}`
  ).join(', ');
  return `=^-x-^= [ ${entries} ]`;
}

/* -----------------------------------------------------
 * Type Checking
 * ----------------------------------------------------- */
const typecheck = (predicate, expected) => (source, value) => {
  if (predicate(value)) return;
  const typeOfValue = Mewlix.Reflection.typeOf(value);
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
    `${source}: Expected ${expected}, got ${typeOfValue}: ${value}!`);
};

const ensure = {
  number:   typecheck(x => typeof x === 'number',     'number' ),
  string:   typecheck(x => typeof x === 'string',     'string' ),
  boolean:  typecheck(x => typeof x === 'boolean',    'boolean'),
  shelf:    typecheck(x => x instanceof Mewlix.Shelf, 'shelf'  ),
  box:      typecheck(x => x instanceof Mewlix.Box,   'box'    ),
  func:     typecheck(x => typeof x === 'function',   'func'   ),
};

ensure.all = {
  number:   (source, ...values) => values.forEach(x => ensure.number(source, x) ),
  string:   (source, ...values) => values.forEach(x => ensure.string(source, x) ),
  boolean:  (source, ...values) => values.forEach(x => ensure.boolean(source, x)),
  shelf:    (source, ...values) => values.forEach(x => ensure.shelf(source, x)  ),
  box:      (source, ...values) => values.forEach(x => ensure.box(source, x)    ),
  func:     (source, ...values) => values.forEach(x => ensure.func(source, x)   ),
};

Mewlix.ensure = ensure;

/* -----------------------------------------------------
 * Value Utils 
 * ----------------------------------------------------- */
const isNothing = function isNothing(x) {
  return x === null || x === undefined;
};

const clamp = function clamp(value, min, max) {
  return value < min ? min : (value > max ? max : value);
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

Mewlix.isNothing = isNothing;
Mewlix.clamp = clamp;
Mewlix.opaque = opaque;

/* -----------------------------------------------------
 * JSON utils
 * ----------------------------------------------------- */
Mewlix.JSON = {
  fromObject: object => {
    return new Mewlix.Box(
      Object.entries(object)
        .map(([key, value]) => [key, Mewlix.JSON.fromAny(value)])
    );
  },
  fromArray: array => {
    return Mewlix.Shelf.fromArray(
      array.map(Mewlix.JSON.fromAny)
    );
  },
  fromAny: value => {
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return Mewlix.JSON.fromArray(value);
    }
    return Mewlix.JSON.fromObject(value);
  },
}

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
Mewlix.Numbers = {
  add: function add(a, b) {
    ensure.number('+', a);
    ensure.number('+', b);
    return a + b;
  },
  sub: function sub(a, b) {
    ensure.number('-', a);
    ensure.number('-', b);
    return a - b;
  },
  mul: function mul(a, b) {
    ensure.number('*', a);
    ensure.number('*', b);
    return a * b;
  },
  div: function div(a, b) {
    ensure.number('/', a);
    ensure.number('/', b);
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  mod: function mod(a, b) {
    ensure.number('%', a);
    ensure.number('%', b);
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `Attempted to divide ${a} by ${b}!`);
    }
    return ((a % b) + b) % b;
  },
  pow: function pow(a, b) {
    ensure.number('^', a);
    ensure.number('^', b);
    return a ** b;
  },
  negate: function negate(a) {
    ensure.number('-', a);
    return -a;
  },
};

Mewlix.Boolean = {
  not: function not(a) {
    return !Mewlix.Conversion.toBool(a);
  },
  or: async function or(a, fb) {
    return Mewlix.Conversion.toBool(a) ? a : fb();
  },
  and: async function and(a, fb) {
    return Mewlix.Conversion.toBool(a) ? fb() : a;
  },
  ternary: async function ternary(condition, fa, fb) {
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
    if (typeof a !== typeof b) {
      const typeofA = Mewlix.Reflection.typeOf(a);
      const typeofB = Mewlix.Reflection.typeOf(b);
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `compare: Cannot compare values of different types: "${typeofA}" and "${typeofB}"!`);
    }

    switch (typeof a) {
      case 'number':
      case 'string':
      case 'boolean':
        if (a === b) return Mewlix.Comparison.EqualTo;
        return (a < b) ? Mewlix.Comparison.LessThan : Mewlix.Comparison.GreaterThan;
      default:
        break;
    }

    const typeOfValue = Mewlix.Reflection.typeOf(a);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `compare: Cannot compare values of type "${typeOfValue}"!`);
  },
};

Mewlix.Strings = {
  concat: function concat(a, b) {
    return Mewlix.purrify(a) + Mewlix.purrify(b);
  },
};

Mewlix.Shelves = {
  peek: function peek(shelf) {
    ensure.shelf('peek', shelf);
    return shelf.peek();
  },
  pop: function pop(shelf) {
    ensure.shelf('knock off', shelf);
    return shelf.pop();
  },
  push: function push(shelf, value) {
    ensure.shelf('push', shelf);
    return shelf.push(value);
  },
  length: function length(value) {
    if (value instanceof Mewlix.Shelf) return value.length();
    if (typeof value === 'string') return value.length;
    if (value instanceof Mewlix.Box) return Object.entries(value).length;

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `...?: Can't calculate length for value of type "${typeOfValue}": ${value}`);
  },
  contains: function contains(a, b) {
    if (b instanceof Mewlix.Shelf) { return b.contains(a); }

    if (typeof a !== 'string') {
      const typeOfA = Mewlix.Reflection.typeOf(a);
      const typeOfB = Mewlix.Reflection.typeOf(b);
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `in: Expected string for lookup in "${typeOfB}"; got "${typeOfA}": ${a}`);
    }

    if (typeof b === 'string') { return b.includes(a); }
    if (b instanceof Mewlix.Box) { return a in b; }

    const typeOfB = Mewlix.Reflection.typeOf(b);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `in: Cannot perform lookup in value of type "${typeOfB}": ${b}`);
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
    ensure.box('is', a);
    return a instanceof b;
  },
};

Mewlix.Boxes = {
  pairs: function pairs(value) {
    ensure.box('claw at', value);
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
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidConversion,
      `Value cannot be converted to a number: ${x}`);
  }
};

/* -----------------------------------------------------
 * Statement built-ins
 * ----------------------------------------------------- */
Mewlix.Internal = {
  rainable: function rainable(value) {
    if (typeof value === 'string' || value instanceof Mewlix.Shelf) {
      return value;
    }
    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected string or shelf; received value of type '${typeOfValue}': ${value}`);
  },
  pounceError: function pounceError(error) {
    const errorCode = (error instanceof Mewlix.MewlixError)
      ? error.code 
      : Mewlix.ErrorCode.ExternalError;
    return new Mewlix.Box([
      [ "name" , errorCode.name ],
      [ "id"   , errorCode.id   ]
    ]);
  },
  assert: function assert(expr, message) {
    if (Mewlix.Conversion.toBool(expr)) return;
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.CatOnComputer,
      `Assertion failed: ${message}`);
  }
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

Mewlix.API = {
  arrayToShelf: Mewlix.Shelf.fromArray,
  shelf: (...items) => Mewlix.Shelf.fromArray(items),
  createBox: object => new Mewlix.Box(Object.entries(object ?? {})),
  inject: (key, object) => Mewlix.Modules.injectModule(key, object),
};

/* -------------------------------------------------------
 * Base library.
 * ------------------------------------------------------- */

/* The std library documentation can be found on the wiki:
 * > https://github.com/kbmackenzie/mewlix/wiki/std <
 *
 * It won't be included in this source file to avoid clutter.
 *
 * All standard library functions *should use snake_case*, as
 * they're going to be accessible from within Mewlix. */

Mewlix.Base = Mewlix.library('std', {
  purr: function purr(value) {
    return Mewlix.purrify(value);
  },

  cat: function cat(shelf) {
    let acc = '';
    for (const value of shelf) {
      acc = Mewlix.purrify(value) + acc;
    }
    return acc;
  },

  trim: function trim(str) {
    ensure.string('std.trim', str)
    return str.trim();
  },

  tear: function tear(str, start, end) {
    ensure.string('std.tear', str);
    ensure.number('std.tear', start);
    ensure.number('std.tear', end);

    return str.substring(start, end);
  },

  push_down: function push_down(str) {
    ensure.string('std.push_down', str);
    return str.toLowerCase();
  },

  push_up: function push_up(str) {
    ensure.string('std.push_up', str);
    return str.toUpperCase();
  },

  poke: function poke(value, index = 0) {
    ensure.number('std.poke', index);

    if (typeof value === 'string') {
      if (index < 0) {
        index = Math.max(0, value.length + index);
      }
      return value[index];
    }

    if (value instanceof Mewlix.Shelf) {
      if (index < 0) {
        index = Math.max(0, value.length() + index);
      }
      for (let i = 0; i < index; i++) {
        value = value?.pop();
      }
      return value?.peek();
    }

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.join: Can't index into value of type "${typeOfValue}": ${value}`);
  },

  char: function char(value) {
    switch (typeof value) {
      case 'number': return String.fromCharCode(value);
      case 'string': return value[0] ?? '\0';
      default: break;
    }

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.char: Cannot convert value of type "${typeOfValue}" to char: ${value}`);
  },

  bap: function bap(value) {
    ensure.string('std.bap', value);
    if (value.length === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        'std.bap: Expected character; received empty string!');
    }
    return value.charCodeAt(0);
  },

  nuzzle: function nuzzle(value) {
    return Mewlix.Conversion.toBool(value);
  },

  empty: function empty(value) {
    if (typeof value === 'string') return value === '';
    if (value instanceof Mewlix.Shelf) return value instanceof Mewlix.ShelfBottom;

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.empty: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  },

  join: function join(a, b) {
    const typeofA = Mewlix.Reflection.typeOf(a);
    const typeofB = Mewlix.Reflection.typeOf(b);

    if (typeofA !== typeofB) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `std.join: Values are of different types: "${typeofA}" and "${typeofB}"!`);
    }

    switch (typeofA) {
      case 'string': return a + b;
      case 'shelf' : return Mewlix.Shelf.concat(a, b);
      default: throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `std.join: Values of type '${typeofA}' can't be concatenated!`);
    }
  },

  take: function take(value, amount) {
    ensure.number('std.take', amount);

    if (typeof value === 'string') return value.slice(0, amount);
    if (value instanceof Mewlix.Shelf) {
      const output = [];
      let counter = amount;
      for (const item of value) {
        if (counter-- <= 0) break;
        output.push(item);
      }
      return Mewlix.Shelf.fromArray(output.reverse());
    }

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.take: Can't perform 'take' operation on value of type "${typeOfValue}": ${value}`);
  },

  drop: function drop(value, amount) {
    ensure.number('std.drop', amount);

    if (typeof value === 'string') return value.slice(amount);
    if (value instanceof Mewlix.Shelf) {
      let output = value;
      for (let i = amount; i > 0; i--) {
        output = output?.pop();
      }
      return output ?? new Mewlix.ShelfBottom();;
    }

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.drop: Can't perform 'drop' operation on value of type "${typeOfValue}": ${value}`);
  },

  reverse: function reverse(value) {
    if (typeof value === 'string') return [...value].reverse().join('');
    if (value instanceof Mewlix.Shelf) return Mewlix.Shelf.reverse(value);

    const typeOfValue = Mewlix.Reflection.typeOf(value);
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  },
  
  sort: function sort(shelf) {
    ensure.shelf('std.sort', shelf);
    return Mewlix.Shelf.fromArray(shelf
      .toArray()
      .sort((a, b) => Mewlix.Compare.compare(a, b).id)
    );
  },

  shuffle: function shuffle(shelf) {
    ensure.shelf('std.shuffle', shelf);
    const output = shelf.toArray();

    for (let i = output.length - 1; i > 0; i--) {
      const j = Mewlix.Base.random_int(0, i);

      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }
    return Mewlix.Shelf.fromArray(output);
  },

  map: async function map(callback, shelf) {
    ensure.func('std.map', callback);
    ensure.shelf('std.map', shelf);

    let accumulator = [];
    for (const value of shelf) {
      accumulator.push(await callback(value));
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  filter: async function filter(predicate, shelf) {
    ensure.func('std.filter', predicate);
    ensure.shelf('std.filter', shelf);

    let accumulator = [];
    for (const value of shelf) {
      if (await predicate(value)) {
        accumulator.push(value);
      }
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  fold: async function fold(callback, initial, shelf) {
    ensure.func('std.fold', callback);
    ensure.shelf('std.fold', shelf);

    let accumulator = initial;
    for (const value of shelf) {
      accumulator = await callback(accumulator, value);
    }
    return accumulator;
  },

  zip: function zip(a, b) {
    ensure.shelf('std.zip', a);
    ensure.shelf('std.zip', b);

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

  insert: function insert(shelf, value, index = 0) {
    ensure.shelf('std.insert', shelf);
    ensure.number('std.insert', index);

    const bucket = [];
    let tail = shelf;

    if (index < 0) {
      index = Math.max(0, shelf.length() + index + 1);
    }

    let count = index;
    for (const item of shelf) {
      if (count-- <= 0) break;
      bucket.push(item);
      tail = tail.pop();
    }
    bucket.push(value);

    const init = Mewlix.Shelf.fromArray(bucket.reverse());
    return Mewlix.Shelf.concat(tail, init);
  },

  remove: function remove(shelf, index = 0) {
    ensure.shelf('std.remove', shelf);
    ensure.number('std.remove', index);

    const bucket = [];
    let tail = shelf;

    let count = index;
    for (const item of shelf) {
      if (count-- < 0) break;
      bucket.push(item);
      tail = tail.pop();
    }
    if (count >= 0) return shelf;
    bucket.pop();
    const init = Mewlix.Shelf.fromArray(bucket.reverse());
    return Mewlix.Shelf.concat(tail, init);
  },

  tuple: function tuple(a, b) {
    return new Mewlix.Box([
      ["first",  a],
      ["second", b],
    ]);
  },

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

  slap: function slap(value) {
    return Mewlix.Conversion.toNumber(value);
  },

  round: function round(value) {
    ensure.number('std.round', value);
    return Math.round(value);
  },

  floor: function floor(value) {
    ensure.number('std.floor', value);
    return Math.floor(value);
  },

  ceiling: function ceiling(value) {
    ensure.number('std.ceiling', value);
    return Math.ceil(value);
  },

  min: function min(a, b) {
    ensure.number('std.min', a);
    ensure.number('std.min', b);
    return Math.min(a, b);
  },

  max: function max(a, b) {
    ensure.number('std.max', a);
    ensure.number('std.max', b);
    return Math.max(a, b);
  },

  clamp: function clamp(value, min, max) {
    ensure.number('std.clamp', value);
    ensure.number('std.clamp', min);
    ensure.number('std.clamp', max);

    return Mewlix.clamp(value, min, max);
  },

  abs: function abs(value) {
    ensure.number('std.abs', value);
    return Math.abs(value);
  },

  pi: Math.PI,
  e: Math.E,

  sqrt: function sqrt(value) {
    ensure.number('std.sqrt', value);
    if (value < 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `std.sqrt: Cannot calculate square root of negative number ${value}!`);
    }
    return Math.sqrt(value);
  },

  logn: function logn(value, base) {
    ensure.number('std.logn', value);
    if (value <= 0) {
      const logType = Mewlix.isNothing(base)
        ? 'natural logarithm'
        : `logarithm to base ${base}`;
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `std.logn: Cannot calculate ${logType} of ${value}!`);
    }
    if (base === undefined) {
      return Math.log(value);
    }
    ensure.number('std.logn', base);
    if (base <= 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `std.logn: Invalid base for logarithm: ${base}!`);
    }
    return Math.log(value) / Math.log(base);
  },

  acos: function acos(value) {
    ensure.number('std.acos', value);
    return Math.acos(value);
  },

  asin: function asin(value) {
    ensure.number('std.asin', value);
    return Math.asin(value);
  },

  atan: function atan(value) {
    ensure.number('std.atan', value);
    return Math.atan(value);
  },

  cos: function cos(value) {
    ensure.number('std.cos', value);
    return Math.cos(value);
  },

  sin: function sin(value) {
    ensure.number('std.sin', value);
    return Math.sin(value);
  },

  tan: function tan(value) {
    ensure.number('std.tan', value);
    return Math.tan(value);
  },

  atan2: function atan2(y, x) {
    ensure.number('std.atan2', y);
    ensure.number('std.atan2', x);
    return Math.atan2(y, x);
  },

  truncate: function truncate(value, places = 0) {
    ensure.number('std.truncate', value);
    ensure.number('std.truncate', places);
    if (places < 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOperation,
        `std.truncate: Value of places should be greater than 0; received ${places}`);
    }
    const modifier = 10 ** places;
    return Math.trunc(value * modifier) / modifier;
  },

  random: function random() {
    return Math.random();
  },

  random_int: function random_int(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    ensure.number('std.random_int', min);
    ensure.number('std.random_int', max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  },

  count: function count(start = 0, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    ensure.number('std.count', start);
    ensure.number('std.count', end);

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

  read: function read(key) {
    ensure.string('std.read', key);
    return localStorage.getItem(key);
  },

  save: function save(key, contents) {
    ensure.string('std.save', key);
    ensure.string('std.save', contents);
    localStorage.setItem(key, contents);
  },

  date: function date() {
    const now = new Date();
    return new Mewlix.Box([
      [ "day"    , now.getDay() + 1   ],
      [ "month"  , now.getMonth() + 1 ],
      [ "year"   , now.getFullYear()  ],
      [ "hours"  , now.getHours(),    ],
      [ "minutes", now.getMinutes()   ],
      [ "seconds", now.getSeconds()   ],
    ]);
  },

  time: function time() {
    return Date.now();
  },

  meowf: function meowf(str) {
    return Mewlix.meow(Mewlix.purrify(str));
  },

  listenf: function listenf(str) {
    return Mewlix.listen(Mewlix.purrify(str));
  },

  read_file: async function read_file(path) {
    ensure.string('std.read_file', path);
    return fetch(path).then(response => response.text());
  },

  to_json: function to_json(value) {
    return JSON.stringify(value);
  },

  from_json: function from_json(value) {
    ensure.string('std.from_json', value);
    return Mewlix.JSON.fromAny(JSON.parse(value));
  },

  log: function log(value) {
    const message = Mewlix.purrify(value);
    console?.log(`[Mewlix] ${message}`);
  },
});

/* Freezing the base library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Base);

/* ------------------------------------------
 * Standard Library - Currying
 * ------------------------------------------ */
Mewlix.BaseCurry = (() => {
  const std = Mewlix.Base;

  return Mewlix.curryLibrary('std.curry', Mewlix.Base, {
    tear: str => start => end => std.tear(str, start, end),
    poke: value => index => std.poke(value, index),
    join: a => b => std.join(a, b),
    take: value => amount => std.take(value, amount),
    drop: value => amount => std.drop(value, amount),

    map: callback => shelf => std.map(callback, shelf),
    filter: predicate => shelf => std.filter(predicate, shelf),
    fold: callback => initial => shelf => std.fold(callback, initial, shelf),
    zip: a => b => std.zip(a, b),
    insert: shelf => value => index => std.insert(shelf, value, index),
    remove: shelf => index => std.remove(shelf, index),

    tuple: a => b => std.tuple(a, b),

    min: a => b => std.min(a, b),
    max: a => b => std.max(a, b),
    clamp: value => min => max => std.clamp(value, min, max),
    logn: value => base => std.logn(value, base),
    atan: y => x => std.atan2(y, x),
    truncate: value => places => std.truncate(value, places),
    random_int: min => max => std.random_int(min, max),
    count: start => end => std.count(start, end),

    save: key => contents => std.save(key, contents),
  });
})();

/* Freezing the curry library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.BaseCurry);

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
