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
    this.next  = tail ?? new Mewlix.ShelfBottom();
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
const typecheck = (predicate) => (expected) => (value) => (source) => {
  if (predicate(value)) return;
  const typeOfValue = Mewlix.Reflection.typeOf(value);
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
    `${source}: Expected ${expected}, got ${typeOfValue}: ${value}!`);
};

const typecheckAll = typechecker => (...values) => source => {
  values.map(typechecker).forEach(fn => fn(source));
};

const ensure = {
  number:   typecheck(x => typeof x === 'number')('number'),
  string:   typecheck(x => typeof x === 'string')('string'),
  boolean:  typecheck(x => typeof x === 'boolean')('boolean'),
  shelf:    typecheck(x => x instanceof Mewlix.Shelf)('shelf'),
  box:      typecheck(x => x instanceof Mewlix.Box)('box'),
  func:     typecheck(x => typeof x === 'function')('func'),
};

ensure.all = {
  number:   typecheckAll(ensure.number),
  string:   typecheckAll(ensure.string),
  boolean:  typecheckAll(ensure.boolean),
  shelf:    typecheckAll(ensure.shelf),
  box:      typecheckAll(ensure.box),
  func:     typecheckAll(ensure.func),
};

const where = source => (...assertions) => {
  assertions.forEach(x => x(source));
}

Mewlix.ensure = ensure;
Mewlix.where = where;

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
    where('+')(ensure.all.number(a, b));
    return a + b;
  },
  sub: function sub(a, b) {
    where('-')(ensure.all.number(a, b));
    return a - b;
  },
  mul: function mul(a, b) {
    where('*')(ensure.all.number(a, b));
    return a * b;
  },
  div: function div(a, b) {
    where('/')(ensure.all.number(a, b));
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  mod: function mod(a, b) {
    where('%')(ensure.all.number(a, b));
    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a % b;
  },
  pow: function pow(a, b) {
    where('^')(ensure.all.number(a, b));
    return a ** b;
  },
  negate: function negate(a) {
    where('-')(ensure.number(a));
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
    where('peek')(ensure.shelf(shelf));
    return shelf.peek();
  },
  pop: function pop(shelf) {
    where('pop')(ensure.shelf(shelf));
    return shelf.pop();
  },
  push: function push(shelf, value = null) {
    where('push')(ensure.shelf(shelf));
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
    where('is')(ensure.all.box(a, b));
    return a instanceof b;
  },
};

Mewlix.Boxes = {
  pairs: function pairs(value) {
    where('claw at')(ensure.box(value));
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
  rainable: function rainable(iter) {
    if (typeof iter !== 'string' || !(iter instanceof Mewlix.Shelf)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Expected 'rainable' value; received "${iter}"!`);
    }
    return rainable;
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
 * > https://github.com/KBMackenzie/mewlix/wiki/std <
 *
 * It won't be included in this source file to avoid clutter.
 *
 * All std library functions *should use snake_case*. That's
 * why the functions below use snake_case. */

Mewlix.Base = Mewlix.library('std', {
  purr: function purr(value) {
    return Mewlix.purrify(value);
  },

  trim: function trim(str) {
    where('std.trim')(ensure.string(str));
    return str.trim();
  },

  tear: function tear(str, start, end) {
    where('std.tear')(
      ensure.string(str),
      ensure.all.number(start, end),
    );
    return str.substring(start, end);
  },

  push_down: function push_down(str) {
    where('std.push_down')(ensure.string(str));
    return str.toLowerCase();
  },

  push_up: function push_up(str) {
    where('std.push_up')(ensure.string(str));
    return str.toUpperCase();
  },

  poke: function poke(value, index = 0) {
    where('std.poke')(ensure.number(index));

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
    where('std.take')(ensure.number(amount));

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
    where('std.take')(ensure.number(amount));

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
    where('std.sort')(ensure.shelf(shelf));
    return Mewlix.Shelf.fromArray(shelf
      .toArray()
      .sort((a, b) => Mewlix.Compare.compare(a, b).id)
    );
  },

  shuffle: function shuffle(shelf) {
    where('std.shuffle')(ensure.shelf(shelf));
    const output = shelf.toArray();

    for (let i = output.length - 1; i > 0; i--) {
      const j = Mewlix.Base.random_int(0, i);

      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }
    return Mewlix.Shelf.fromArray(output);
  },

  map: async function map(shelf, callback) {
    where('std.map')(
      ensure.shelf(shelf),
      ensure.func(callback),
    );

    let accumulator = [];
    for (const value of shelf) {
      accumulator.push(await callback(value));
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  filter: async function filter(shelf, predicate) {
    where('std.filter')(
      ensure.shelf(shelf),
      ensure.func(predicate),
    );

    let accumulator = [];
    for (const value of shelf) {
      if (await predicate(value)) {
        accumulator.push(value);
      }
    }
    return Mewlix.Shelf.fromArray(accumulator.reverse());
  },

  fold: async function fold(shelf, initial, callback) {
    where('std.fold')(
      ensure.shelf(shelf),
      ensure.func(callback),
    );

    let accumulator = initial;
    for (const value of shelf) {
      accumulator = await callback(accumulator, value);
    }
    return accumulator;
  },

  zip: function zip(a, b) {
    where('std.zip')(ensure.all.shelf(a, b));
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
    where('std.insert')(
      ensure.shelf(shelf),
      ensure.number(index),
    );

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
    where('std.reverse')(
      ensure.shelf(shelf),
      ensure.number(index),
    );

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
    where('std.round')(ensure.number(value));
    return Math.round(value);
  },

  floor: function floor(value) {
    where('std.floor')(ensure.number(value));
    return Math.floor(value);
  },

  ceiling: function ceiling(value) {
    where('std.ceiling')(ensure.number(value));
    return Math.ceil(value);
  },

  clamp: function clamp(value, min, max) {
    where('std.clamp')(ensure.all.number(value, min, max));
    return Mewlix.clamp(value, min, max);
  },

  random: function random() {
    return Math.random();
  },

  random_int: function random_int(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    where('std.random_int')(ensure.all.number(min, max));
    return Math.floor(Math.random() * (max - min + 1) + min);
  },

  count: function count(start = 0, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    where('std.count')(ensure.all.number(start, end));

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

  log: function log(value) {
    const message = Mewlix.purrify(value);
    console?.log(`[Mewlix] ${message}`);
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
