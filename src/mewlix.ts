'use strict';

export default function() {
  /* -----------------------------------------------------
   * MewlixValue -> Valid Mewlix values:
   * ----------------------------------------------------- */
  type MewlixValue =
      number
    | string
    | boolean
    | Shelf
    | Box
    | Function
    | null
    | undefined;

  /* -----------------------------------------------------
   * MewlixError -> Custom error type.
   * ----------------------------------------------------- */
  class ErrorCode {
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
  Mewlix.ErrorCode = ErrorCode;

  class MewlixError extends Error {
    name: string;
    code: ErrorCode;

    constructor(errorCode: ErrorCode, message: string) {
      super(errorCode.makeMessage(message));
      this.name = this.constructor.name;
      this.code = errorCode;
    }
  }
  Mewlix.MewlixError = MewlixError;

  /* -----------------------------------------------------
   * String utils.
   * ----------------------------------------------------- */
  function purrify(value: MewlixValue): string {
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

  Mewlix.purrify = purrify;
  Mewlix.purrifyItem = purrifyItem;
  Mewlix.purrifyArray = purrifyArray;
  Mewlix.purrifyObject = purrifyObject;

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
  class MewlixObject {
    valueOf(): any {
      throw new MewlixError(ErrorCode.TypeMismatch,
        `Mewlix object "${this.constructor.name}" cannot be coerced to a value with .valueOf()!`);
    }
  };
  Mewlix.MewlixObject = MewlixObject;

  /* -----------------------------------------------------
   * Mewlix.Namespace -> Container for modules.
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
      const wrapped = Mewlix.wrap(object) as MewlixObject;
      this.cache.set(key, wrapped);
      this.modules.set(key, () => wrapped);
    }
  };
  Mewlix.Namespace = Namespace;

  /* -----------------------------------------------------
   * Mewlix.Modules -> Default module container.
   * ----------------------------------------------------- */
  Mewlix.Modules = new Mewlix.Namespace('default');

  /* -----------------------------------------------------
   * Shelf -> Stack-like persistent data structure.
   * ----------------------------------------------------- */
  class Shelf extends MewlixObject {
    constructor() {
      super();
      Object.defineProperty(this, 'box', {
        value: () => {
          throw new MewlixError(ErrorCode.TypeMismatch,
            "Can't access properties in a value of type 'shelf'!");
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }

    peek(): MewlixValue {
      throw new MewlixError(ErrorCode.CriticalError,
        `Class ${this.constructor.name} doesn't implement method 'peek'!`);
    }

    pop(): Shelf {
      throw new MewlixError(ErrorCode.CriticalError,
        `Class ${this.constructor.name} doesn't implement method 'pop'!`);
    }

    push(value: MewlixValue): ShelfNode {
      return new ShelfNode(value, this);
    }

    length(): number {
      throw new MewlixError(ErrorCode.CriticalError,
        `Class ${this.constructor.name} doesn't implement method 'length'!`);
    }

    contains(_: MewlixValue): boolean {
      throw new MewlixError(ErrorCode.CriticalError,
        `Class ${this.constructor.name} doesn't implement method 'contains'!`);
    }

    toString(): string {
      return purrifyArray(this.toArray());
    }

    toJSON() {
      return this.toArray();
    }

    *[Symbol.iterator]() {
      let node: Shelf = this;
      while (node instanceof ShelfNode) {
        yield node.peek();
        node = node.pop();
      }
    }

    toArray(): MewlixValue[] {
      const len = this.length();
      const output = new Array(len);

      let i = len - 1;
      for (const item of this) {
        output[i--] = item;
      }
      return output;
    }

    static isEqual(a: Shelf, b: Shelf): boolean {
      if (a instanceof ShelfBottom) return b instanceof ShelfBottom;
      if (b instanceof ShelfBottom) return a instanceof ShelfBottom;

      return Compare.isEqual(a.peek(), b.peek()) && Shelf.isEqual(a.pop(), b.pop());
    }

    static concat(a: Shelf, b: Shelf): Shelf {
      if (a instanceof ShelfBottom) return b;
      if (b instanceof ShelfBottom) return a;

      const bucket = b.toArray();
      let output: Shelf = a;

      for (const item of bucket) {
        output = output.push(item);
      }
      return output;
    }

    static reverse(a: Shelf): Shelf {
      let b = new ShelfBottom();
      for (const value of a) {
        b = b.push(value);
      }
      return b;
    }

    static fromArray(arr: MewlixValue[]): Shelf {
      return arr.reduce(
        (tail: Shelf, value: MewlixValue) => new ShelfNode(value, tail),
        new ShelfBottom()
      );
    }
  }

  class ShelfNode extends Shelf {
    value: MewlixValue;
    next: Shelf;
    len: number;

    constructor(value: MewlixValue, tail: Shelf) {
      super();
      this.value = value;
      this.next  = tail;
      this.len   = tail.length() + 1;
      Object.freeze(this);
    }

    peek(): MewlixValue {
      return this.value;
    }

    pop(): Shelf {
      return this.next;
    }

    length(): number {
      return this.len;
    }

    contains(value: MewlixValue): boolean {
      return Compare.isEqual(value, this.value)
        ? true
        : this.next.contains(value);
    }
  }

  class ShelfBottom extends Shelf {
    constructor() {
      super();
      Object.freeze(this);
    }

    peek(): MewlixValue {
      return null;
    }

    pop(): Shelf {
      return this;
    }

    length(): number {
      return 0;
    }

    contains(_: MewlixValue): boolean {
      return false;
    }

    toArray(): MewlixValue[] {
      return [];
    }
  }

  Mewlix.Shelf = Shelf;
  Mewlix.ShelfNode = ShelfNode;
  Mewlix.ShelfBottom = ShelfBottom;

  /* -----------------------------------------------------
   * Box -> A core part of a cat-oriented language.
   * ----------------------------------------------------- */
  class Box extends MewlixObject {
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
  Mewlix.Box = Box;

  /* -----------------------------------------------------
   * Mewlix.Enum -> Base for all enums.
   * ----------------------------------------------------- */
  class EnumValue extends Box {
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

  class Enum extends Box {
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
  Mewlix.Enum = Enum;

  /* -----------------------------------------------------
   * Mewlix.Clowder -> Base for all clowders.
   * ----------------------------------------------------- */
  /* The clowder constructor symbol. */
  const wakeSymbol: unique symbol = Symbol('wake');
  Mewlix.wake = wakeSymbol;

  /* All clowders should inherit from this class.
   * It has a default definition for wake(), too. */
  class Clowder extends Box {
    [key: string | symbol]: MewlixValue;

    constructor() {
      super();
      this[wakeSymbol] = (function wake(this: Clowder): Clowder {
        return this;
      }).bind(this);
    }
  }
  Mewlix.Clowder = Clowder;

  /* -----------------------------------------------------
   * Mewlix.YarnBall  -> Yarn ball export list.
   * ----------------------------------------------------- */
  class YarnBall extends MewlixObject {
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
  Mewlix.YarnBall = YarnBall;

  /* -----------------------------------------------------
   * Generate standard yarn balls.
   * ----------------------------------------------------- */

  /* All the 'as any' castings are a necessary compromise to guarantee dynamic assignment behavior.
   * The sacrifices needed to write the base for a dynamic language in a typed one. */

  function library(libraryKey: string, library: StringIndexable = {}) {
    const yarnball = new YarnBall(libraryKey);
    for (const key in library) {
      yarnball[key] = library[key];
    }
    return yarnball;
  };

  function curryLibrary(libraryKey: string, base: YarnBall, library: StringIndexable = {}) {
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

  Mewlix.library = library;
  Mewlix.curryLibrary = curryLibrary;

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

  const ensure = {
    number:   typecheck(x => typeof x === 'number',   'number' ),
    string:   typecheck(x => typeof x === 'string',   'string' ),
    boolean:  typecheck(x => typeof x === 'boolean',  'boolean'),
    shelf:    typecheck(x => x instanceof Shelf,      'shelf'  ),
    box:      typecheck(x => x instanceof Box,        'box'    ),
    func:     typecheck(x => typeof x === 'function', 'func'   ),
  };
  Mewlix.ensure = ensure;

  /* -----------------------------------------------------
   * Value Utils 
   * ----------------------------------------------------- */
  function isNothing(x: any): boolean {
    return x === null || x === undefined;
  };

  function clamp(value: number, min: number, max: number): number {
    return value < min ? min : (value > max ? max : value);
  };

  function opaque(x: Object): void {
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

  Mewlix.isNothing = isNothing;
  Mewlix.clamp = clamp;
  Mewlix.opaque = opaque;

  /* -----------------------------------------------------
   * JSON utils
   * ----------------------------------------------------- */
  const MewlixToJSON = {
    fromObject: (object: StringIndexable): Box => {
      return new Box(
        getEntries(object)
          .map(([key, value]) => [key, MewlixToJSON.fromAny(value)])
      );
    },
    fromArray: (array: any[]): Shelf => {
      return Shelf.fromArray(
        array.map(MewlixToJSON.fromAny)
      );
    },
    fromAny: (value: any): any => {
      if (typeof value !== 'object') return value;
      if (Array.isArray(value)) {
        return MewlixToJSON.fromArray(value);
      }
      return MewlixToJSON.fromObject(value);
    },
  }
  Mewlix.JSON = MewlixToJSON;

  /* -----------------------------------------------------
   * Comparison: Enum-like class.
   * ----------------------------------------------------- */
  class Comparison {
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
  Mewlix.Comparison = Comparison;

  /* -----------------------------------------------------
   * Basic operations.
   * ----------------------------------------------------- */
  const Numbers = {
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
  Mewlix.Numbers = Numbers;

  const Boolean = {
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
  Mewlix.Boolean = Boolean;

  const Compare = {
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
  Mewlix.Compare = Compare;

  const Strings = {
    concat: function concat(a: MewlixValue, b: MewlixValue): string {
      return purrify(a) + purrify(b);
    },
  };
  Mewlix.Strings = Strings;

  const Shelves = {
    peek: function peek(shelf: Shelf): MewlixValue {
      ensure.shelf('paw at', shelf);
      return shelf.peek();
    },
    pop: function pop(shelf: Shelf): Shelf {
      ensure.shelf('knock over', shelf);
      return shelf.pop();
    },
    push: function push(value: MewlixValue, shelf: Shelf): Shelf {
      ensure.shelf('push', shelf);
      return shelf.push(value);
    },
    length: function length(value: Shelf | string): number {
      if (value instanceof Shelf) return value.length();
      if (typeof value === 'string') return value.length;

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `...?: Can't calculate length for value of type "${typeOfValue}": ${value}`);
    },
    contains: function contains(a: MewlixValue, b: Shelf | Box | string): boolean {
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
  Mewlix.Shelves = Shelves;

  const Reflection = {
    typeOf: function typeOf(value: any): string {
      if (value instanceof Shelf) return 'shelf';
      if (value instanceof Mewlix) return 'box';
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
  Mewlix.Relection = Reflection;

  const Boxes = {
    pairs: function pairs(value: Box): Shelf {
      ensure.box('claw at', value);
      return Shelf.fromArray(getEntries(value).map(
        ([key, value]) => new Mewlix([["key", key], ["value", value]])
      ));
    },
  };
  Mewlix.Boxes = Boxes;

  const Conversion = {
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
  Mewlix.Conversion = Conversion;

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
        [ "name" , errorCode.name ],
        [ "id"   , errorCode.id   ]
      ]);
    },
    assert: function assert(expr: MewlixValue, message: string) {
      if (Conversion.toBool(expr)) return;
      throw new MewlixError(ErrorCode.CatOnComputer,
        `Assertion failed: ${message}`);
    }
  };
  Mewlix.Internal = Internal;

  /* -----------------------------------------------------
   * IO:
   * ----------------------------------------------------- */
  Mewlix.meow = function meow(_: MewlixValue) {
    throw new MewlixError(ErrorCode.CriticalError,
      "Core function 'Mewlix.meow' hasn't been implemented!");
  };

  /* -----------------------------------------------------
   * API:
   * ----------------------------------------------------- */
  class BoxWrapper extends MewlixObject {
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
  Mewlix.BoxWrapper = BoxWrapper;

  Mewlix.wrap = function wrap(object: object) {
    if (typeof object !== 'object') {
      throw new MewlixError(ErrorCode.InvalidImport,
        `Special import "${object}" isn't an object!`);
    }
    if (object instanceof YarnBall) {
      return object;
    }
    return new BoxWrapper(object);
  };

  Mewlix.API = {
    arrayToShelf: Shelf.fromArray,
    shelf: (...items: MewlixValue[]) => Shelf.fromArray(items),
    createBox: (object: StringIndexable) => new Mewlix(getEntries(object ?? {})),
    inject: (key: string, object: StringIndexable) => Mewlix.Modules.injectModule(key, object),
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

    cat: function cat(shelf: Shelf): string {
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

    poke: function poke(value: string | Shelf, index: number = 0): MewlixValue {
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

    empty: function empty(value: string | Shelf): boolean {
      if (typeof value === 'string') return value === '';
      if (value instanceof Shelf) return value instanceof ShelfBottom;

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.empty: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
    },

    join: function join<T extends string | Shelf>(a: T, b: T) {
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

    take: function take<T extends string | Shelf>(value: T, amount: number) {
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

    drop: function drop<T extends string | Shelf>(value: T, amount: number) {
      ensure.number('std.drop', amount);

      if (typeof value === 'string') return value.slice(amount);
      if (value instanceof Shelf) {
        let output: Shelf = value;
        for (let i = amount; i > 0; i--) {
          output = output?.pop();
        }
        return output ?? new ShelfBottom();;
      }

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.drop: Can't perform 'drop' operation on value of type "${typeOfValue}": ${value}`);
    },

    reverse: function reverse<T extends string | Shelf>(value: T) {
      if (typeof value === 'string') return [...value].reverse().join('');
      if (value instanceof Shelf) return Shelf.reverse(value);

      const typeOfValue = Reflection.typeOf(value);
      throw new MewlixError(ErrorCode.TypeMismatch,
        `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
    },
    
    sort: function sort(shelf: Shelf): Shelf {
      ensure.shelf('std.sort', shelf);
      return Shelf.fromArray(shelf
        .toArray()
        .sort((a, b) => Compare.compare(a, b).id)
      );
    },

    shuffle: function shuffle(shelf: Shelf): Shelf {
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

    insert: function insert(shelf: Shelf, value: MewlixValue, index: number = 0): Shelf {
      ensure.shelf('std.insert', shelf);
      ensure.number('std.insert', index);

      let top = new ShelfBottom();
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

    remove: function remove(shelf: Shelf, index: number = 0): Shelf {
      ensure.shelf('std.remove', shelf);
      ensure.number('std.remove', index);

      let top = new ShelfBottom();
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

    map: function map(callback: (x: MewlixValue) => MewlixValue, shelf: Shelf): Shelf {
      ensure.func('std.map', callback);
      ensure.shelf('std.map', shelf);

      const output = new Array(shelf.length());

      let i = shelf.length() - 1;
      for (const value of shelf) {
        output[i--] = callback(value);
      }
      return Shelf.fromArray(output);
    },

    filter: function filter(predicate: (x: MewlixValue) => boolean, shelf: Shelf): Shelf {
      ensure.func('std.filter', predicate);
      ensure.shelf('std.filter', shelf);

      let bucket = new ShelfBottom();

      for (const value of shelf) {
        if (predicate(value)) {
          bucket = bucket.push(value);
        }
      }
      return Shelf.reverse(bucket);
    },

    fold: function fold(callback: (acc: MewlixValue, x: MewlixValue) => MewlixValue, initial: MewlixValue, shelf: Shelf) {
      ensure.func('std.fold', callback);
      ensure.shelf('std.fold', shelf);

      let accumulator: MewlixValue = initial;
      for (const value of shelf) {
        accumulator = callback(accumulator, value);
      }
      return accumulator;
    },

    any: function any(predicate: (x: MewlixValue) => boolean, shelf: Shelf): boolean {
      ensure.func('std.any', predicate);
      ensure.shelf('std.any', shelf);
      for (const value of shelf) {
        if (predicate(value)) { return true; }
      }
      return false;
    },

    all: function all(predicate: (x: MewlixValue) => boolean, shelf: Shelf): boolean {
      ensure.func('std.all', predicate);
      ensure.shelf('std.all', shelf);
      for (const value of shelf) {
        if (!(predicate(value))) { return false; }
      }
      return true;
    },

    zip: function zip(a: Shelf, b: Shelf): Shelf {
      ensure.shelf('std.zip', a);
      ensure.shelf('std.zip', b);

      const length = Math.min(a.length(), b.length());
      const output = new Array(length);

      let i = length - 1;
      while (a instanceof ShelfNode && b instanceof ShelfNode) {
        output[i--] = new Mewlix([
          ["first",  a.peek()],
          ["second", b.peek()],
        ]);
        a = a.pop();
        b = b.pop();
      }
      return Shelf.fromArray(output);
    },

    repeat: function repeat(number: number, callback: () => void): void {
      ensure.number('std.repeat', number);
      ensure.func('std.repeat', callback);
      for (let i = 0; i < number; i++) {
        callback();
      }
    },

    foreach: function foreach(callback: (x: MewlixValue) => void, shelf: Shelf) {
      ensure.func('std.foreach', callback);
      ensure.shelf('std.foreach', shelf);
      for (const value of shelf) {
        callback(value);
      }
    },

    tuple: function tuple(a: MewlixValue, b: MewlixValue) {
      return new Mewlix([
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

      return clamp(value, min, max);
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

    count: function count(start: number = 0, end: number): Shelf {
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

      let output = new ShelfBottom();

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
      return Mewlix.meow(purrify(value));
    },

    to_json: function to_json(value: MewlixValue): string {
      return JSON.stringify(value);
    },

    from_json: function from_json(value: string): MewlixValue {
      ensure.string('std.from_json', value);
      return MewlixToJSON.fromAny(JSON.parse(value));
    },

    log: function log(value: MewlixValue): void {
      const message = purrify(value);
      console?.log(`[Mewlix] ${message}`);
    },

    error: new Enum('ErrorCode', [
        ErrorCode.TypeMismatch,
        ErrorCode.InvalidOperation,
        ErrorCode.InvalidConversion,
        ErrorCode.CatOnComputer,
        ErrorCode.Console,
        ErrorCode.Graphic,
        ErrorCode.InvalidImport,
        ErrorCode.CriticalError,
        ErrorCode.ExternalError,
      ].map(x => x.name)
    ),
  };
  Mewlix.Base = library('std', Base);

  /* Freezing the base library, as it's going to be accessible inside Mewlix. */
  Object.freeze(Mewlix.Base);

  /* ------------------------------------------
   * Standard Library - Currying
   * ------------------------------------------ */
  Mewlix.BaseCurry = ((): YarnBall => {
    const std = Base;

    return curryLibrary('std.curry', Mewlix.Base, {
      tear: (str: string) =>
        (start: number) =>
          (end: number) =>
            std.tear(str, start, end),

      poke: (value: string | Shelf) =>
        (index: number) =>
          std.poke(value, index),

      join: (a: string | Shelf) =>
        (b: string | Shelf) =>
          std.join(a, b),

      take: (value: string | Shelf) =>
        (amount: number) =>
          std.take(value, amount),

      drop: (value: string | Shelf) =>
        (amount: number) =>
          std.drop(value, amount),

      insert: (shelf: Shelf) =>
        (value: MewlixValue) =>
          (index: number) =>
            std.insert(shelf, value, index),

      remove: (shelf: Shelf) =>
        (index: number) =>
            std.remove(shelf, index),

      map: (callback: (x: MewlixValue) => MewlixValue) =>
          (shelf: Shelf) =>
            std.map(callback, shelf),

      filter: (predicate: (x: MewlixValue) => boolean) =>
        (shelf: Shelf) =>
          std.filter(predicate, shelf),

      fold: (callback: (acc: MewlixValue, x: MewlixValue) => MewlixValue) =>
        (initial: MewlixValue) =>
          (shelf: Shelf) =>
            std.fold(callback, initial, shelf),

      any: (predicate: (x: MewlixValue) => boolean) =>
        (shelf: Shelf) =>
          std.any(predicate, shelf),

      all: (predicate: (x: MewlixValue) => boolean) =>
        (shelf: Shelf) =>
          std.all(predicate, shelf),

      zip: (a: Shelf) =>
        (b: Shelf) =>
          std.zip(a, b),

      repeat: (number: number) =>
        (callback: () => void) =>
          std.repeat(number, callback),

      foreach: (callback: (x: MewlixValue) => void) =>
        (shelf: Shelf) =>
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
   * It should *always* be awaited, as it's expected to be asynchronous. */
  Mewlix.run = (func: Function) => func();
}
