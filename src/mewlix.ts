'use strict';

export type Mewlix = ReturnType<typeof createMewlix> & {
  [key: string]: YarnBall;
};

/* -----------------------------------------------------
 * MewlixValue -> Valid Mewlix values:
 * ----------------------------------------------------- */
export type MewlixValue =
    number
  | string
  | boolean
  | Shelf<MewlixValue>
  | Box
  | Function
  | null
  | undefined;

/* -----------------------------------------------------
 * MewlixError -> Custom error type.
 * ----------------------------------------------------- */
export class ErrorCode {
  name: string;
  id: number;

  static TypeMismatch       = new ErrorCode('TypeMismatch'      , 0);
  static InvalidOperation   = new ErrorCode('InvalidOperation'  , 1);
  static InvalidConversion  = new ErrorCode('InvalidConversion' , 2);
  static CatOnComputer      = new ErrorCode('CatOnComputer'     , 3);
  static Console            = new ErrorCode('Console'           , 4);
  static Graphic            = new ErrorCode('Graphic'           , 5);
  static InvalidImport      = new ErrorCode('InvalidImport'     , 6);
  static CriticalError      = new ErrorCode('CriticalError'     , 7);
  static ExternalError      = new ErrorCode('ExternalError'     , 8);

  constructor(name: string, id: number) {
    this.name = name;
    this.id = id;
  }

  valueOf(): number {
    return this.id;
  }

  isEqual(x: ErrorCode): boolean {
    return x.valueOf() === this.valueOf();
  }

  makeMessage(str: string) {
    return `[${this.name}] ${str}`
  }
};

export class MewlixError extends Error {
  name: string;
  code: ErrorCode;

  constructor(errorCode: ErrorCode, message: string) {
    super(errorCode.makeMessage(message));
    this.name = this.constructor.name;
    this.code = errorCode;
  }
}

/* -----------------------------------------------------
 * String utils.
 * ----------------------------------------------------- */
export function purrify(value: MewlixValue): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) {
    return 'nothing';
  }
  switch (typeof value) {
    case 'function': return '<function>';
    default: return value.toString();
  }
};

function purrifyItem(value: MewlixValue): string {
  if (typeof value === 'string') return JSON.stringify(value);
  return purrify(value);
};

function purrifyArray(array: MewlixValue[]): string {
  const items = array.map(purrifyItem).join(', ');
  return `[${items}]`;
};

function purrifyObject(object: Box): string {
  const pairs = getEntries(object).map(
    ([key, value]) => `${key}: ${purrifyItem(value)}`
  ).join(', ');
  return `=^-x-^= [ ${pairs} ]`;
}

/* -----------------------------------------------------
 * Object utils:
 * ----------------------------------------------------- */
type StringIndexable = {
  [key: string]: any;
};

function getEntries(source: StringIndexable): [string, any][] {
  const entries: [string, any][] = [];
  for (const key in source) {
    entries.push([key, source[key]]);
  }
  return entries;
}

/* -----------------------------------------------------
 * MewlixObject -> Base object class.
 * ----------------------------------------------------- */
export class MewlixObject {
  valueOf(): any {
    throw new MewlixError(ErrorCode.TypeMismatch,
      `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
  }
};

/* -----------------------------------------------------
 * Shelf -> Stack-like persistent data structure.
 * ----------------------------------------------------- */
export class Shelf<T> extends MewlixObject {
  constructor() {
    super();
  }

  box() {
    throw new MewlixError(ErrorCode.TypeMismatch,
      "Can't access properties in a value of type 'shelf'!");
  }

  peek(): T | null {
    throw new MewlixError(ErrorCode.CriticalError,
      `Class ${this.constructor.name} doesn't implement method 'peek'!`);
  }

  pop(): Shelf<T> {
    throw new MewlixError(ErrorCode.CriticalError,
      `Class ${this.constructor.name} doesn't implement method 'pop'!`);
  }

  push(value: T): ShelfNode<T> {
    return new ShelfNode(value, this);
  }

  length(): number {
    throw new MewlixError(ErrorCode.CriticalError,
      `Class ${this.constructor.name} doesn't implement method 'length'!`);
  }

  contains(_: T): boolean {
    throw new MewlixError(ErrorCode.CriticalError,
      `Class ${this.constructor.name} doesn't implement method 'contains'!`);
  }

  toString(): string {
    return purrifyArray(this.toArray() as MewlixValue[]);
  }

  toJSON() {
    return this.toArray();
  }

  *[Symbol.iterator]() {
    let node: Shelf<T> = this;
    while (node instanceof ShelfNode) {
      yield node.peek();
      node = node.pop();
    }
  }

  toArray(): T[] {
    const len = this.length();
    const output = new Array(len);

    let i = len - 1;
    for (const item of this) {
      output[i--] = item;
    }
    return output;
  }

  static isEqual<T extends MewlixValue>(a: Shelf<T>, b: Shelf<T>): boolean {
    if (a instanceof ShelfBottom) return b instanceof ShelfBottom;
    if (b instanceof ShelfBottom) return a instanceof ShelfBottom;

    return Compare.isEqual(a.peek(), b.peek()) && Shelf.isEqual(a.pop(), b.pop());
  }

  static concat<T>(a: Shelf<T>, b: Shelf<T>): Shelf<T> {
    if (a instanceof ShelfBottom) return b;
    if (b instanceof ShelfBottom) return a;

    const bucket = b.toArray();
    let output: Shelf<T> = a;

    for (const item of bucket) {
      output = output.push(item);
    }
    return output;
  }

  static contains<T extends MewlixValue>(shelf: Shelf<T>, value: T): boolean {
    for (const item in shelf) {
      if (Compare.isEqual(value, item)) return true;
    }
    return false;
  }

  static reverse<T>(a: Shelf<T>): Shelf<T> {
    let b = new ShelfBottom<T>();
    for (const value of a) {
      b = b.push(value);
    }
    return b;
  }

  static fromArray<T>(arr: T[]): Shelf<T> {
    return arr.reduce(
      (tail: Shelf<T>, value: T) => new ShelfNode(value, tail),
      new ShelfBottom()
    );
  }
}

export class ShelfNode<T> extends Shelf<T> {
  value: T;
  next: Shelf<T>;
  len: number;

  constructor(value: T, tail: Shelf<T>) {
    super();
    this.value = value;
    this.next  = tail;
    this.len   = tail.length() + 1;
    Object.freeze(this);
  }

  peek(): T | null {
    return this.value;
  }

  pop(): Shelf<T> {
    return this.next;
  }

  length(): number {
    return this.len;
  }
}

class ShelfBottom<T> extends Shelf<T> {
  constructor() {
    super();
    Object.freeze(this);
  }

  peek(): T | null {
    return null;
  }

  pop(): Shelf<T> {
    return this;
  }

  length(): number {
    return 0;
  }

  contains(_: T): boolean {
    return false;
  }

  toArray(): T[] {
    return [];
  }
}

/* -----------------------------------------------------
 * Namespace -> Container for modules.
 * ----------------------------------------------------- */
type ModuleFunction = () => MewlixObject

class Namespace extends MewlixObject {
  name: string;
  modules: Map<string, ModuleFunction>;
  cache: Map<string, MewlixObject>;

  constructor(name: string) {
    super();
    this.name = name;
    this.modules = new Map();
    this.cache = new Map();
  }

  addModule(key: string, func: ModuleFunction): void {
    if (this.modules.has(key)) {
      throw new MewlixError(ErrorCode.InvalidImport,
        `Duplicate key: A module with the key "path" has already been imported!`);
    }
    this.modules.set(key, func);
  }

  getModule(key: string): MewlixObject {
    if (!this.modules.has(key)) {
      throw new MewlixError(ErrorCode.InvalidImport,
        `The module "${key}" doesn't exist or hasn't been properly loaded!`);
    }

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const yarnball = this.modules.get(key)!();
    this.cache.set(key, yarnball);
    return yarnball;
  }

  /* Inject object as a valid Mewlix module.
   * The key should be a non-empty string. */
  injectModule(key: string, object: object): void {
    const wrapped = wrap(object) as MewlixObject;
    this.cache.set(key, wrapped);
    this.modules.set(key, () => wrapped);
  }
};

/* -----------------------------------------------------
 * Box -> A core part of a cat-oriented language.
 * ----------------------------------------------------- */
export class Box extends MewlixObject {
  /* This index signature is needed to guarantee the dynamic behavior of boxes.
   * A sacrifice when writing a dynamic language's base library in a typed language. */
  [key: string]: MewlixValue;

  constructor(entries: [string, MewlixValue][] = []) {
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

  toString(): string {
    return purrifyObject(this);
  }
};

/* -----------------------------------------------------
 * Enum -> Base for all enums.
 * ----------------------------------------------------- */
export class EnumValue extends Box {
  key: string;
  value: number;
  parent: string;

  constructor(key: string, value: number, parent: string) {
    super();
    this.key = key;
    this.value = value;
    this.parent = parent;
  }
  toString(): string {
    return `${this.parent}.${this.key}`;
  }
}

export class Enum extends Box {
  name: string;

  constructor(name: string, keys: string[] = []) {
    super();
    let count = 0;
    for (const key of keys) {
      this[key] = new EnumValue(key, count++, name);
    }
    this.name = name;
  }

  toString(): string {
    const values: any[] = [];
    for (const key in this) {
      values.push(this[key]);
    }
    const enumKeys = values
      .filter(x => x instanceof EnumValue)
      .map(x => `${x.key};`);
    return `cat tree ${this.name}; ${enumKeys.join(' ')} ~meow`;
  }
}

/* -----------------------------------------------------
 * Clowder -> Base for all clowders.
 * ----------------------------------------------------- */
/* The clowder constructor symbol. */
export const wakeSymbol: unique symbol = Symbol('wake');

/* All clowders should inherit from this class.
 * It has a default definition for wake(), too. */
export class Clowder extends Box {
  [key: string | symbol]: MewlixValue;
  [wakeSymbol]: (...args: any[]) => Clowder;

  constructor() {
    super();
    this[wakeSymbol] = (function wake(this: Clowder): Clowder {
      return this;
    }).bind(this);
  }
}

/* -----------------------------------------------------
 * YarnBall -> Yarn ball export list.
 * ----------------------------------------------------- */
export class YarnBall extends MewlixObject {
  key: string;
  [key: string]: MewlixValue;

  constructor(moduleKey: string, exportList: [string, () => MewlixValue][] = []) {
    super();
    this.key = moduleKey;

    for (const [field, func] of exportList) {
      Object.defineProperty(this, field, {
        get: func,
        set() {
          throw new MewlixError(ErrorCode.TypeMismatch,
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
 * Generate standard yarn balls.
 * ----------------------------------------------------- */

/* All the 'as any' castings are a necessary compromise to guarantee dynamic assignment behavior.
 * The sacrifices needed to write the base for a dynamic language in a typed one. */

export function library(libraryKey: string, library: StringIndexable = {}) {
  const yarnball = new YarnBall(libraryKey);
  for (const key in library) {
    yarnball[key] = library[key];
  }
  return yarnball;
};

export function curryLibrary(libraryKey: string, base: YarnBall, library: StringIndexable = {}) {
  const yarnball = new YarnBall(libraryKey);
  // Copy curried functions:
  for (const key in library) {
    yarnball[key] = library[key];
  }
  // Fill in the blanks:
  for (const key in base) {
    if (key in yarnball) continue;
    yarnball[key] = base[key];
  }
  return yarnball;
};

/* -----------------------------------------------------
 * Type Checking
 * ----------------------------------------------------- */
type TypePredicate = (value: any) => boolean

const typecheck = (predicate: TypePredicate, expected: string) => (source: string, value: any) => {
  if (predicate(value)) return;
  const typeOfValue = Reflection.typeOf(value);
  throw new MewlixError(ErrorCode.TypeMismatch,
    `${source}: Expected ${expected}, got ${typeOfValue}: ${value}!`);
};

export const ensure = {
  number:   typecheck(x => typeof x === 'number',   'number' ),
  string:   typecheck(x => typeof x === 'string',   'string' ),
  boolean:  typecheck(x => typeof x === 'boolean',  'boolean'),
  shelf:    typecheck(x => x instanceof Shelf,      'shelf'  ),
  box:      typecheck(x => x instanceof Box,        'box'    ),
  func:     typecheck(x => typeof x === 'function', 'func'   ),
};

/* -----------------------------------------------------
 * Value Utils 
 * ----------------------------------------------------- */
export function isNothing(x: any): boolean {
  return x === null || x === undefined;
};

export function clamp_(value: number, min: number, max: number): number {
  return value < min ? min : (value > max ? max : value);
};

export function opaque(x: Object): void {
  Object.defineProperty(x, 'box', {
    value: () => {
      const typeOfValue = Reflection.typeOf(x);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `Can't peek into object: Object "${x}" (type: ${typeOfValue}) isn't accessible through Mewlix!`);
    },
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/* -----------------------------------------------------
 * JSON utils
 * ----------------------------------------------------- */
export const MewlixFromJSON = {
  fromObject: (object: StringIndexable): Box => {
    return new Box(
      getEntries(object)
        .map(([key, value]) => [key, MewlixFromJSON.fromAny(value)])
    );
  },
  fromArray: (array: any[]): Shelf<any> => {
    return Shelf.fromArray(
      array.map(MewlixFromJSON.fromAny)
    );
  },
  fromAny: (value: any): any => {
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return MewlixFromJSON.fromArray(value);
    }
    return MewlixFromJSON.fromObject(value);
  },
}

/* -----------------------------------------------------
 * Comparison: Enum-like class.
 * ----------------------------------------------------- */
export class Comparison {
  operator: string
  id: number

  static LessThan    = new Comparison('<'  , -1);
  static EqualTo     = new Comparison('==' ,  0);
  static GreaterThan = new Comparison('>'  ,  1);

  constructor(operator: string, id: number) {
    this.operator = operator;
    this.id = id;
  }

  valueOf() {
    return this.id;
  }

  isEqual(x: Comparison) {
    return x.valueOf() === this.valueOf();
  }

  isOneOf(...xs: Comparison[]) {
    return xs.some(x => x.valueOf() === this.valueOf());
  }
};

/* -----------------------------------------------------
 * Basic operations.
 * ----------------------------------------------------- */
export const Numbers = {
  add: function add(a: number, b: number): number {
    ensure.number('+', a);
    ensure.number('+', b);
    return a + b;
  },
  sub: function sub(a: number, b: number): number {
    ensure.number('-', a);
    ensure.number('-', b);
    return a - b;
  },
  mul: function mul(a: number, b: number): number {
    ensure.number('*', a);
    ensure.number('*', b);
    return a * b;
  },
  div: function div(a: number, b: number): number {
    ensure.number('/', a);
    ensure.number('/', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `/: Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  floordiv: function floordiv(a: number, b: number): number {
    ensure.number('//', a);
    ensure.number('//', b);
    if (b == 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `//: Attempted to divide ${a} by ${b}!`);
    }
    return Math.floor(a / b);
  },
  mod: function mod(a: number, b: number): number {
    ensure.number('%', a);
    ensure.number('%', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `%: Attempted to divide ${a} by ${b}!`);
    }
    return ((a % b) + b) % b;
  },
  pow: function pow(a: number, b: number): number {
    ensure.number('^', a);
    ensure.number('^', b);
    return a ** b;
  },
  plus: function plus(a: number): number {
    ensure.number('+', a);
    return +a;
  },
  minus: function minus(a: number): number {
    ensure.number('-', a);
    return -a;
  },
};

export const Booleans = {
  not: function not(a: any): boolean {
    return !Conversion.toBool(a);
  },
  or: function or(a: any, fb: () => any): any {
    return Conversion.toBool(a) ? a : fb();
  },
  and: function and(a: any, fb: () => any): any {
    return Conversion.toBool(a) ? fb() : a;
  },
  ternary: function ternary(condition: any, fa: () => any, fb: () => any): any {
    return Conversion.toBool(condition) ? fa() : fb();
  },
};

export const Compare = {
  isEqual: function isEqual(a: MewlixValue, b: MewlixValue): boolean {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (a instanceof Shelf && b instanceof Shelf) {
      return Shelf.isEqual(a, b);
    }
    return a === b;
  },

  // -- Numeric comparison:
  compare: function compare(a: MewlixValue, b: MewlixValue): Comparison {
    if (typeof a !== typeof b) {
      const typeofA = Reflection.typeOf(a);
      const typeofB = Reflection.typeOf(b);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `compare: Cannot compare values of different types: "${typeofA}" and "${typeofB}"!`);
    }

    switch (typeof a) {
      case 'number':
      case 'string':
      case 'boolean':
        if (a === b) return Comparison.EqualTo;
        return (a < b!) ? Comparison.LessThan : Comparison.GreaterThan;
      default:
        break;
    }

    const typeOfValue = Reflection.typeOf(a);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `compare: Cannot compare values of type "${typeOfValue}"!`);
  },
};

export const Strings = {
  concat: function concat(a: MewlixValue, b: MewlixValue): string {
    return purrify(a) + purrify(b);
  },
};

export const Shelves = {
  peek: function peek<T>(shelf: Shelf<T>): T | null {
    ensure.shelf('paw at', shelf);
    return shelf.peek();
  },
  pop: function pop<T>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('knock over', shelf);
    return shelf.pop();
  },
  push: function push<T>(value: T, shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('push', shelf);
    return shelf.push(value);
  },
  length: function length<T>(value: Shelf<T> | string): number {
    if (value instanceof Shelf) return value.length();
    if (typeof value === 'string') return value.length;

    const typeOfValue = Reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `...?: Can't calculate length for value of type "${typeOfValue}": ${value}`);
  },
  contains: function contains<T>(a: T, b: Shelf<T> | Box | string): boolean {
    if (b instanceof Shelf) { return b.contains(a); }

    if (typeof a !== 'string') {
      const typeOfA = Reflection.typeOf(a);
      const typeOfB = Reflection.typeOf(b);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `in: Expected string for lookup in "${typeOfB}"; got "${typeOfA}": ${a}`);
    }

    if (typeof b === 'string') { return b.includes(a); }
    if (b instanceof Box) { return a in b; }

    const typeOfB = Reflection.typeOf(b);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `in: Cannot perform lookup in value of type "${typeOfB}": ${b}`);
  },
};

export const Reflection = {
  typeOf: function typeOf(value: any): string {
    if (value instanceof Shelf) return 'shelf';
    if (value instanceof Box) return 'box';
    if (value instanceof YarnBall) return 'yarn ball';
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

  instanceOf: function instanceOf(a: Box, b: Function): boolean {
    ensure.box('is', a);
    return a instanceof b;
  },
};

export const Boxes = {
  pairs: function pairs(value: Box): Shelf<Box> {
    ensure.box('claw at', value);
    return Shelf.fromArray(getEntries(value).map(
      ([key, value]) => new Box([["key", key], ["value", value]])
    ));
  },
};

export const Conversion = {
  toBool: function toBool(x: MewlixValue): boolean {
    switch (typeof x) {
      case 'object'   : return x !== null;
      case 'boolean'  : return x;
      case 'undefined': return false;
      default         : return true;
    }
  },
  toNumber: function toNumber(x: MewlixValue): number {
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
    throw new MewlixError(ErrorCode.InvalidConversion,
      `Value cannot be converted to a number: ${x}`);
  }
};

/* -----------------------------------------------------
 * Statement built-ins
 * ----------------------------------------------------- */
const Internal = {
  canChase: function canChase(value: MewlixValue): MewlixValue {
    if (typeof value === 'string' || value instanceof Shelf) {
      return value;
    }
    const typeOfValue = Reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `Expected string or shelf; received value of type '${typeOfValue}': ${value}`);
  },
  pounceError: function pounceError(error: Error) {
    const errorCode: ErrorCode = (error instanceof MewlixError)
      ? error.code 
      : ErrorCode.ExternalError;
    return new Box([
      [ "name"    , errorCode.name ],
      [ "id"      , errorCode.id   ],
      [ "message" , error.message ? purrify(error.message) : null ],
    ]);
  },
  assert: function assert(expr: MewlixValue, message: string) {
    if (Conversion.toBool(expr)) return;
    throw new MewlixError(ErrorCode.CatOnComputer,
      `Assertion failed: ${message}`);
  }
};

/* -----------------------------------------------------
 * IO:
 * ----------------------------------------------------- */
function meow(_: string) {
  throw new MewlixError(ErrorCode.CriticalError,
    "Core function 'Mewlix.meow' hasn't been implemented!");
};

/* -----------------------------------------------------
 * API:
 * ----------------------------------------------------- */
export class BoxWrapper extends MewlixObject {
  constructor(object: object) {
    super();
    Object.defineProperty(this, 'box', {
      value: () => object,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  // Enforcing dynamic behavior through the type system is hard.
  // Ungraceful casts, but alas! They only happen here.
  toString(): string {
    return (this as any).box().toString();
  }
  valueOf(): Object {
    return (this as any).box().valueOf();
  }
};

export function wrap(object: object) {
  if (typeof object !== 'object') {
    throw new MewlixError(ErrorCode.InvalidImport,
      `Special import "${object}" isn't an object!`);
  }
  if (object instanceof YarnBall) {
    return object;
  }
  return new BoxWrapper(object);
};

const createMewlix = function() {
  /* -----------------------------------------------------
   * Modules -> Default module container.
   * ----------------------------------------------------- */
  const Modules = new Namespace('default');

  const API = {
    arrayToShelf: Shelf.fromArray,
    shelf: (...items: MewlixValue[]) => Shelf.fromArray(items),
    createBox: (object: StringIndexable) => new Box(getEntries(object ?? {})),
    inject: (key: string, object: StringIndexable) => Modules.injectModule(key, object),
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

  const Base = {
    purr: function purr(value: MewlixValue): string {
      return purrify(value);
    },

    cat: function cat(shelf: Shelf<string>): string {
      let acc = '';
      for (const value of shelf) {
        acc = purrify(value) + acc;
      }
      return acc;
    },

    trim: function trim(str: string): string {
      ensure.string('std.trim', str)
      return str.trim();
    },

    tear: function tear(str: string, start: number, end: number): string {
      ensure.string('std.tear', str);
      ensure.number('std.tear', start);
      ensure.number('std.tear', end);

      return str.substring(start, end);
    },

    push_down: function push_down(str: string): string {
      ensure.string('std.push_down', str);
      return str.toLowerCase();
    },

    push_up: function push_up(str: string): string {
      ensure.string('std.push_up', str);
      return str.toUpperCase();
    },

    poke: function poke<T>(value: string | Shelf<T>, index: number = 0): T | string | null {
      ensure.number('std.poke', index);

      if (typeof value === 'string') {
        if (index < 0) {
          index = Math.max(0, value.length + index);
        }
        return value[index];
      }

      if (value instanceof Shelf) {
        if (index < 0) {
          index = Math.max(0, value.length() + index);
        }
        for (let i = 0; i < index; i++) {
          value = value?.pop();
        }
        return value?.peek();
      }

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.join: Can't index into value of type "${typeOfValue}": ${value}`);
    },

    char: function char(value: number): string {
      ensure.number('std.char', value);
      if (value < 0 || value > 65535) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.char: Value outside of valid character range: ${value}`);
      }
      return String.fromCharCode(value);
    },

    bap: function bap(value: string): number {
      ensure.string('std.bap', value);
      if (value.length === 0) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          'std.bap: Expected character; received empty string!');
      }

      const code = value.charCodeAt(0);
      if (code < 0 || code > 65535) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.bap: Character code out of valid range: '${code}'`);
      }
      return code;
    },

    nuzzle: function nuzzle(value: MewlixValue): boolean {
      return Conversion.toBool(value);
    },

    empty: function empty<T>(value: string | Shelf<T>): boolean {
      if (typeof value === 'string') return value === '';
      if (value instanceof Shelf) return value instanceof ShelfBottom;

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.empty: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
    },

    join: function join<T1, T2 extends string | Shelf<T1>>(a: T2, b: T2) {
      if (typeof a === 'string' && typeof b === 'string') {
        return a + b;
      }
      if (a instanceof Shelf && b instanceof Shelf) {
        return Shelf.concat(a, b);
      }
      const typeofA = Reflection.typeOf(a);
      const typeofB = Reflection.typeOf(b);
      throw new MewlixError(ErrorCode.TypeMismatch,
          `std.join: Values of type '${typeofA}' and '${typeofB}' can't be concatenated!`);
    },

    take: function take<T1, T2 extends string | Shelf<T1>>(value: T2, amount: number) {
      ensure.number('std.take', amount);

      if (typeof value === 'string') return value.slice(0, amount);
      if (value instanceof Shelf) {
        const len = Math.min(value.length(), amount);
        const output = new Array(len);

        let counter = amount;
        let i = len - 1;
        for (const item of value) {
          if (counter-- <= 0) break;
          output[i--] = item;
        }
        return Shelf.fromArray(output);
      }

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.take: Can't perform 'take' operation on value of type "${typeOfValue}": ${value}`);
    },

    drop: function drop<T1, T2 extends string | Shelf<T1>>(value: T2, amount: number) {
      ensure.number('std.drop', amount);

      if (typeof value === 'string') return value.slice(amount);
      if (value instanceof Shelf) {
        let output: Shelf<T1> = value;
        for (let i = amount; i > 0; i--) {
          output = output?.pop();
        }
        return output ?? new ShelfBottom<T1>();
      }

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.drop: Can't perform 'drop' operation on value of type "${typeOfValue}": ${value}`);
    },

    reverse: function reverse<T1, T2 extends string | Shelf<T1>>(value: T2) {
      if (typeof value === 'string') return [...value].reverse().join('');
      if (value instanceof Shelf) return Shelf.reverse(value);

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
    },
    
    sort: function sort<T extends MewlixValue>(shelf: Shelf<T>): Shelf<T> {
      ensure.shelf('std.sort', shelf);
      return Shelf.fromArray(shelf
        .toArray()
        .sort((a, b) => Compare.compare(a, b).id)
      );
    },

    shuffle: function shuffle<T>(shelf: Shelf<T>): Shelf<T> {
      ensure.shelf('std.shuffle', shelf);
      const output = shelf.toArray();

      for (let i = output.length - 1; i > 0; i--) {
        const j = Base.random_int(0, i);

        const temp = output[i];
        output[i] = output[j];
        output[j] = temp;
      }
      return Shelf.fromArray(output);
    },

    insert: function insert<T>(shelf: Shelf<T>, value: T, index: number = 0): Shelf<T> {
      ensure.shelf('std.insert', shelf);
      ensure.number('std.insert', index);

      let top = new ShelfBottom<T>();
      let bottom = shelf;
      let counter = (index >= 0) ? index : (shelf.length() + index + 1);

      while (counter-- > 0 && bottom instanceof ShelfNode) {
        top = top.push(bottom.peek());
        bottom = bottom.pop();
      }

      bottom = bottom.push(value);

      for (const item of top) {
        bottom = bottom.push(item);
      }
      return bottom;
    },

    remove: function remove<T>(shelf: Shelf<T>, index: number = 0): Shelf<T> {
      ensure.shelf('std.remove', shelf);
      ensure.number('std.remove', index);

      let top = new ShelfBottom<T>();
      let bottom = shelf;
      let counter = (index >= 0) ? index : (shelf.length() + index);

      while (counter-- > 0 && bottom instanceof ShelfNode) {
        top = top.push(bottom.peek());
        bottom = bottom.pop();
      }

      bottom = bottom.pop();

      for (const item of top) {
        bottom = bottom.push(item);
      }
      return bottom;
    },

    map: function map<T1, T2>(callback: (x: T1) => T2, shelf: Shelf<T1>): Shelf<T2> {
      ensure.func('std.map', callback);
      ensure.shelf('std.map', shelf);

      const output = new Array(shelf.length());

      let i = shelf.length() - 1;
      for (const value of shelf) {
        output[i--] = callback(value);
      }
      return Shelf.fromArray(output);
    },

    filter: function filter<T1>(predicate: (x: T1) => boolean, shelf: Shelf<T1>): Shelf<T1> {
      ensure.func('std.filter', predicate);
      ensure.shelf('std.filter', shelf);

      let bucket = new ShelfBottom<T1>();

      for (const value of shelf) {
        if (predicate(value)) {
          bucket = bucket.push(value);
        }
      }
      return Shelf.reverse(bucket);
    },

    fold: function fold<T1, T2>(callback: (acc: T2, x: T1) => T2, initial: T2, shelf: Shelf<T1>) {
      ensure.func('std.fold', callback);
      ensure.shelf('std.fold', shelf);

      let accumulator: T2 = initial;
      for (const value of shelf) {
        accumulator = callback(accumulator, value);
      }
      return accumulator;
    },

    any: function any<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
      ensure.func('std.any', predicate);
      ensure.shelf('std.any', shelf);
      for (const value of shelf) {
        if (predicate(value)) { return true; }
      }
      return false;
    },

    all: function all<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
      ensure.func('std.all', predicate);
      ensure.shelf('std.all', shelf);
      for (const value of shelf) {
        if (!(predicate(value))) { return false; }
      }
      return true;
    },

    zip: function zip<T1, T2>(a: Shelf<T1>, b: Shelf<T2>): Shelf<Box> {
      ensure.shelf('std.zip', a);
      ensure.shelf('std.zip', b);

      const length = Math.min(a.length(), b.length());
      const output = new Array(length);

      let i = length - 1;
      while (a instanceof ShelfNode && b instanceof ShelfNode) {
        output[i--] = new Box([
          ["first",  a.peek()],
          ["second", b.peek()],
        ]);
        a = a.pop();
        b = b.pop();
      }
      return Shelf.fromArray(output);
    },

    repeat: function repeat(number: number, callback: (i?: number) => void): void {
      ensure.number('std.repeat', number);
      ensure.func('std.repeat', callback);
      for (let i = 0; i < number; i++) {
        callback(i);
      }
    },

    foreach: function foreach<T>(callback: (x: T) => void, shelf: Shelf<T>): void {
      ensure.func('std.foreach', callback);
      ensure.shelf('std.foreach', shelf);
      for (const value of shelf) {
        callback(value);
      }
    },

    tuple: function tuple(a: MewlixValue, b: MewlixValue) {
      return new Box([
        ["first",  a],
        ["second", b],
      ]);
    },

    table: function(): Box {
      const table = new Map<MewlixValue, MewlixValue>();
      const box: Box = new Box([
        ["add", (key: MewlixValue, value: MewlixValue) => {
          table.set(key, value);
          return box;
        }],
        ["has", (key: MewlixValue) => {
          return table.has(key);
        }],
        ["get", (key: MewlixValue) => {
          return table.get(key);
        }],
        ["remove", (key: MewlixValue) => {
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
      const set = new Set<MewlixValue>();
      const box: Box = new Box([
        ["add", (value: MewlixValue) => {
          set.add(value);
          return box;
        }],
        ["has", (value: MewlixValue) => {
          return set.has(value);
        }],
        ["remove", (value: MewlixValue) => {
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

    slap: function slap(value: MewlixValue): number {
      return Conversion.toNumber(value);
    },

    round: function round(value: number): number {
      ensure.number('std.round', value);
      return Math.round(value);
    },

    floor: function floor(value: number): number {
      ensure.number('std.floor', value);
      return Math.floor(value);
    },

    ceiling: function ceiling(value: number): number {
      ensure.number('std.ceiling', value);
      return Math.ceil(value);
    },

    min: function min(a: number, b: number): number {
      ensure.number('std.min', a);
      ensure.number('std.min', b);
      return Math.min(a, b);
    },

    max: function max(a: number, b: number): number {
      ensure.number('std.max', a);
      ensure.number('std.max', b);
      return Math.max(a, b);
    },

    clamp: function clamp(value: number, min: number, max: number): number {
      ensure.number('std.clamp', value);
      ensure.number('std.clamp', min);
      ensure.number('std.clamp', max);

      return clamp_(value, min, max);
    },

    abs: function abs(value: number): number {
      ensure.number('std.abs', value);
      return Math.abs(value);
    },

    pi: Math.PI,
    e: Math.E,

    sqrt: function sqrt(value: number): number {
      ensure.number('std.sqrt', value);
      if (value < 0) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.sqrt: Cannot calculate square root of negative number ${value}!`);
      }
      return Math.sqrt(value);
    },

    logn: function logn(value: number, base: number): number {
      ensure.number('std.logn', value);
      if (value <= 0) {
        const logType = isNothing(base)
          ? 'natural logarithm'
          : `logarithm to base ${base}`;
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.logn: Cannot calculate ${logType} of ${value}!`);
      }
      if (base === undefined) {
        return Math.log(value);
      }
      ensure.number('std.logn', base);
      if (base <= 0) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.logn: Invalid base for logarithm: ${base}!`);
      }
      return Math.log(value) / Math.log(base);
    },

    acos: function acos(value: number): number {
      ensure.number('std.acos', value);
      return Math.acos(value);
    },

    asin: function asin(value: number): number {
      ensure.number('std.asin', value);
      return Math.asin(value);
    },

    atan: function atan(value: number): number {
      ensure.number('std.atan', value);
      return Math.atan(value);
    },

    cos: function cos(value: number): number {
      ensure.number('std.cos', value);
      return Math.cos(value);
    },

    sin: function sin(value: number): number {
      ensure.number('std.sin', value);
      return Math.sin(value);
    },

    tan: function tan(value: number): number {
      ensure.number('std.tan', value);
      return Math.tan(value);
    },

    atan2: function atan2(y: number, x: number): number {
      ensure.number('std.atan2', y);
      ensure.number('std.atan2', x);
      return Math.atan2(y, x);
    },

    truncate: function truncate(value: number, places: number = 0): number {
      ensure.number('std.truncate', value);
      ensure.number('std.truncate', places);
      if (places < 0) {
        throw new MewlixError(ErrorCode.InvalidOperation,
          `std.truncate: Value of places should be greater than 0; received ${places}`);
      }
      const modifier = 10 ** places;
      return Math.trunc(value * modifier) / modifier;
    },

    random: function random() {
      return Math.random();
    },

    random_int: function random_int(min: number, max: number): number {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      ensure.number('std.random_int', min);
      ensure.number('std.random_int', max);
      return Math.floor(Math.random() * (max - min + 1) + min);
    },

    count: function count(start: number = 0, end: number): Shelf<number> {
      if (end === undefined) {
        end = start;
        start = 0;
      }
      ensure.number('std.count', start);
      ensure.number('std.count', end);

      start = Math.floor(start);
      end   = Math.floor(end);
      
      const step = (start < end) ? 1 : -1;
      const stop = start - step;

      let output = new ShelfBottom<number>();

      for (let i = end; i != stop; i -= step) {
        output = output.push(i);
      }
      return output;
    },

    read: function read(key: string): string | null {
      ensure.string('std.read', key);
      return localStorage.getItem(key);
    },

    save: function save(key: string, contents: string): void {
      ensure.string('std.save', key);
      ensure.string('std.save', contents);
      localStorage.setItem(key, contents);
    },

    date: function date(): Box {
      const now = new Date();
      return new Box([
        [ "day"    , now.getDay() + 1   ],
        [ "month"  , now.getMonth() + 1 ],
        [ "year"   , now.getFullYear()  ],
        [ "hours"  , now.getHours(),    ],
        [ "minutes", now.getMinutes()   ],
        [ "seconds", now.getSeconds()   ],
      ]);
    },

    time: function time(): number {
      return Date.now();
    },

    meowf: function meowf(value: MewlixValue): void {
      return meow(purrify(value));
    },

    to_json: function to_json(value: MewlixValue): string {
      return JSON.stringify(value);
    },

    from_json: function from_json(value: string): MewlixValue {
      ensure.string('std.from_json', value);
      return MewlixFromJSON.fromAny(JSON.parse(value));
    },

    log: function log(value: MewlixValue): void {
      const message = purrify(value);
      console?.log(`[Mewlix] ${message}`);
    },

    error: new Box([
      ErrorCode.TypeMismatch,
      ErrorCode.InvalidOperation,
      ErrorCode.InvalidConversion,
      ErrorCode.CatOnComputer,
      ErrorCode.Console,
      ErrorCode.Graphic,
      ErrorCode.InvalidImport,
      ErrorCode.CriticalError,
      ErrorCode.ExternalError,
    ].map(x => [x.name, x.id])),
  };
  const BaseLibrary = library('std', Base);

  /* Freezing the base library, as it's going to be accessible inside Mewlix. */
  Object.freeze(BaseLibrary);

  /* ------------------------------------------
   * Standard Library - Currying
   * ------------------------------------------ */
  const BaseCurry = (() => {
    const std = Base;

    return {
      tear: (str: string) =>
        (start: number) =>
          (end: number) =>
            std.tear(str, start, end),

      poke: <T>(value: string | Shelf<T>) =>
        (index: number) =>
          std.poke(value, index),

      join: <T>(a: string | Shelf<T>) =>
        (b: string | Shelf<T>) =>
          std.join(a, b),

      take: <T>(value: string | Shelf<T>) =>
        (amount: number) =>
          std.take(value, amount),

      drop: <T>(value: string | Shelf<T>) =>
        (amount: number) =>
          std.drop(value, amount),

      insert: <T>(shelf: Shelf<T>) =>
        (value: T) =>
          (index: number) =>
            std.insert(shelf, value, index),

      remove: <T>(shelf: Shelf<T>) =>
        (index: number) =>
            std.remove(shelf, index),

      map: <T1, T2>(callback: (x: T1) => T2) =>
          (shelf: Shelf<T1>) =>
            std.map(callback, shelf),

      filter: <T1>(predicate: (x: T1) => boolean) =>
        (shelf: Shelf<T1>) =>
          std.filter(predicate, shelf),

      fold: <T1, T2>(callback: (acc: T2, x: T1) => T2) =>
        (initial: T2) =>
          (shelf: Shelf<T1>) =>
            std.fold(callback, initial, shelf),

      any: <T>(predicate: (x: T) => boolean) =>
        (shelf: Shelf<T>) =>
          std.any(predicate, shelf),

      all: <T>(predicate: (x: T) => boolean) =>
        (shelf: Shelf<T>) =>
          std.all(predicate, shelf),

      zip: <T1, T2>(a: Shelf<T1>) =>
        (b: Shelf<T2>) =>
          std.zip(a, b),

      repeat: (number: number) =>
        (callback: (i?: number) => void) =>
          std.repeat(number, callback),

      foreach: <T>(callback: (x: T) => void) =>
        (shelf: Shelf<T>) =>
          std.foreach(callback, shelf),

      tuple: (a: MewlixValue) =>
        (b: MewlixValue) =>
          std.tuple(a, b),

      min: (a: number) =>
        (b: number) =>
          std.min(a, b),

      max: (a: number) =>
        (b: number) =>
          std.max(a, b),

      clamp: (value: number) =>
        (min: number) =>
          (max: number) =>
            std.clamp(value, min, max),

      logn: (value: number) =>
        (base: number) =>
          std.logn(value, base),

      atan: (y: number) =>
        (x: number) =>
          std.atan2(y, x),

      truncate: (value: number) =>
        (places: number) =>
          std.truncate(value, places),

      random_int: (min: number) =>
        (max: number) =>
          std.random_int(min, max),

      count: (start: number) =>
        (end: number) =>
          std.count(start, end),

      save: (key: string) =>
        (contents: string) =>
          std.save(key, contents),
    };
  })();
  const BaseCurryLibrary = curryLibrary('std.curry', BaseLibrary, BaseCurry);

  /* Freezing the curry library, as it's going to be accessible inside Mewlix. */
  Object.freeze(BaseCurryLibrary);

  /* -------------------------------------------------------
   * Final Touches
   * ------------------------------------------------------- */
  /* A default implementation for the 'run' entrypoint function.
   * The console and graphic templates override this implementation.
   *
   * It should *always* be awaited, as it's expected to be asynchronous. */
  const run = async (func: () => YarnBall): Promise<YarnBall> => func();

  /* ------------------------------------------------------
   * Return Mewlix Namespace
   * ------------------------------------------------------ */
  return {
    ErrorCode: ErrorCode,
    MewlixError: MewlixError,
    purrify: purrify,
    purrifyItem: purrifyItem,
    purrifyArray: purrifyArray,
    purrifyObject: purrifyObject,
    MewlixObject: MewlixObject,
    Namespace: Namespace,
    Modules: Modules,
    Shelf: Shelf,
    ShelfNode: ShelfNode,
    ShelfBottom: ShelfBottom,
    Box: Box,
    Enum: Enum,
    wake: wakeSymbol,
    Clowder: Clowder,
    YarnBall: YarnBall,
    library: library,
    curryLibrary: curryLibrary,
    ensure: ensure,
    isNothing: isNothing,
    clamp: clamp_,
    opaque: opaque,
    JSON: MewlixFromJSON,
    Comparison: Comparison,
    Numbers: Numbers,
    Boolean: Booleans,
    Compare: Compare,
    Strings: Strings,
    Shelves: Shelves,
    Reflection: Reflection,
    Boxes: Boxes,
    Conversion: Conversion,
    Internal: Internal,
    meow: meow,
    BoxWrapper: BoxWrapper,
    wrap: wrap,
    API: API,
    Base: BaseLibrary,
    BaseCurry: BaseCurryLibrary, 
    run: run,
  };
}

export default createMewlix;
