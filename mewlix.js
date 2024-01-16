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
};

/* Mewlix's shelves -- which work like stacks. */
Mewlix.MewlixStack = class MewlixStack extends Mewlix.MewlixObject {
  get box() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
      "Can't assign properties to a shelf!");
  }

  toArray() {
    throw new Mewlix.MewlixError(Mewlix.ErrorCode.CriticalError,
      "The base class MewlixStack doesn't implement the method 'toArray'!");
  }

  toString() {
    return Mewlix.purrifyArray(this.toArray());
  }

  static isEqual(a, b) {
    if (a instanceof Mewlix.StackBottom) return b instanceof Mewlix.StackBottom;
    if (b instanceof Mewlix.StackBottom) return a instanceof Mewlix.StackBottom;

    return Mewlix.Op.equal(a.peek(), b.peek()) && MewlixStack.isEqual(a.pop(), b.pop());
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

  toArray() {
    return [];
  }

  getSize() {
    return 0;
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

  toArray() {
    const arr = this.next.toArray();
    arr.push(this.value);
    return arr;
  }

  getSize() {
    return this.toArray().length;
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
const typeCheck = function typeCheck(value, type) {
  if (typeof value === type) return;
  throw new Mewlix.MewlixError(Mewlix.ErrorCode.TypeMismatch,
    `Expected value of type ${type}, received ${typeof value}!`);
}

const isNothing = function isNothing(x) {
  return x === null || x === undefined;
}

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
  equal: function equal(a, b) {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);
    return a === b;
  },
}

/* Add to globalThis -- make it available globally. This is necessary. */
globalThis.Mewlix = Mewlix;
