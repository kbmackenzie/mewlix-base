const Mewlix = {};

// -----------------------------------------------------
// MewlixError -> Custom error type.
// -----------------------------------------------------
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

// -----------------------------------------------------
// MewlixObject -> Base object class.
// -----------------------------------------------------
Mewlix.MewlixObject = class MewlixObject {
  valueOf() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
  }
};

// -----------------------------------------------------
// Mewlix.Namespace -> Container for modules.
// -----------------------------------------------------
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

// -----------------------------------------------------
// Mewlix.Modules -> Default module container.
// -----------------------------------------------------
Mewlix.Modules = new Mewlix.Namespace('default');

// -----------------------------------------------------
// Shelf/Stack -> Mewlix's 'list' type.
// -----------------------------------------------------
Mewlix.MewlixStack = class MewlixStack extends Mewlix.MewlixObject {
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

  toString() {
    return Mewlix.purrifyArray(this.toArray());
  }

  *[Symbol.iterator]() {
    let node = this;
    while (node instanceof Mewlix.StackNode) {
      yield node.peek();
      node = node.pop();
    }
  }

  static isEqual(a, b) {
    if (a instanceof Mewlix.StackBottom) return b instanceof Mewlix.StackBottom;
    if (b instanceof Mewlix.StackBottom) return a instanceof Mewlix.StackBottom;

    return Mewlix.Op.isEqual(a.peek(), b.peek()) && MewlixStack.isEqual(a.pop(), b.pop());
  }

  static fromArray(arr) {
    return arr.reduce(
      (tail, value) => new Mewlix.StackNode(value, tail),
      new Mewlix.StackBottom()
    );
  }
}

Mewlix.StackBottom = class StackBottom extends Mewlix.MewlixStack {
  constructor() {
    super();
  }

  peek() {
    return null;
  }

  pop() {
    return this;
  }

  push(value) {
    return new Mewlix.StackNode(value, this);
  }

  length() {
    return 0;
  }

  toArray() {
    return [];
  }
}

Mewlix.StackNode = class StackNode extends Mewlix.MewlixStack {
  constructor(value, tail) {
    super();
    this.value = value;
    this.next  = tail || new Mewlix.StackBottom();
  }

  peek() {
    return this.value;
  }

  pop() {
    return this.next;
  }

  push(value) {
    return new Mewlix.StackNode(value, this);
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

// -----------------------------------------------------
// MewlixBox -> Mewlix's associative array.
// -----------------------------------------------------
Mewlix.MewlixBox = class MewlixBox extends Mewlix.MewlixObject {
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

// -----------------------------------------------------
// MewlixClowder -> Clowder base class.
// -----------------------------------------------------
Mewlix.MewlixClowder = class MewlixClowder extends Mewlix.MewlixBox {
  // Empty definition. This class exists mostly to differentiate boxes and clowders.
}

// -----------------------------------------------------
// String utils.
// -----------------------------------------------------
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

// -----------------------------------------------------
// Type utils.
// -----------------------------------------------------
const typeCheck = function typeCheck(value, targetType) {
  if (typeof value === targetType) return;
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
    `Expected value of type ${targetType}, received ${typeof value}!`);
};

const isNothing = function isNothing(x) {
  return x === null || x === undefined;
};

const stackCheck = function stackCheck(x) {
  if (x instanceof Mewlix.MewlixStack) return;
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
    `Expected shelf; received value of type "${typeof x}": ${x}`);
};

// -----------------------------------------------------
// Numeric comparisons.
// -----------------------------------------------------
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

// -----------------------------------------------------
// Basic operations.
// -----------------------------------------------------
Mewlix.Op = {
  // -- Arithmetic operations:
  add: function add(a, b) {
    typeCheck(a, 'number');
    typeCheck(a, 'number');
    return a + b;
  },
  sub: function sub(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    return a - b;
  },
  mul: function mul(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    return a * b;
  },
  div: function div(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');

    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  mod: function mod(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');

    if (b === 0) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.DivideByZero,
        `Attempted to divide ${a} by ${b}!`);
    }
    return a % b;
  },
  pow: function pow(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    return a ** b;
  },
  negate: function negate(a) {
    typeCheck(a, 'number');
    return -a;
  },

  // -- Comparison:
  isEqual: function isEqual(a, b) {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (a instanceof Mewlix.MewlixStack || b instanceof Mewlix.MewlixStack) {
      return Mewlix.MewlixStack.isEqual(a, b);
    }
    return a === b;
  },

  // Conversion:
  toBool: function toBool(x) {
    if (x instanceof Mewlix.MewlixStack) return !(x instanceof Mewlix.StackBottom);
    switch (typeof x) {
      case 'object'   : return x !== null;
      case 'boolean'  : return x;
      case 'undefined': return false;
      default         : return true;
    }
  },

  // -- Boolean operations:
  not: function not(a) {
    return !Mewlix.Op.toBool(a);
  },
  or: function or(a, fb) {
    return Mewlix.Op.toBool(a) ? a : fb();
  },
  and: function and(a, fb) {
    return Mewlix.Op.toBool(a) ? fb() : a;
  },

  // -- Ternary operator:
  ternary: function ternary(condition, fa, fb) {
    return Mewlix.Op.toBool(condition) ? fa() : fb();
  },

  // -- Numeric comparison:
  compare: function compare(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    if (a === b) return Mewlix.Comparison.EqualTo;
    return (a < b) ? Mewlix.Comparison.LessThan : Mewlix.Comparison.GreaterThan;
  },

  // -- Stack operations:
  peek: function peek(shelf) {
    stackCheck(shelf);
    return shelf.peek();
  },
  pop: function pop(shelf) {
    stackCheck(shelf);
    return shelf.pop();
  },
  push: function push(shelf, value = null) {
    stackCheck(shelf);
    return shelf.push(value);
  },

  // -- Miscellaneous operations:
  length: function length(value) {
    if (value instanceof Mewlix.MewlixStack) return value.length();
    if (typeof value === 'string') return value.length;
    if (value instanceof Mewlix.MewlixBox) return Object.entries(value).length;

    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Can't calculate length for value of type "${typeof value}": ${value}`);
  },
  concat: function concat(a, b) {
    return Mewlix.purrify(a) + Mewlix.purrify(b);
  },

  // -- Reflection:
  typeOf: function typeOf(value) {
    if (value instanceof Mewlix.MewlixStack) return 'shelf';
    if (value instanceof Mewlix.MewlixBox) return 'box';
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
    if (!(b instanceof Mewlix.MewlixObject)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Expected Mewlix object in operation; received "${b}"!`);
    }
    return a instanceof b;
  },

  // -- Box Operations:
  pairs: function pairs(value) {
    if (!(value instanceof Mewlix.MewlixBox)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Can't retrieve entries: Expected box, got value of type "${typeof value}": ${value}`);
    }
    return Mewlix.MewlixStack.fromArray(Object.entries(value).map(
      ([key, value]) => new Mewlix.MewlixBox([["key", key], ["value", value]])
    ));
  },
}

// -----------------------------------------------------
// Statement wrappers
// -----------------------------------------------------

// It's Raining: Type check iterable value.
Mewlix.rainable = function rainable(iter) {
  if (typeof iter !== 'string' || !(iter instanceof Mewlix.MewlixStack)) {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Expected 'rainable' value; received "${iter}"!`);
  }
  return rainable;
}

// Watch/Pounce: Generate 'error box'.
Mewlix.pounceError = function pounceError(error) {
  const errorCode = (error instanceof Mewlix.MewlixError)
    ? error.code 
    : Mewlix.ErrorCode.ExternalError;
  return new Mewlix.MewlixBox([
    [ "name" , errorCode.name ],
    [ "id"   , errorCode.id   ]
  ]);
}

// Assert: Self-explanatory, inspired by C's assert() macro.
Mewlix.assert = function assert(expr, message) {
  if (Mewlix.Op.toBool(expr)) return;
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CatOnComputer,
    `Assertion failed: ${message}`);
}

// -----------------------------------------------------
// Deepcopying Utils
// -----------------------------------------------------
Mewlix.deepcopyShelf = function deepcopyShelf(shelf) {
  const copy = shelf.toArray().map(x => Mewlix.deepcopy(x));
  return Mewlix.MewlixStack.fromArray(copy);
};

Mewlix.deepcopyBox = function deepcopyBox(box) {
  if (box instanceof Mewlix.MewlixClowder && deepcopy in box) {
    return box.deepcopy();
  }
  const copy = Object.entries(box).map(
    ([key, value]) => [key, Mewlix.deepcopy(value)]
  );
  return Mewlix.MewlixBox(copy);
};

Mewlix.deepcopy = function deepcopy(value) {
  if (typeof value !== 'object') return value;

  if (value instanceof Mewlix.MewlixStack) { return Mewlix.deepcopyShelf(value); }
  if (value instanceof Mewlix.MewlixBox)   { return Mewlix.deepcopyBox(value);   }

  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    `Invalid object in Mewlix context - object isn't an instance of Mewlix.MewlixBox: ${value}`);
};

// -----------------------------------------------------
// IO:
// -----------------------------------------------------
Mewlix.meow = function meow(_) {
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    "Core function 'Mewlix.meow' hasn't been implemented!");
}

Mewlix.listen = function listen(_) {
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
    "Core function 'Mewlix.listen' hasn't been implemented!");
}


// -------------------------------------------------------
// Base library.
// -------------------------------------------------------

/* Note: The functions in the base library use snake-case intentionally.
 * They're visible in Mewlix, and I don't want to do name-mangling. */

Mewlix.Base = {
  /* Converts any value to a string.
   * type: any => string        */
  purr: function purr(value) {
    return Mewlix.purrify(value);
  },

  /* The 'substring' function. Indices are inclusive.
   * type: string, int, int => string */
  tear_apart: function tear_apart(str, start, end) {
    typeCheck(str, 'string'); typeCheck(start, 'number'); typeCheck(end, 'number');
    return str.substring(start, end);
  },

  /* Converts a string to lowercase.
   * type: string => string */
  push_down: function push_down(str) {
    typeCheck(str, 'string');
    return str.toLowerCase();
  },

  /* Converts a string to full upper-case.
   * type: string => string */
  push_up: function push_up(str) {
    typeCheck(str, 'string');
    return str.toUpperCase();
  },

  /* Index into a shelf or string.
   * type: shelf | string, int => shelf | string */
  poke: function poke(value, index = 0) {
    typeCheck(index, 'number');
    if (value instanceof Mewlix.MewlixStack) {
      for (let i = 0; i < index; i++) {
        value = value.pop();
      }
      return value;
    }
    typeCheck(value, 'string');
    return value[index];
  },

  /* Boolean conversion.
   * type: any => boolean */
  nuzzle: function nuzzle(value) {
    return Mewlix.Op.toBool(value);
  },

  /* Number conversion.
   * type: any => number */
  slap: function slap(value) {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.BadConversion,
        `Value cannot be converted to a number: ${value}`);
    }
    return num;
  },

  /* Akin to python's range(). It aims be a little smart:
   * count(3) should give you 0, 1, 2, 3.
   * count(1, 3) should give you 1, 2, 3.
   * count(3, 1) should give you 3, 2, 1.
   *
   * type: int, int => int */
  count: function count(start = 0, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    typeCheck(start, 'number');
    typeCheck(end, 'number');

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
    return Mewlix.MewlixStack.fromArray(array);
  },

  /* Applies callback to each item in the shelf, returning a new shelf.
   * type: shelf, function => shelf */
  map: function map(shelf, callback) {
    typeCheck(callback, 'function');
    stackCheck(shelf);

    let accumulator = [];
    for (const value of shelf) {
      accumulator.push(callback(value));
    }
    return Mewlix.MewlixStack.fromArray(accumulator.reverse());
  },

  /* Filters element in the shelf by a predicate. Returns a new shelf.
   * type: shelf, function => shelf */
  filter: function filter(shelf, predicate) {
    typeCheck(predicate, 'function');
    stackCheck(shelf);

    let accumulator = [];
    for (const value of shelf) {
      if (predicate(value)) {
        accumulator.push(value);
      }
    }
    return Mewlix.MewlixStack.fromArray(accumulator.reverse());
  },

  /* Folds over a shelf.
   * type: shelf, function, any => shelf */
  fold: function fold(shelf, callback, initial) {
    typeCheck(callback, 'function');
    stackCheck(shelf);

    let accumulator = initial;
    for (const value of shelf) {
      accumulator = callback(accumulator, value);
    }
    return accumulator;
  },
};

/* Adding the Math namespace to the Mewlix standard library. */
Mewlix.Base.math = Math;

/* Freezing the base library, as it's going to be accessible inside Mewlix. */
Object.freeze(Mewlix.Base);


// -------------------------------------------------------
// Script Loader 
// -------------------------------------------------------
Mewlix.scriptLoader = function scriptLoader(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.setAttribute('src', src);
    script.addEventListener('load', resolve);
    script.addEventListener('error', reject);

    document.body.appendChild(script);
  });
};

// -------------------------------------------------------
// Final Touches
// -------------------------------------------------------
// Add to globalThis -- make it available globally. This is necessary.
globalThis.Mewlix = Mewlix;
