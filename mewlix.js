const Mewlix = {};

// A custom exception type.
Mewlix.ErrorCode = class ErrorCode {
  static TypeMismatch   = new ErrorCode('TypeMismatch'  , 1);
  static InvalidOp      = new ErrorCode('InvalidOp'     , 2);
  static DivideByZero   = new ErrorCode('DivideByZero'  , 3);
  static InvalidImport  = new ErrorCode('InvalidImport' , 4);
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

// Mewlix's base object class.
Mewlix.MewlixObject = class MewlixObject {
  valueOf() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
  }
};

// A namespace for modules.
Mewlix.Namespace = class Namespace extends Mewlix.MewlixObject {
  constructor(name) {
    super();
    this.name = name;
    this.modules = new Map();
  }

  setName(name) {
    this.name = name;
  }

  addModule(path, func) {
    if (this.modules.has(path)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidImport,
        `Double import: The module "${path}" has already been imported!`);
    }
    this.modules.set(path, func);
  }

  getModule(path) {
    if (!this.modules.has(path)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidImport,
        `The module "${path}" doesn't exist or hasn't been properly loaded!`);
    }
    return this.modules.get(path);
  }
};

// A default namespace for all modules.
Mewlix.Modules = new Mewlix.Namespace('default');

// Mewlix's shelves -- which work like stacks.
Mewlix.MewlixStack = class MewlixStack extends Mewlix.MewlixObject {
  get box() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      "Can't peek properties of a shelf!");
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
  peek() {
    return null;
  }

  pop() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.InvalidOp,
      "Invalid operation: Cannot pop empty stack!");
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

// Mewlix's box class!
Mewlix.MewlixBox = class MewlixBox extends Mewlix.MewlixObject {
  get box() {
    return this;
  }

  constructor(entries = []) {
    super();
    for (const [key, value] of entries) {
      this[key] = value;
    }
  }

  toString() {
    return Mewlix.purrifyObject(this);
  }
};

// Mewlix's clowder base class!
Mewlix.MewlixClowder = class MewlixClowder extends Mewlix.MewlixBox {
  // Empty definition.
  // This class exists mostly to differentiate boxes and clowders.
}

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

// Utility.
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

// Numeric comparisons
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

// Basic operations.
Mewlix.Op = {
  // Arithmetic operations:
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

  // Comparison:
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

  // Boolean operations:
  not: function not(a) {
    return !Mewlix.Op.toBool(a);
  },
  or: function or(a, fb) {
    return toBool(a) ? a : fb();
  },
  and: function and(a, fb) {
    return toBool(a) ? fb() : a;
  },

  // Ternary operator:
  ternary: function ternary(condition, fa, fb) {
    return Mewlix.Op.toBool(condition) ? fa() : fb();
  },

  // Numeric comparison:
  compare: function compare(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    if (a === b) return Mewlix.Comparison.EqualTo;
    return (a < b) ? Mewlix.Comparison.LessThan : Mewlix.Comparison.GreaterThan;
  },

  // Stack operations:
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

  // Miscellaneous operations:
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

  // Reflection:
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

  // Box Operations:
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

// Watch/Pounce: A little wrapper around try/catch.
Mewlix.watchPounce = async function watchPounce(watch, pounce) {
  try {
    await watch();
  }
  catch (error) {
    const errorCode = (error instanceof Mewlix.MewlixError)
      ? error.code 
      : Mewlix.ErrorCode.ExternalError;
    const errorBox = new Mewlix.MewlixBox([
      [ "name" , errorCode.name ],
      [ "id"   , errorCode.id   ]
    ]);
    await pounce(errorBox);
  }
};

// Deep-copying utils.
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


// -------------------------------------------------------
// Base library.
// -------------------------------------------------------

// The functions in the base library use snake-case intentionally.
// It's the standard in Mewlix, after all.

Mewlix.Base = {
  // String conversion.
  purr: function purr(value) {
    return Mewlix.purrify(value);
  },

  // Substring.
  tear_apart: function tear_apart(str, start, end) {
    return Mewlix.purrify(str).substring(start, end);
  },

  // To lower.
  push_down: function push_down(str) {
    return Mewlix.purrify(str).toLowerCase();
  },

  // To upper.
  push_up: function push_up(str) {
    return Mewlix.purrify(str).toUpperCase();
  },

  // String indexing.
  poke_around: function poke_around(str, index = 0) {
    // If (typeof index !== number) this returns undefined.
    // I think that's acceptable behavior...?
    return Mewlix.purrify(str)[index];
  },

  // Boolean conversion.
  nuzzle: function nuzzle(value) {
    return Mewlix.Op.toBool(value);
  },

  // Number conversion.
  slap: function slap(value) {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
        `Value cannot be converted to a number: ${value}`);
    }
    return num;
  },

  // Akin to python's range().
  // count(3) should give you 0, 1, 2, 3.
  // count(1, 3) should give you 1, 2, 3.
  // count(3, 1) should give you 3, 2, 1.
  count: function count(start = 0, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }

    start = Mewlix.Base.slap(start);
    end   = Mewlix.Base.slap(end);

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
};

// Intentionally adding the Math namespace to the Mewlix standard library.
// It's purely a copy by reference.
Mewlix.Base.math = Math;

// Freezing the base library, as it's going to be fully accessible inside
// every Mewlix module. It shouldn't be modifiable.
Object.freeze(Mewlix.Base);

// Add to globalThis -- make it available globally. This is necessary.
globalThis.Mewlix = Mewlix;
