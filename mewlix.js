const Mewlix = {};

/* A custom exception type. */
Mewlix.ErrorCode = class ErrorCode {
  static TypeMismatch   = new ErrorCode('TypeMismatch'  , 0);
  static InvalidOp      = new ErrorCode('InvalidOp'     , 1);
  static DivideByZero   = new ErrorCode('DivideByZero'  , 2);
  static CriticalError  = new ErrorCode('CriticalError' , 9);

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
  }
}

/* Mewlix's base object class. */
Mewlix.MewlixObject = class MewlixObject {
  get box() {
    return this;
  }

  valueOf() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
  }
};

/* Mewlix's shelves -- which work like stacks. */
Mewlix.MewlixStack = class MewlixStack extends Mewlix.MewlixObject {
  get box() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      "Can't peek properties of a shelf!");
  }

  toString() {
    return Mewlix.purrifyArray(this.toArray());
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

/* Mewlix's box class! */
Mewlix.MewlixBox = class MewlixBox extends Mewlix.MewlixObject {
  toString() {
    return purrifyObject(this);
  }
};

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

Mewlix.purrify = function purrify(obj) {
  if (obj === null || obj === undefined) {
    return 'nothing';
  }
  return obj.toString();
};

/* Utility. */
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

/* Numeric comparisons */
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

  isOneOf(xs) {
    return xs.some(x => x.valueOf() === this.valueOf());
  }
};

/* Basic operations. */
Mewlix.Op = {
  /* Arithmetic operations: */
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

  /* Comparison: */
  isEqual: function isEqual(a, b) {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (a instanceof Mewlix.MewlixStack || b instanceof Mewlix.MewlixStack) {
      return Mewlix.MewlixStack.isEqual(a, b);
    }
    return a === b;
  },

  /* Conversion: */
  toBool: function toBool(x) {
    if (x instanceof Mewlix.MewlixStack) return !(x instanceof Mewlix.StackBottom);
    switch (typeof x) {
      case 'object'   : return x !== null;
      case 'boolean'  : return x;
      case 'undefined': return false;
      default         : return true;
    }
  },

  /* Boolean operations: */
  not: function not(a) {
    return !Mewlix.Op.toBool(a);
  },
  or: function or(fa, fb) {
    const a = fa();
    return toBool(a) ? a : fb();
  },
  and: function and(fa, fb) {
    const a = fa();
    return toBool(a) ? fb() : a;
  },

  /* Numeric comparison: */
  compare: function compare(a, b) {
    typeCheck(a, 'number');
    typeCheck(b, 'number');
    if (a === b) return Mewlix.Comparison.EqualTo;
    return (a < b) ? Mewlix.Comparison.LessThan : Mewlix.Comparison.GreaterThan;
  },

  /* Stack operations: */
  peek: function peek(shelf) {
    stackCheck(shelf);
    return shelf.peek();
  },
  pop: function pop(shelf) {
    stackCheck(shelf);
    return shelf.pop();
  },
  push: function push(value = null, shelf) {
    stackCheck(shelf);
    return shelf.push(value);
  },

  /* Miscellaneous operations: */
  length: function length(value) {
    if (value instanceof Mewlix.MewlixStack) return value.length();
    if (typeof value === 'string') return value.length;
    if (value instanceof Mewlix.MewlixBox) return Object.entries(value).length;

    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      `Can't calculate length for value of type "${typeof value}": ${value}`);
  },

  /* Reflection: */
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
        throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
          `Value of type "${typeof value}" shouldn't be in Mewlix context: ${value}`);
    }
  },
}

/* Add to globalThis -- make it available globally. This is necessary. */
globalThis.Mewlix = Mewlix;
