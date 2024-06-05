'use strict';

export type Mewlix = ReturnType<typeof createMewlix> & {
  [key: string]: YarnBall<any>;
};

/* -----------------------------------------------------
 * MewlixValue -> Valid Mewlix values:
 * ----------------------------------------------------- */
export type MewlixValue =
    number
  | string
  | boolean
  | Shelf<MewlixValue>
  | Box<MewlixValue>
  | MewlixFunction
  | MewlixConstructor
  | null
  | void
  | undefined
  | Promise<void>;

export type MewlixFunction = (...args: any[]) => MewlixValue;
export type MewlixConstructor = new (...args: any[]) => MewlixValue;

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
export function purrify<T>(value: T): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) {
    return 'nothing';
  }
  switch (typeof value) {
    case 'function': return '<function>';
    default: return value.toString();
  }
};

function purrifyItem<T>(value: T): string {
  if (typeof value === 'string') return JSON.stringify(value);
  return purrify(value);
};

function purrifyArray<T>(array: T[]): string {
  const items = array.map(purrifyItem).join(', ');
  return `[${items}]`;
};

function purrifyBox<T>(object: Box<T> | StringIndexable<T>): string {
  const pairs = getEntries(object).map(
    ([key, value]) => `${key}: ${purrifyItem(value)}`
  ).join(', ');
  return `📦 [ ${pairs} ]`;
}

/* -----------------------------------------------------
 * Object utils:
 * ----------------------------------------------------- */
type StringIndexable<T> = {
  [key: string]: T;
};

function getEntries<T>(source: Box<T> | StringIndexable<T>): [string, T][] {
  const target = (source instanceof Box)
    ? source.box()
    : source;

  const entries: [string, T][] = [];
  for (const key in target) {
    entries.push([key, target[key]]);
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
    return purrifyArray(this.toArray());
  }

  toJSON() {
    return this.toArray();
  }

  *[Symbol.iterator](): Iterator<T, void, undefined> {
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

    return compare.isEqual(a.peek(), b.peek()) && Shelf.isEqual(a.pop(), b.pop());
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
      if (compare.isEqual(value, item)) return true;
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
  readonly value: T;
  readonly next: Shelf<T>;
  readonly len: number;

  constructor(value: T, tail: Shelf<T>) {
    super();
    this.value = value;
    this.next  = tail;
    this.len   = tail.length() + 1;
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
type ModuleFunction = () => MewlixObject;

class Namespace extends MewlixObject {
  name: string;
  cache: Map<string, MewlixObject>;
  modules: Map<string, ModuleFunction>;

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

  getModule(key: string): object {
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
    const wrapped = wrap(object);
    this.cache.set(key, wrapped);
    this.modules.set(key, () => wrapped);
  }
};

/* -----------------------------------------------------
 * Box -> A core part of a cat-oriented language.
 * ----------------------------------------------------- */
export type DynamicBox<T> = {
  [key: string]: T;
};

export type GenericBox = DynamicBox<MewlixValue>;

export type BoxLike<T> = {
  box(): T;
};

export class Box<T> extends MewlixObject implements BoxLike<DynamicBox<T>> {
  _box: DynamicBox<T>;
  box() {
    return this._box;
  }

  constructor(entries: [string, T][] = []) {
    super();
    this._box = {};
    for (const [key, value] of entries) {
      this._box[key] = value;
    }
  }

  toString(): string {
    return purrifyBox(this);
  }

  toJSON() {
    return this.box();
  }
};

/* -----------------------------------------------------
 * Cat Tree -> Enum-like structure.
 * ----------------------------------------------------- */
interface CatTreeValueLike {
  key: string;
  value: number;
  parent: string;
};

export class CatTreeValue extends Box<MewlixValue> {
  _box: CatTreeValueLike & GenericBox;
  parent: CatTree;

  box() {
    return this._box;
  }

  constructor(key: string, value: number, parent: CatTree) {
    super();
    this.parent = parent;
    this._box = {
      key: key,
      value: value,
      parent: parent.name,
      prev: (): CatTreeValue | null => {
        if (value - 1 <= 0) return null;
        return parent.values[value - 1];
      },
      next: (): CatTreeValue | null => {
        if (value + 1 >= parent.values.length) return null;
        return parent.values[value+ 1];
      },
    };
  }
  toString(): string {
    return `${this.box().parent}.${this.box().key}`;
  }
}

export class CatTree extends Box<CatTreeValue> {
  name: string;
  values: CatTreeValue[];

  constructor(name: string, keys: string[] = []) {
    super();
    this.name = name;
    this.values = new Array(keys.length);

    let count = 0;
    for (const key of keys) {
      const value = new CatTreeValue(key, count, this);
      this.box()[key]   = value;
      this.box()[count] = value;
      this.values[count++] = value;
    }
  }

  toString(): string {
    const enumKeys = this.values.map(x => `${x.box().key};`);
    return `cat tree ${this.box().name}; ${enumKeys.join(' ')} ~meow`;
  }
}

/* -----------------------------------------------------
 * Clowder -> Base for all clowders.
 * ----------------------------------------------------- */
/* The clowder constructor symbol. */
export const wake: unique symbol = Symbol('wake');

/* All clowders should inherit from this class.
 * It has a default definition for wake(), too. */
export class Clowder<T> extends Box<T> {
  [wake]: (...args: any[]) => Clowder<T>;

  constructor() {
    super();
    this[wake] = () => this;
  }

  toString(): string {
    if (typeof this._box.to_string === 'function') {
      return purrify(this._box.to_string());
    }
    return purrifyBox(this);
  }
}

/* -----------------------------------------------------
 * YarnBall -> Yarn ball export list.
 * ----------------------------------------------------- */
export class YarnBall<T> extends MewlixObject {
  key: string;
  exports: T;

  box() {
    return this.exports;
  }

  constructor(moduleKey: string, exports: T) {
    super();
    this.key = moduleKey;
    this.exports = exports;
  }

  toString() {
    return `<yarn ball '${this.key}'>`
  }

  static create(key: string, exports: [string, MewlixValue][] = []): YarnBall<GenericBox> {
    const yarnball = new YarnBall<GenericBox>(key, {});
    for (const [k, v] of exports) {
      yarnball.box()[k] = v;
    }
    return yarnball;
  }

  static mix<T1, T2>(key: string, a: T1, b: T2): YarnBall<T1 & T2> {
    return new YarnBall(key, {...a, ...b});
  }
}

/* -----------------------------------------------------
 * Type Checking
 * ----------------------------------------------------- */
type TypePredicate = (value: any) => boolean

const typecheck = (predicate: TypePredicate, expected: string) => (source: string, value: any) => {
  if (predicate(value)) return;
  const typeOfValue = reflection.typeOf(value);
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

export function opaque(x: object): void {
  Object.defineProperty(x, 'box', {
    value() {
      const typeOfValue = reflection.typeOf(x);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `Can't peek into object: Object "${x}" (type: ${typeOfValue}) isn't accessible through Mewlix!`);
    },
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/* -----------------------------------------------------
 * JSON Conversion:
 * ----------------------------------------------------- */
type JSONValue =
  | number
  | string
  | boolean
  | null
  | JSONValue[]
  | JSONObject;

type JSONObject = {
  [key: string]: JSONValue;
};

type MewlixJSON =
  | number
  | string
  | boolean
  | null
  | Shelf<MewlixJSON>
  | Box<MewlixJSON>;

export function fromJSON(value: JSONValue): MewlixJSON {
  if (Array.isArray(value)) {
    return Shelf.fromArray(value.map(x => fromJSON(x)));
  }
  if (typeof value === 'object' && value !== null) {
    return new Box(
      getEntries(value)
        .map(([key, value]) => [key, fromJSON(value)])
    );
  }
  return value;
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
export const numbers = {
  add(a: number, b: number): number {
    ensure.number('+', a);
    ensure.number('+', b);
    return a + b;
  },
  sub(a: number, b: number): number {
    ensure.number('-', a);
    ensure.number('-', b);
    return a - b;
  },
  mul(a: number, b: number): number {
    ensure.number('*', a);
    ensure.number('*', b);
    return a * b;
  },
  div(a: number, b: number): number {
    ensure.number('/', a);
    ensure.number('/', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `/: Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  floordiv(a: number, b: number): number {
    ensure.number('//', a);
    ensure.number('//', b);
    if (b == 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `//: Attempted to divide ${a} by ${b}!`);
    }
    return Math.floor(a / b);
  },
  mod(a: number, b: number): number {
    ensure.number('%', a);
    ensure.number('%', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `%: Attempted to divide ${a} by ${b}!`);
    }
    return ((a % b) + b) % b;
  },
  pow(a: number, b: number): number {
    ensure.number('^', a);
    ensure.number('^', b);
    return a ** b;
  },
  plus(a: number): number {
    ensure.number('+', a);
    return +a;
  },
  minus(a: number): number {
    ensure.number('-', a);
    return -a;
  },
};

export const boolean = {
  not(a: any): boolean {
    return !conversion.toBool(a);
  },
  or(a: any, fb: () => any): any {
    return conversion.toBool(a) ? a : fb();
  },
  and(a: any, fb: () => any): any {
    return conversion.toBool(a) ? fb() : a;
  },
  ternary(condition: any, fa: () => any, fb: () => any): any {
    return conversion.toBool(condition) ? fa() : fb();
  },
};

export const compare = {
  isEqual(a: MewlixValue, b: MewlixValue): boolean {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (a instanceof Shelf && b instanceof Shelf) {
      return Shelf.isEqual(a, b);
    }
    return a === b;
  },

  // -- Numeric comparison:
  compare(a: MewlixValue, b: MewlixValue): Comparison {
    if (typeof a !== typeof b) {
      const typeofA = reflection.typeOf(a);
      const typeofB = reflection.typeOf(b);
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

    const typeOfValue = reflection.typeOf(a);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `compare: Cannot compare values of type "${typeOfValue}"!`);
  },
};

export const strings = {
  concat(a: MewlixValue, b: MewlixValue): string {
    return purrify(a) + purrify(b);
  },
};

export const shelves = {
  peek<T>(shelf: Shelf<T>): T | null {
    ensure.shelf('paw at', shelf);
    return shelf.peek();
  },
  pop<T>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('knock over', shelf);
    return shelf.pop();
  },
  push<T>(value: T, shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('push', shelf);
    return shelf.push(value);
  },
  length<T>(value: Shelf<T> | string): number {
    if (value instanceof Shelf) return value.length();
    if (typeof value === 'string') return value.length;

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `...?: Can't calculate length for value of type "${typeOfValue}": ${value}`);
  },
  contains<T1, T2>(a: T1, b: Shelf<T1> | Box<T2> | string): boolean {
    if (b instanceof Shelf) { return b.contains(a); }

    if (typeof a !== 'string') {
      const typeOfA = reflection.typeOf(a);
      const typeOfB = reflection.typeOf(b);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `in: Expected string for lookup in "${typeOfB}"; got "${typeOfA}": ${a}`);
    }

    if (typeof b === 'string') { return b.includes(a); }
    if (b instanceof Box) { return a in b.box(); }

    const typeOfB = reflection.typeOf(b);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `in: Cannot perform lookup in value of type "${typeOfB}": ${b}`);
  },
};

export const reflection = {
  typeOf(value: any): string {
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

  instanceOf<T>(a: Box<T>, b: Function): boolean {
    ensure.box('is', a);
    return a instanceof b;
  },
};

export const boxes = {
  pairs<T>(value: Box<T>): Shelf<Box<string | T>> {
    ensure.box('claw at', value);
    return Shelf.fromArray(getEntries(value).map(
      ([key, value]) => new Box<string | T>([["key", key], ["value", value]])
    ));
  },
};

export const conversion = {
  toBool(x: MewlixValue): boolean {
    switch (typeof x) {
      case 'object'   : return x !== null;
      case 'boolean'  : return x;
      case 'undefined': return false;
      default         : return true;
    }
  },
  toNumber(x: MewlixValue): number {
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
const internal = {
  canChase(value: MewlixValue): MewlixValue {
    if (typeof value === 'string' || value instanceof Shelf) {
      return value;
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `Expected string or shelf; received value of type '${typeOfValue}': ${value}`);
  },
  pounceError(error: Error): Box<string | number | null> {
    const errorCode: ErrorCode = (error instanceof MewlixError)
      ? error.code 
      : ErrorCode.ExternalError;
    return new Box<string | number | null>([
      [ "name"    , errorCode.name ],
      [ "id"      , errorCode.id   ],
      [ "message" , error.message ? purrify(error.message) : null ],
    ]);
  },
  assert(expr: MewlixValue, message: string): void {
    if (conversion.toBool(expr)) return;
    throw new MewlixError(ErrorCode.CatOnComputer,
      `Assertion failed: ${message}`);
  }
};

/* -----------------------------------------------------
 * IO:
 * ----------------------------------------------------- */
export type MeowFunc = (x: string) => string;

/* -----------------------------------------------------
 * API:
 * ----------------------------------------------------- */
export class BoxWrapper<T extends object> extends MewlixObject {
  _box: T;
  box(): T {
    return this._box;
  }
  constructor(object: T) {
    super();
    this._box = object;
  }
  toString(): string {
    return this.box().toString();
  }
  valueOf(): Object {
    return this.box().valueOf();
  }
};

export function wrap<T extends object>(object: T) {
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

  const api = {
    arrayToShelf: Shelf.fromArray,
    shelf: (...items: MewlixValue[]) => Shelf.fromArray(items),
    createBox: <T>(object: StringIndexable<T>) => new Box<T>(getEntries(object ?? {})),
    inject: (key: string, object: object) => Modules.injectModule(key, object),
  };

  /* -----------------------------------------------------
   * IO:
   * ----------------------------------------------------- */

  /* A default implementation for the 'meow' expression: */
  let meowFunc: MeowFunc = function(_) {
    throw new MewlixError(ErrorCode.CriticalError,
      "meow: Core function 'meow' hasn't been implemented!");
  };

  /* A setter for the 'meow' expression: */
  function setMeow(func: MeowFunc): void {
    meowFunc = func;
  }

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

  function purr(value: MewlixValue): string {
    return purrify(value);
  };

  function cat(shelf: Shelf<string>): string {
    let acc = '';
    for (const value of shelf) {
      acc = purrify(value) + acc;
    }
    return acc;
  };

  function trim(str: string): string {
    ensure.string('std.trim', str)
    return str.trim();
  };

  function tear(str: string, start: number, end: number): string {
    ensure.string('std.tear', str);
    ensure.number('std.tear', start);
    ensure.number('std.tear', end);

    return str.substring(start, end);
  };

  function push_down(str: string): string {
    ensure.string('std.push_down', str);
    return str.toLowerCase();
  };

  function push_up(str: string): string {
    ensure.string('std.push_up', str);
    return str.toUpperCase();
  };

  function poke(value: string, index: number): string | null;
  function poke<T>(value: Shelf<T>, index: number): T | null;
  function poke<T>(value: string | Shelf<T>, index: number = 0) {
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

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.join: Can't index into value of type "${typeOfValue}": ${value}`);
  };

  function char(value: number): string {
    ensure.number('std.char', value);
    if (value < 0 || value > 65535) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.char: Value outside of valid character range: ${value}`);
    }
    return String.fromCharCode(value);
  };

  function bap(value: string): number {
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
  };

  function nuzzle(value: MewlixValue): boolean {
    return conversion.toBool(value);
  };

  function empty(value: string): boolean;
  function empty<T>(value: Shelf<T>): boolean;
  function empty<T>(value: string | Shelf<T>): boolean {
    if (typeof value === 'string') return value === '';
    if (value instanceof Shelf) return value instanceof ShelfBottom;

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.empty: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  };

  function join(a: string, b: string): string;
  function join<T>(a: Shelf<T>, b: Shelf<T>): Shelf<T>;
  function join<T>(a: string | Shelf<T>, b: string | Shelf<T>): string | Shelf<T> {
    if (typeof a === 'string' && typeof b === 'string') {
      return a + b;
    }
    if (a instanceof Shelf && b instanceof Shelf) {
      return Shelf.concat(a, b);
    }
    const typeofA = reflection.typeOf(a);
    const typeofB = reflection.typeOf(b);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.join: Values of type '${typeofA}' and '${typeofB}' can't be concatenated!`);
  };

  function take(value: string, amount: number): string;
  function take<T>(value: Shelf<T>, amount: number): Shelf<T>;
  function take<T>(value: string | Shelf<T>, amount: number): string | Shelf<T> {
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

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.take: Can't perform 'take' operation on value of type "${typeOfValue}": ${value}`);
  };

  function drop(value: string, amount: number): string;
  function drop<T>(value: Shelf<T>, amount: number): Shelf<T>;
  function drop<T>(value: string | Shelf<T>, amount: number): string | Shelf<T> {
    ensure.number('std.drop', amount);

    if (typeof value === 'string') return value.slice(amount);
    if (value instanceof Shelf) {
      let output: Shelf<T> = value;
      for (let i = amount; i > 0; i--) {
        output = output?.pop();
      }
      return output ?? new ShelfBottom<T>();
    }

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.drop: Can't perform 'drop' operation on value of type "${typeOfValue}": ${value}`);
  };

  function reverse(value: string): string;
  function reverse<T>(value: Shelf<T>): Shelf<T>;
  function reverse<T>(value: string | Shelf<T>): string | Shelf<T> {
    if (typeof value === 'string') return [...value].reverse().join('');
    if (value instanceof Shelf) return Shelf.reverse(value);

    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  };

  function sort<T extends MewlixValue>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('std.sort', shelf);
    return Shelf.fromArray(shelf
      .toArray()
      .sort((a, b) => compare.compare(a, b).id)
    );
  };

  function shuffle<T>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('std.shuffle', shelf);
    const output = shelf.toArray();

    for (let i = output.length - 1; i > 0; i--) {
      const j = random_int(0, i);

      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }
    return Shelf.fromArray(output);
  };

  function insert<T>(shelf: Shelf<T>, value: T, index: number = 0): Shelf<T> {
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
  };

  function remove<T>(shelf: Shelf<T>, index: number = 0): Shelf<T> {
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
  };

  function map<T1, T2>(callback: (x: T1) => T2, shelf: Shelf<T1>): Shelf<T2> {
    ensure.func('std.map', callback);
    ensure.shelf('std.map', shelf);

    const output = new Array(shelf.length());

    let i = shelf.length() - 1;
    for (const value of shelf) {
      output[i--] = callback(value);
    }
    return Shelf.fromArray(output);
  };

  function filter<T1>(predicate: (x: T1) => boolean, shelf: Shelf<T1>): Shelf<T1> {
    ensure.func('std.filter', predicate);
    ensure.shelf('std.filter', shelf);

    let bucket = new ShelfBottom<T1>();

    for (const value of shelf) {
      if (predicate(value)) {
        bucket = bucket.push(value);
      }
    }
    return Shelf.reverse(bucket);
  };

  function fold<T1, T2>(callback: (acc: T2, x: T1) => T2, initial: T2, shelf: Shelf<T1>) {
    ensure.func('std.fold', callback);
    ensure.shelf('std.fold', shelf);

    let accumulator: T2 = initial;
    for (const value of shelf) {
      accumulator = callback(accumulator, value);
    }
    return accumulator;
  };

  function any<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    ensure.func('std.any', predicate);
    ensure.shelf('std.any', shelf);
    for (const value of shelf) {
      if (predicate(value)) { return true; }
    }
    return false;
  };

  function all<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    ensure.func('std.all', predicate);
    ensure.shelf('std.all', shelf);
    for (const value of shelf) {
      if (!(predicate(value))) { return false; }
    }
    return true;
  };

  function zip<T1, T2>(a: Shelf<T1>, b: Shelf<T2>): Shelf<Box<T1 | T2>> {
    ensure.shelf('std.zip', a);
    ensure.shelf('std.zip', b);

    const length = Math.min(a.length(), b.length());
    const output = new Array(length);

    let i = length - 1;
    while (a instanceof ShelfNode && b instanceof ShelfNode) {
      output[i--] = new Box<T1 | T2>([
        ["first",  a.peek()],
        ["second", b.peek()],
      ]);
      a = a.pop();
      b = b.pop();
    }
    return Shelf.fromArray(output);
  };

  function repeat(number: number, callback: (i?: number) => void): void {
    ensure.number('std.repeat', number);
    ensure.func('std.repeat', callback);
    for (let i = 0; i < number; i++) {
      callback(i);
    }
  };

  function foreach<T>(callback: (x: T) => void, shelf: Shelf<T>): void {
    ensure.func('std.foreach', callback);
    ensure.shelf('std.foreach', shelf);
    for (const value of shelf) {
      callback(value);
    }
  };

  function tuple(a: MewlixValue, b: MewlixValue): Box<MewlixValue> {
    return new Box([
      ["first",  a],
      ["second", b],
    ]);
  };

  function table(): Box<MewlixValue> {
    const table = new Map<MewlixValue, MewlixValue>();
    const box: Box<MewlixValue> = new Box<MewlixValue>([
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
  };

  function set(): Box<MewlixValue> {
    const set = new Set<MewlixValue>();
    const box: Box<MewlixValue> = new Box<MewlixValue>([
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
  };

  function slap(value: MewlixValue): number {
    return conversion.toNumber(value);
  };

  function round(value: number): number {
    ensure.number('std.round', value);
    return Math.round(value);
  };

  function floor(value: number): number {
    ensure.number('std.floor', value);
    return Math.floor(value);
  };

  function ceiling(value: number): number {
    ensure.number('std.ceiling', value);
    return Math.ceil(value);
  };

  function min(a: number, b: number): number {
    ensure.number('std.min', a);
    ensure.number('std.min', b);
    return Math.min(a, b);
  };

  function max(a: number, b: number): number {
    ensure.number('std.max', a);
    ensure.number('std.max', b);
    return Math.max(a, b);
  };

  function clamp(value: number, min: number, max: number): number {
    ensure.number('std.clamp', value);
    ensure.number('std.clamp', min);
    ensure.number('std.clamp', max);

    return clamp_(value, min, max);
  };

  function abs(value: number): number {
    ensure.number('std.abs', value);
    return Math.abs(value);
  };

  const pi = Math.PI;
  const e  = Math.E;

  function sqrt(value: number): number {
    ensure.number('std.sqrt', value);
    if (value < 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.sqrt: Cannot calculate square root of negative number ${value}!`);
    }
    return Math.sqrt(value);
  };

  function logn(value: number, base: number): number {
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
  };

  function acos(value: number): number {
    ensure.number('std.acos', value);
    return Math.acos(value);
  };

  function asin(value: number): number {
    ensure.number('std.asin', value);
    return Math.asin(value);
  };

  function atan(value: number): number {
    ensure.number('std.atan', value);
    return Math.atan(value);
  };

  function cos(value: number): number {
    ensure.number('std.cos', value);
    return Math.cos(value);
  };

  function sin(value: number): number {
    ensure.number('std.sin', value);
    return Math.sin(value);
  };

  function tan(value: number): number {
    ensure.number('std.tan', value);
    return Math.tan(value);
  };

  function atan2(y: number, x: number): number {
    ensure.number('std.atan2', y);
    ensure.number('std.atan2', x);
    return Math.atan2(y, x);
  };

  function truncate(value: number, places: number = 0): number {
    ensure.number('std.truncate', value);
    ensure.number('std.truncate', places);
    if (places < 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.truncate: Value of places should be greater than 0; received ${places}`);
    }
    const modifier = 10 ** places;
    return Math.trunc(value * modifier) / modifier;
  };

  function random() {
    return Math.random();
  };

  function random_int(min: number, max: number): number {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    ensure.number('std.random_int', min);
    ensure.number('std.random_int', max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  function count(start: number = 0, end: number): Shelf<number> {
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
  };

  function read(key: string): string | null {
    ensure.string('std.read', key);
    return localStorage.getItem(key);
  };

  function save(key: string, contents: string): void {
    ensure.string('std.save', key);
    ensure.string('std.save', contents);
    localStorage.setItem(key, contents);
  };

  function date(): Box<number> {
    const now = new Date();
    return new Box([
      [ "day"    , now.getDay() + 1   ],
      [ "month"  , now.getMonth() + 1 ],
      [ "year"   , now.getFullYear()  ],
      [ "hours"  , now.getHours(),    ],
      [ "minutes", now.getMinutes()   ],
      [ "seconds", now.getSeconds()   ],
    ]);
  };

  function time(): number {
    return Date.now();
  };

  function meowf(value: MewlixValue): string {
    return meowFunc(purrify(value));
  };

  function to_json(value: MewlixValue): string {
    return JSON.stringify(value);
  };

  function from_json(value: string): MewlixValue {
    ensure.string('std.from_json', value);
    return fromJSON(JSON.parse(value));
  };

  function log(value: MewlixValue): void {
    const message = purrify(value);
    console?.log(`[Mewlix] ${message}`);
  };

  const error = new Box([
    ErrorCode.TypeMismatch,
    ErrorCode.InvalidOperation,
    ErrorCode.InvalidConversion,
    ErrorCode.CatOnComputer,
    ErrorCode.Console,
    ErrorCode.Graphic,
    ErrorCode.InvalidImport,
    ErrorCode.CriticalError,
    ErrorCode.ExternalError,
  ].map(x => [x.name, x.id]));

  const Base = {
    purr,
    cat,
    trim,
    tear,
    push_down,
    push_up,
    poke,
    char,
    bap,
    nuzzle,
    empty,
    join,
    take,
    drop,
    reverse,
    sort,
    shuffle,
    insert,
    remove,
    map,
    filter,
    fold,
    any,
    all,
    zip,
    repeat,
    foreach,
    tuple,
    table,
    set,
    slap,
    round,
    floor,
    ceiling,
    min,
    max,
    clamp,
    abs,
    pi,
    e,
    sqrt,
    logn,
    acos,
    asin,
    atan,
    cos,
    sin,
    tan,
    atan2,
    truncate,
    random,
    random_int,
    count,
    read,
    save,
    date,
    time,
    meowf,
    to_json,
    from_json,
    log,
    error,
  };
  const BaseYarnBall = new YarnBall('std', Base);

  /* ------------------------------------------
   * Standard Library - Currying
   * ------------------------------------------ */
  
  /* Note: When currying overloaded functions, the type system gets quirky.
   * Although I can type-cast it away, I chose not to.
   * I prefer to write unique overloaded wrappers for all overloaded functions.
   *
   * Although the wrappers below are slightly repetitive, it's worth it to 
   * ensure type safety and avoid type-casting. */

  function pokeCurry(value: string): (index: number) => string | null;
  function pokeCurry<T>(value: Shelf<T>): (index: number) => T | null;
  function pokeCurry<T>(value: string | Shelf<T>) {
    return (typeof value === 'string')
      ? function(index: number) { return poke(value, index); }
      : function(index: number) { return poke(value, index); };
  }

  function joinCurry(a: string): (b: string) => string;
  function joinCurry<T>(a: Shelf<T>): (b: Shelf<T>) => Shelf<T>;
  function joinCurry<T>(a: string | Shelf<T>) {
    return (typeof a === 'string')
      ? function(b: string)   { return join(a, b); }
      : function(b: Shelf<T>) { return join(a, b); }
  }

  function takeCurry(value: string): (amount: number) => string;
  function takeCurry<T>(value: Shelf<T>): (amount: number) => Shelf<T>;
  function takeCurry<T>(value: string | Shelf<T>) {
    return (typeof value === 'string')
      ? function(amount: number) { return take(value, amount); }
      : function(amount: number) { return take(value, amount); };
  }

  function dropCurry(value: string): (amount: number) => string;
  function dropCurry<T>(value: Shelf<T>): (amount: number) => Shelf<T>;
  function dropCurry<T>(value: string | Shelf<T>) {
    return (typeof value === 'string')
      ? function(amount: number) { return drop(value, amount); }
      : function(amount: number) { return drop(value, amount); };
  }

  const BaseCurry = {
    tear: (str: string) =>
      (start: number) =>
        (end: number) =>
          tear(str, start, end),

    poke: pokeCurry,
    join: joinCurry,
    take: takeCurry,
    drop: dropCurry,

    insert: <T>(shelf: Shelf<T>) =>
      (value: T) =>
        (index: number) =>
          insert(shelf, value, index),

    remove: <T>(shelf: Shelf<T>) =>
      (index: number) =>
        remove(shelf, index),

    map: <T1, T2>(callback: (x: T1) => T2) =>
      (shelf: Shelf<T1>) =>
        map(callback, shelf),

    filter: <T1>(predicate: (x: T1) => boolean) =>
      (shelf: Shelf<T1>) =>
        filter(predicate, shelf),

    fold: <T1, T2>(callback: (acc: T2, x: T1) => T2) =>
      (initial: T2) =>
        (shelf: Shelf<T1>) =>
          fold(callback, initial, shelf),

    any: <T>(predicate: (x: T) => boolean) =>
      (shelf: Shelf<T>) =>
        any(predicate, shelf),

    all: <T>(predicate: (x: T) => boolean) =>
      (shelf: Shelf<T>) =>
        all(predicate, shelf),

    zip: <T1, T2>(a: Shelf<T1>) =>
      (b: Shelf<T2>) =>
        zip(a, b),

    repeat: (number: number) =>
      (callback: (i?: number) => void) =>
        repeat(number, callback),

    foreach: <T>(callback: (x: T) => void) =>
      (shelf: Shelf<T>) =>
        foreach(callback, shelf),

    tuple: (a: MewlixValue) =>
      (b: MewlixValue) =>
        tuple(a, b),

    min: (a: number) =>
      (b: number) =>
        min(a, b),

    max: (a: number) =>
      (b: number) =>
        max(a, b),

    clamp: (value: number) =>
      (min: number) =>
        (max: number) =>
          clamp(value, min, max),

    logn: (value: number) =>
      (base: number) =>
        logn(value, base),

    atan: (y: number) =>
      (x: number) =>
        atan2(y, x),

    truncate: (value: number) =>
      (places: number) =>
        truncate(value, places),

    random_int: (min: number) =>
      (max: number) =>
        random_int(min, max),

    count: (start: number) =>
      (end: number) =>
        count(start, end),

    save: (key: string) =>
      (contents: string) =>
        save(key, contents),
  };
  const BaseCurryYarnBall = YarnBall.mix('std.curry', BaseYarnBall, BaseCurry);

  /* -------------------------------------------------------
   * Final Touches
   * ------------------------------------------------------- */
  /* A default implementation for the 'run' entrypoint function.
   * The console and graphic templates override this implementation.
   *
   * It should *always* be awaited, as it's expected to be asynchronous. */
  const run = async (func: () => YarnBall<GenericBox>): Promise<YarnBall<GenericBox>> => func();

  /* ------------------------------------------------------
   * Return Mewlix Namespace
   * ------------------------------------------------------ */
  return {
    ErrorCode: ErrorCode,
    MewlixError: MewlixError,
    purrify: purrify,
    MewlixObject: MewlixObject,
    Modules: Modules,
    Shelf: Shelf,
    ShelfNode: ShelfNode,
    ShelfBottom: ShelfBottom,
    Box: Box,
    CatTree: CatTree,
    wake: wake,
    Clowder: Clowder,
    YarnBall: YarnBall,
    fromJSON: fromJSON,
    Comparison: Comparison,
    numbers: numbers,
    boolean: boolean,
    compare: compare,
    strings: strings,
    shelves: shelves,
    reflection: reflection,
    boxes: boxes,
    conversion: conversion,
    internal: internal,
    meow: (x: string) => meowFunc(x),
    setMeow: setMeow,
    BoxWrapper: BoxWrapper,
    wrap: wrap,
    api: api,
    Base: BaseYarnBall,
    BaseCurry: BaseCurryYarnBall, 
    run: run,
  };
}

export default createMewlix;
