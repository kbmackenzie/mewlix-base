'use strict';

/* - * - * - * - * - * - * - * - *
 * Symbols (Core)
/* - * - * - * - * - * - * - * - * */
export const tag  = Symbol('tag');
export const wake = Symbol('wake');

/* - * - * - * - * - * - * - * - *
 * Types (Core)
/* - * - * - * - * - * - * - * - * */
export type ValueOf<T> = T[keyof T];
export type TryGet<T> = T | undefined;

type ObjectTag = 'shelf' | 'box' | 'clowder' | 'clowder instance' | 'cat tree' | 'cat fruit' | 'yarnball';
export type MewlixObject = { [tag]: ObjectTag };

export type Shelf<T> =
  | Readonly<{ [tag]: 'shelf', kind: 'node', value: T, tail: Shelf<T>, length: number }>
  | Readonly<{ [tag]: 'shelf', kind: 'bottom', }>;

export type Box<T> = Readonly<{
  [tag]: 'box',
  bindings: T;
  get(key: keyof T): ValueOf<T>;
  set(key: keyof T, value: ValueOf<T>): void;
}>;

export type Clowder<T extends ClowderBindings> = Readonly<{
  [tag]: 'clowder';
  kind: symbol;
  name: string;
  parent: Clowder<T> | null;
  initialize: () => T;
}>;

export type ClowderInstance<T extends ClowderBindings> = Readonly<{
  [tag]: 'clowder instance',
  name: string;
  kind: symbol;
  bindings: T;
  parent: ClowderInstance<T> | null;
  get(key: keyof T): TryGet<ValueOf<T>>;
  set(key: keyof T, value: ValueOf<T>): void;
  outside(key: keyof T): TryGet<ValueOf<T>>;
}>;

export type ClowderBindings = {
  [wake]: (...args: any[]) => void;
};

export type YarnBall<T> = Readonly<{
  [tag]: 'yarnball',
  key: string;
  get(key: keyof T): ValueOf<T>;
}>;

export type CatTree = Readonly<{
  [tag]: 'cat tree';
  name: string;
  fruits: Record<string, CatFruit>;
  get(key: string): TryGet<CatFruit>;
}>;

export type CatFruit = Readonly<{
  [tag]: 'cat fruit';
  key: string;
  value: number;
  get(key: 'key'): string;
  get(key: 'value'): number;
}>;

export type Tuple<T1, T2> = {
  first:  T1;
  second: T2;
};

/* - * - * - * - * - * - * - * - *
 * Shelf: Logic + Operations
/* - * - * - * - * - * - * - * - * */
export function newShelf<T>(value: T, tail?: Shelf<T>): Shelf<T> {
  return {
    [tag]: 'shelf',
    kind: 'node',
    value: value,
    tail: tail ?? { [tag]: 'shelf', kind: 'bottom' },
    length: tail ? shelfLength(tail) + 1 : 1,
  };
}

export function shelfBottom<T>(): Shelf<T> {
  return { [tag]: 'shelf', kind: 'bottom' };
}

export function shelfLength<T>(shelf: Shelf<T>): number {
  if (shelf.kind === 'bottom') return 0;
  return shelf.length;
}

export function shelfPush<T>(shelf: Shelf<T>, value: T): Shelf<T> {
  return newShelf(value, shelf);
}

export function shelfPeek<T>(shelf: Shelf<T>): T | null {
  if (shelf.kind === 'bottom') return null;
  return shelf.value;
}

export function shelfPop<T>(shelf: Shelf<T>): Shelf<T> | null {
  if (shelf.kind === 'bottom') return null;
  return shelf.tail;
}

export function shelfContains<T extends MewlixValue>(shelf: Shelf<T>, value: T): boolean {
  let node = shelf;
  while (node.kind === 'node') {
    if (relation.equal(node.value, value)) return true;
    node = node.tail;
  }
  return false;
}

export function shelfConcat<T>(a: Shelf<T>, b: Shelf<T>): Shelf<T> {
  if (a.kind === 'bottom') return b;
  if (b.kind === 'bottom') return a;

  const bucket = shelfToArray(b);
  let output: Shelf<T> = a;
  for (const value of bucket) {
    output = shelfPush(output, value);
  }
  return output;
}

export function shelfReverse<T>(shelf: Shelf<T>): Shelf<T> {
  let output: Shelf<T> = shelfBottom();
  for (let node = shelf; node.kind === 'node'; node = node.tail) {
    output = shelfPush(output, node.value);
  }
  return output;
}

export function* shelfIterator<T>(a: Shelf<T>): Generator<T, void, void> {
  let node: Shelf<T> = a;
  while (node.kind === 'node') {
    yield node.value;
    node = node.tail;
  }
}

export function shelfToArray<T>(shelf: Shelf<T>): T[] {
  if (shelf.kind === 'bottom') return [];

  const output = new Array<T>(shelf.length);
  let node: Shelf<T> = shelf;
  let i = shelf.length - 1;

  while (node.kind === 'node') {
    output[i--] = node.value;
    node = node.tail;
  }
  return output;
}

export function shelfFromArray<T>(array: T[]): Shelf<T> {
  return array.reduce(
    (shelf: Shelf<T>, value: T) => shelfPush<T>(shelf, value),
    shelfBottom(),
  );
}

export function shelfEquality<T extends MewlixValue>(a: Shelf<T>, b: Shelf<T>): boolean {
  if (a.kind === 'bottom') return b.kind === 'bottom';
  if (b.kind === 'bottom') return false;
  return relation.equal(a.value, b.value) && shelfEquality(a.tail, b.tail);
}

export function isShelf<T>(value: any): value is Shelf<T> {
  return typeof value == 'object'
    && value !== null
    && tag in value
    && value[tag] === 'shelf';
}

/* - * - * - * - * - * - * - * - *
 * Box: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export function createBox<T>(init: T, copy: boolean = false,): Box<T> {
  const innerBox = copy ? {...init} : init;
  const box: Box<T> = {
    [tag]: 'box',
    bindings: innerBox,
    get(key: keyof T): ValueOf<T> {
      return innerBox[key];
    },
    set(key: keyof T, value: ValueOf<T>): void {
      innerBox[key] = value;
    },
  };
  return box;
}

/* todo: rename this to 'boxFromObject' */
export function objectToBox<T>(obj: Record<string, T>): Box<typeof obj> {
  return createBox(obj);
}

export function isBox<T>(value: any): value is Box<T> {
  return typeof value === 'object'
    && value !== null
    && tag in value
    && value[tag] === 'box';
}

/* - * - * - * - * - * - * - * - *
 * Cat Tree: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export function createCatTree(name: string, keys: string[]): CatTree {
  const fruits: Record<string, CatFruit> = {};
  let i = 0;
  for (const key of keys) {
    function get(k: 'key'): string;
    function get(k: 'value'): number;
    function get(k: 'key' | 'value') {
      if (k === 'key') return key;
      if (k === 'value') return i;
    }
    const fruit: CatFruit = {
      [tag]: 'cat fruit',
      key: key,
      value: i,
      get: get,
    };
    fruits[key] = fruit;
    i++;
  }
  return {
    [tag]: 'cat tree',
    name: name,
    fruits: fruits,
    get(key: string): TryGet<CatFruit> {
      return fruits[key];
    },
  };
}

/* - * - * - * - * - * - * - * - *
 * Yarn Ball: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export function createYarnBall<T>(key: string, lib: T): YarnBall<T> {
  return {
    [tag]: 'yarnball',
    key: key,
    get(key: keyof T): ValueOf<T> {
      return lib[key];
    },
  };
}

export function mixYarnBall<T1, T2>(key: string, a: T1, b: T2): YarnBall<T1 & T2> {
  const lib: T1 & T2 = { ...a, ...b };
  return {
    [tag]: 'yarnball',
    key: key,
    get(key: keyof T1 | keyof T2): ValueOf<T1 & T2> {
      return lib[key] as any; /* todo: improve this */
    },
  };
}

type Bindings<T> = Record<string, () => T>;
type BindingMap<T> = Record<string, T>;

export function bindYarnBall<T>(
  key: string,
  init: (bind: Bindings<T>
) => void): YarnBall<BindingMap<T>> {
  const bindings: Bindings<T> = {};
  init(bindings);
  return {
    [tag]: 'yarnball',
    key: key,
    get(key: string): T {
      return bindings[key]?.();
    }
  };
}

/* - * - * - * - * - * - * - * - *
 * Clowders: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export function createClowder<T extends ClowderBindings>(
  name: string,
  parent: Clowder<T> | null,
  init: () => T,
): Clowder<T> {
  return {
    [tag]: 'clowder',
    kind: Symbol(name),
    name: name,
    parent: parent,
    initialize: init,
  };
}

function instanceClowder<T extends ClowderBindings>(clowder: Clowder<T>): ClowderInstance<T> {
  const parent   = clowder.parent && instanceClowder(clowder.parent);
  const bindings = clowder.initialize();
  const instance: ClowderInstance<T> = {
    [tag]: 'clowder instance',
    name: clowder.name,
    kind: clowder.kind,
    parent: parent,
    bindings: bindings,
    get(key: keyof T): TryGet<ValueOf<T>> {
      if (key in bindings) return bindings[key];
      if (parent) return parent.get(key);
      return undefined;
    },
    set(key: keyof T, value: ValueOf<T>): void {
      bindings[key] = value;
    },
    outside(key: keyof T): TryGet<ValueOf<T>> {
      return parent?.get(key);
    },
  };
  bindings[wake].bind(instance);
  for (const key in bindings) {
    const value = bindings[key];
    if (typeof value === 'function') {
      value.bind(instance);
    }
  }
  return instance;
}

export function instantiate<T extends ClowderBindings>(
  clowder: Clowder<T>
): (...args: any[]) => ClowderInstance<T> {
  const instance = instanceClowder(clowder);
  return (...args) => {
    instance.bindings[wake](...args);
    return instance;
  };
}

export function instanceOf<T extends ClowderBindings>(
  instance: ClowderInstance<T>,
  clowder: Clowder<T>
): boolean {
  const kind = instance.kind;
  let c: Clowder<T> | null = clowder;
  while (c) {
    if (c.kind === kind) return true;
    c = clowder.parent;
  }
  return false;
}

export function isClowderInstance<T extends ClowderBindings>(
  value: any
): value is ClowderInstance<T> {
  return typeof value === 'object'
    && value !== null
    && tag in value
    && value[tag] === 'clowder instance';
}

/* - * - * - * - * - * - * - * - *
 * Namespace: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export type Namespace<T> = Readonly<{
  [tag]: 'namespace',
  name: string;
  cache: Map<string, T>;
  modules: Map<string, () => T>;
}>;

export function createNamespace<T>(name: string): Namespace<T> {
  return {
    [tag]: 'namespace',
    name: name,
    cache: new Map(),
    modules: new Map(),
  };
}

export function getModule<T>(namespace: Namespace<T>, name: string): T | undefined {
  if (namespace.cache.has(name)) return namespace.cache.get(name);
  const mod = namespace.modules.get(name);
  if (!mod) return mod;
  return mod();
}

export function addModule<T>(namespace: Namespace<T>, name: string, mod: () => T): void {
  namespace.modules.set(name, mod);
  if (namespace.cache.has(name)) {
    namespace.cache.delete(name);
  }
}

/* - * - * - * - * - * - * - * - *
 * Errors: Logic + Operations
/* - * - * - * - * - * - * - * - * */

export enum ErrorCode {
  TypeMismatch,
  InvalidOperation,
  InvalidConversion,
  CatOnComputer,
  Console,
  Graphic,
  InvalidImport,
  CriticalError,
  ExternalError,
};

export const errorToString: Record<ErrorCode, string> = {
  [ErrorCode.TypeMismatch]:      'type mismatch',
  [ErrorCode.InvalidOperation]:  'invalid operation',
  [ErrorCode.InvalidConversion]: 'invalid conversion',
  [ErrorCode.CatOnComputer]:     'cat on computer',
  [ErrorCode.Console]:           'console',
  [ErrorCode.Graphic]:           'graphic',
  [ErrorCode.InvalidImport]:     'invalid import',
  [ErrorCode.CriticalError]:     'critical error',
  [ErrorCode.ExternalError]:     'external error',
};

export class MewlixError extends Error {
  name: string;
  code: ErrorCode;
  constructor(errorCode: ErrorCode, message: string) {
    const errorName = errorToString[errorCode];
    super(`[${errorName}] ${message}`);
    this.name = this.constructor.name;
    this.code = errorCode;
  }
}

/* - * - * - * - * - * - * - * - *
 * Types (Value)
/* - * - * - * - * - * - * - * - * */
export type MewlixFunction = (...args: any[]) => MewlixValue;

export type MewlixValue =
  | number
  | string
  | boolean
  | MewlixObject
  | MewlixFunction
  | null
  | void
  | undefined
  | Promise<void>;

export type Gettable<T> = {
  [tag]: 'box' | 'clowder instance';
  get(key: string): TryGet<T>;
};

export function isGettable<T>(a: any): a is Gettable<T> {
  return typeof a === 'object'
    && a !== null
    && tag in a
    && (a[tag] === 'box' || a[tag] === 'clowder instance');
}

/* - * - * - * - * - * - * - * - *
 * Utilities
/* - * - * - * - * - * - * - * - * */

export function getEntries<T>(record: Record<string, T>): [string, T][] {
  const entries: [string, T][] = [];
  for (const key in record) {
    entries.push([key, record[key]]);
  }
  return entries;
}

/* - * - * - * - * - * - * - * - *
 * Strings: Logic + Operations
/* - * - * - * - * - * - * - * - * */

const purrifyTable: Record<ObjectTag, (a: any) => string> = {
  'shelf': function<T>(shelf: Shelf<T>): string {
    const items = shelfToArray(shelf).map(purrify).join(', ');
    return `[${items}]`;
  },
  'box': function<T extends { [key: string]: any }>(box: Box<T>): string {
    const items = getEntries(box.bindings)
      .map(([key, value]) => `"${key}": ${purrify(value)}`)
      .join(', ');
    return `📦 [${items}]`;
  },
  'clowder': function<T extends ClowderBindings>(clowder: Clowder<T>): string {
    return `clowder ${clowder.name}`;
  },
  'clowder instance': function<T extends ClowderBindings>(instance: ClowderInstance<T>): string {
    const items = getEntries(instance.bindings)
      .map(([key, value]) => `"${key}": ${purrify(value)}`)
      .join(', ');
    return `clowder instance ${instance.name} [${items}]`;
  },
  'yarnball': function<T>(yarnball: YarnBall<T>): string {
    return `yarnball ${yarnball.key}`;
  },
  'cat tree': function(tree: CatTree): string {
    const items = getEntries(tree.fruits)
      .map(([key, value]) => `"${key}": ${value.value}`)
      .join(', ');
    return `cat tree ${tree.name} [${items}]`;
  },
  'cat fruit': function(fruit: CatFruit): string {
    return `cat fruit [${fruit.key}: ${fruit.value}]`;
  },
};

export function purrify(value: any): string {
  if (typeof value === 'object' && value !== null && tag in value) {
    return purrifyTable[value[tag] as ObjectTag](value);
  }
  if (value === null || value === undefined) { return 'nothing'; }
  return String(value);
}

/* - * - * - * - * - * - * - * - *
 * JSON Conversion
/* - * - * - * - * - * - * - * - * */
export type JSONValue =
  | number
  | string
  | boolean
  | null
  | JSONValue[]
  | JSONObject;

export type JSONObject = {
  [key: string]: JSONValue;
};

const mewlixToJSON: Record<ObjectTag, (a: any) => JSONValue> = {
  'shelf': function<T>(shelf: Shelf<T>): JSONValue {
    return shelfToArray(shelf).map(toJSON);
  },
  'box': function<T extends { [key: string]: any }>(box: Box<T>): JSONValue {
    return objectToJSON(box.bindings);
  },
  'clowder instance': function<T extends ClowderBindings>(instance: ClowderInstance<T>): JSONValue {
    return objectToJSON(instance.bindings);
  },
  'cat fruit': function(fruit: CatFruit): JSONValue {
    return fruit.key;
  },
  /* Not convertible: */
  'cat tree': (_) => null,
  'clowder' : (_) => null,
  'yarnball': (_) => null,
};

export function toJSON(value: any): JSONValue {
  if (typeof value === 'object' && value !== null && tag in value) {
    return mewlixToJSON[value[tag] as ObjectTag](value);
  }
  if (Array.isArray(value)) {
    return value.map(toJSON);
  }
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
      return value;
    case 'object':
      if (value === null) return null;
      return objectToJSON(value);
    default:
      return null;
  }
}

function objectToJSON(obj: object): JSONValue {
  const output: Record<string, JSONValue> = {};
  for (const key in obj) {
    output[key] = toJSON(key);
  }
  return output;
}

export function fromJSON(value: JSONValue): MewlixValue {
  if (Array.isArray(value)) {
    return shelfFromArray(value.map(fromJSON));
  }
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
      return value;
    case 'object': {
      if (value === null) return null;
      const bindings: Record<string, MewlixValue> = {};
      for (const key in value) {
        bindings[key] = fromJSON(value[key]);
      }
      return createBox(bindings);
    }
    default:
      return null;
  }
}

/* - * - * - * - * - * - * - * - *
 * Comparisons
/* - * - * - * - * - * - * - * - * */
export enum Ordering {
  Less,
  Equal,
  Greater,
}

export const compare = {
  less(o: Ordering): boolean {
    return o === Ordering.Less;
  },
  equal(o: Ordering): boolean {
    return o === Ordering.Equal;
  },
  greater(o: Ordering): boolean {
    return o === Ordering.Greater;
  },
  lessOrEqual(o: Ordering): boolean {
    return o === Ordering.Less || o === Ordering.Equal;
  },
  greaterOrEqual(o: Ordering): boolean {
    return o === Ordering.Greater || o === Ordering.Equal;
  },
};

/* - * - * - * - * - * - * - * - *
 * Conversions
/* - * - * - * - * - * - * - * - * */
export const convert = {
  bool(x: any): boolean {
    if (x === false || x === null || x === undefined) return false;
    return true;
  },
  number(x: MewlixValue): number {
    switch (typeof x) {
      case 'number' : return x;
      case 'boolean': return x ? 1 : 0;
      case 'string' : {
        const number = Number(x);
        if (Number.isNaN(number)) break;
        return number;
      }
      default:
        break;
    }
    throw new MewlixError(ErrorCode.InvalidConversion,
      `Value cannot be converted to a number: ${x}`);
  },
};

/* - * - * - * - * - * - * - * - *
 * Reflection
/* - * - * - * - * - * - * - * - * */

export const reflection = {
  typeOf(a: any): string {
    switch (typeof a) {
      case 'number' : return 'number';
      case 'string' : return 'string';
      case 'boolean': return 'boolean';
      case 'object' :
        if (a === null) return 'null';
        if (tag in a) return a[tag] as string;
        break;
      case 'function': return 'function';
      default: break;
    }
    return 'unrecognized';
  },
  instanceOf(a: any, b: any): boolean {
    if (typeof a === 'object' && typeof b === 'object'
      && a !== null && b !== null
      && tag in a && tag in b
      && a[tag] === 'clowder instance'
      && b[tag] === 'clowder') {
      return instanceOf(a, b);
    }
    const typeOfA = reflection.typeOf(a);
    const typeOfB = reflection.typeOf(b);
    throw new MewlixError(ErrorCode.InvalidOperation,
      `Type "${typeOfA}" cannot be an instance of type "${typeOfB}"!`);
  },
};

/* - * - * - * - * - * - * - * - *
 * Relation + Comparison
/* - * - * - * - * - * - * - * - * */

export const relation = {
  equal(a: MewlixValue, b: MewlixValue): boolean {
    if (isNothing(a)) return isNothing(b);
    if (isNothing(b)) return isNothing(a);

    if (isShelf(a) && isShelf(b)) {
      return shelfEquality(a as Shelf<MewlixValue>, b as Shelf<MewlixValue>);
    }
    return a === b;
  },
  ordering(a: MewlixValue, b: MewlixValue): Ordering {
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
        if (a === b) return Ordering.Equal;
        return (a < b!) ? Ordering.Less : Ordering.Greater;
      default:
        break;
    }
    const typeOfValue = reflection.typeOf(a);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `compare: Cannot compare values of type "${typeOfValue}"!`);
  },
};

/* - * - * - * - * - * - * - * - *
 * Value Utils
/* - * - * - * - * - * - * - * - * */

export function isNothing(x: any): boolean {
  return x === null || x === undefined;
}

export function clamp_(value: number, min: number, max: number): number {
  return (value < min) ? min : ((value > max) ? max : value);
}

/* - * - * - * - * - * - * - * - *
 * Type Utils
/* - * - * - * - * - * - * - * - * */

export const ensure = {
  number(where: string, a: any): void {
    if (typeof a === 'number') return;
    throw typeError(where, a, 'number');
  },
  string(where: string, a: any): void {
    if (typeof a === 'string') return;
    throw typeError(where, a, 'string');
  },
  shelf(where: string, a: any): void {
    if (isShelf(a)) return;
    throw typeError(where, a, 'shelf');
  },
  box(where: string, a: any): void {
    if (isBox(a)) return;
    throw typeError(where, a, 'box');
  },
  gettable(where: string, a: any): void {
    if (isGettable(a)) return;
    throw typeError(where, a, 'gettable');
  },
  func(where: string, a: any): void {
    if (typeof a === 'function') return;
    throw typeError(where, a, 'function');
  }
};

function typeError(where: string, value: any, targetType: string): MewlixError {
  const type = reflection.typeOf(value);
  const purr = purrify(value);
  return new MewlixError(ErrorCode.TypeMismatch,
    `${where}: Expected ${targetType}, got value of type "${type}": ${purr}`);
}

/* - * - * - * - * - * - * - * - *
 * Basic Operations
/* - * - * - * - * - * - * - * - * */

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
    return !convert.bool(a);
  },
  or(a: any, fb: () => any): any {
    return convert.bool(a) ? a : fb();
  },
  and(a: any, fb: () => any): any {
    return convert.bool(a) ? fb() : a;
  },
  ternary(condition: any, fa: () => any, fb: () => any): any {
    return convert.bool(condition) ? fa() : fb();
  },
};

export const strings = {
  concat(a: MewlixValue, b: MewlixValue): string {
    return purrify(a) + purrify(b);
  },
};

export const shelf = {
  create: shelfFromArray,
  peek<T>(shelf: Shelf<T>): T | null {
    ensure.shelf('paw at', shelf);
    return shelfPeek(shelf);
  },
  pop<T>(shelf: Shelf<T>): Shelf<T> | null {
    ensure.shelf('knock over', shelf);
    return shelfPop(shelf);
  },
  push<T>(value: T, shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('push', shelf);
    return shelfPush(shelf, value);
  },
};

export const collections = {
  length<T>(value: Shelf<T> | string): number {
    if (typeof value === 'string') return value.length;
    if (typeof value === 'object'
      && value !== null
      && tag in value
      && value[tag] === 'shelf') {
      return shelfLength(value);
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `...?: Can't calculate length for value of type "${typeOfValue}": ${purrify(value)}`);
  },
  contains<T extends MewlixValue>(
    value: T,
    collection:
      | Shelf<T>
      | Box<Record<string, T>>
      | ClowderInstance<ClowderBindings & Record<string, T>>
      | string
  ): boolean {
    if (isShelf(collection)) {
      return shelfContains(collection, value);
    }
    if (typeof value === 'string') {
      if (typeof collection === 'string') {
        return collection.includes(value);
      }
      if (isBox(collection) || isClowderInstance(collection)) {
        return value in collection.bindings;
      }
    }
    const typeOfA = reflection.typeOf(value);
    const typeOfB = reflection.typeOf(collection);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `in: Cannot look up type "${typeOfA}" in type "${typeOfB}"!`);
  },
};

export const box = {
  create: createBox,
  pairs<T>(value: Box<Record<string, T>>) {
    ensure.box('claw at', value);

    type Pair = { key: string; value: T; };
    let pairs: Shelf<Box<Pair>> = shelfBottom();

    const entries = getEntries(value.bindings);
    for (const [key, value] of entries) {
      pairs = shelfPush(pairs, createBox<Pair>({
        key: key,
        value: value,
      }));
    }
    return pairs;
  },
};

/* - * - * - * - * - * - * - * - *
 * Internal
/* - * - * - * - * - * - * - * - * */

export const internal = {
  chase,
  pounce,
  assertionFail,
};

function chase<T>(value: Shelf<T>): Generator<T, void, void>;
function chase<T>(value: string): Generator<string, void, void>;
function chase<T>(value: Shelf<T> | string) {
  if (typeof value === 'string') return value[Symbol.iterator]();
  if (isShelf(value)) return shelfIterator(value);
  const typeOfValue = reflection.typeOf(value);
  throw new MewlixError(ErrorCode.TypeMismatch,
    `Cannot chase value of type "${typeOfValue}"! | value: ${value}`);
}

type ErrorContext = {
  name: string;
  id: ErrorCode;
  message: string | null;
};

function pounce(error: Error): Box<ErrorContext> {
  const errorCode: ErrorCode = (error instanceof MewlixError)
    ? error.code
    : ErrorCode.ExternalError;
  return createBox<ErrorContext>({
    name: errorToString[errorCode],
    id: errorCode,
    message: error.message ? purrify(error.message) : null,
  });
}

function assertionFail(message: string): void {
  throw new MewlixError(ErrorCode.CatOnComputer,
    `Assertion failed: ${message}`);
}

/* - * - * - * - * - * - * - * - *
 * IO
/* - * - * - * - * - * - * - * - * */

export type MeowFunc = (input: string) => string;

/* - * - * - * - * - * - * - * - *
 * API
/* - * - * - * - * - * - * - * - * */

export function wrap<T>(object: T, copy: boolean = false): Box<T> {
  const wrapped: T = copy ? {...object} : object;
  return {
    [tag]: 'box',
    bindings: wrapped,
    get(key: keyof T): ValueOf<T> {
      return wrapped[key];
    },
    set(key: keyof T, value: ValueOf<T>): void {
      wrapped[key] = value;
    },
  };
}

/* - * - * - * - * - * - * - * - *
 * Create Mewlix - Logic
/* - * - * - * - * - * - * - * - * */

const createMewlix = function() {
  // mewlix.modules: default namespace
  const modules = createNamespace<MewlixObject>('default');

  // mewlix.api: The API exposed to users.
  const api = {
    arrayToShelf: shelfFromArray,
    box: objectToBox,
    shelf<T>(...items: T[]): Shelf<T> {
      return shelfFromArray(items);
    },
    inject<T>(key: string, record: Record<string, T>): void {
      addModule(modules, key, () => record);
    },
  };

  // a default 'meow' implementation
  let meowFunc: MeowFunc = function(_) {
    throw new MewlixError(ErrorCode.CriticalError,
      'meow: Core function \'meow\' hasn\'t been implemented!');
  };
  function setMeow(func: MeowFunc): void {
    meowFunc = func;
  }

  // meow.lib: core libraries
  const lib: Record<string, YarnBall<any>> = {};

  // meow.lib.std: the base library

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
    ensure.shelf('std.cat', shelf);
    const iterator = shelfIterator(shelf);
    let acc = '';
    for (const value of iterator) {
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
      const strIndex = (index < 0)
        ? Math.max(0, value.length + index)
        : index;
      return value[strIndex];
    }
    if (isShelf(value)) {
      const shelfIndex = (index < 0)
        ? Math.max(0, shelfLength(value) + index)
        : index;
      let node: Shelf<T> | null = value;
      for (let i = 0; i < shelfIndex; i++) {
        node = node && shelfPop(node);
      }
      return node && shelfPeek(node);
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.poke: Can't index into value of type "${typeOfValue}": ${value}`);
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
    return convert.bool(value);
  };

  function empty(value: string): boolean;
  function empty<T>(value: Shelf<T>): boolean;
  function empty<T>(value: string | Shelf<T>): boolean {
    if (typeof value === 'string') return value === '';
    if (isShelf(value)) return value.kind === 'bottom';

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
    if (isShelf(a) && isShelf(b)) {
      return shelfConcat(a, b);
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
    if (typeof value === 'string') {
      return value.slice(0, amount);
    }
    if (isShelf(value)) {
      const length = Math.min(shelfLength(value), amount);
      const iterator = shelfIterator(value);
      const output = new Array(length);
      let counter = amount;
      let i = length - 1;
      for (const item of iterator) {
        if (counter-- <= 0) break;
        output[i--] = item;
      }
      return shelfFromArray(output);
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.take: Can't perform 'take' operation on value of type "${typeOfValue}": ${value}`);
  };

  function drop(value: string, amount: number): string;
  function drop<T>(value: Shelf<T>, amount: number): Shelf<T>;
  function drop<T>(value: string | Shelf<T>, amount: number): string | Shelf<T> {
    ensure.number('std.drop', amount);
    if (typeof value === 'string') {
      return value.slice(amount);
    }
    if (isShelf(value)) {
      let output: Shelf<T> | null = value;
      for (let i = amount; i > 0; i--) {
        output = output && shelfPop(output);
      }
      return output ?? shelfBottom();
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.drop: Can't perform 'drop' operation on value of type "${typeOfValue}": ${value}`);
  };

  function reverse(value: string): string;
  function reverse<T>(value: Shelf<T>): Shelf<T>;
  function reverse<T>(value: string | Shelf<T>): string | Shelf<T> {
    if (typeof value === 'string') return [...value].reverse().join('');
    if (isShelf(value)) {
      return shelfReverse(value);
    }
    const typeOfValue = reflection.typeOf(value);
    throw new MewlixError(ErrorCode.TypeMismatch,
      `std.reverse: Can't check emptiness of value of type "${typeOfValue}": ${value}`);
  };

  function sort<T extends MewlixValue>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('std.sort', shelf);
    return shelfFromArray(
      shelfToArray(shelf)
        .sort((a, b) => relation.ordering(a, b))
    );
  };

  function shuffle<T>(shelf: Shelf<T>): Shelf<T> {
    ensure.shelf('std.shuffle', shelf);

    const output = shelfToArray(shelf);
    for (let i = output.length - 1; i > 0; i--) {
      const j = random_int(0, i);

      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }
    return shelfFromArray(output);
  };

  function insert<T>(shelf: Shelf<T>, value: T, index: number = 0): Shelf<T> {
    ensure.shelf('std.insert', shelf);
    ensure.number('std.insert', index);

    let top: Shelf<T> | null = shelfBottom();
    let bottom: Shelf<T> = shelf;
    let counter = (index >= 0)
      ? index
      : shelfLength(shelf) + index + 1;

    while (counter-- > 0 && bottom.kind === 'node') {
      top = top && shelfPush(top, shelfPeek(bottom)!);
      bottom = shelfPop(bottom)!;
    }
    bottom = shelfPush(bottom, value);

    const topIterator = shelfIterator(top);
    for (const item of topIterator) {
      bottom = shelfPush(bottom, item);
    }
    return bottom;
  };

  function remove<T>(shelf: Shelf<T>, index: number = 0): Shelf<T> {
    ensure.shelf('std.remove', shelf);
    ensure.number('std.remove', index);

    let top: Shelf<T> | null = shelfBottom();
    let bottom: Shelf<T> = shelf;
    let counter = (index >= 0)
      ? index
      : shelfLength(shelf) + index;

    while (counter-- > 0 && bottom.kind === 'node') {
      top = top && shelfPush(top, shelfPeek(bottom)!);
      bottom = shelfPop(bottom)!;
    }
    bottom = bottom.kind === 'node' ? shelfPop(bottom)! : bottom;

    const topIterator = shelfIterator(top);
    for (const item of topIterator) {
      bottom = shelfPush(bottom, item);
    }
    return bottom;
  };

  function map<T1, T2>(callback: (x: T1) => T2, shelf: Shelf<T1>): Shelf<T2> {
    ensure.func('std.map', callback);
    ensure.shelf('std.map', shelf);

    const output = new Array(shelfLength(shelf));
    let i = shelfLength(shelf) - 1;
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      output[i--] = callback(value);
    }
    return shelfFromArray(output);
  };

  function filter<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): Shelf<T> {
    ensure.func('std.filter', predicate);
    ensure.shelf('std.filter', shelf);

    let bucket = shelfBottom<T>();
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      if (predicate(value)) {
        bucket = shelfPush(bucket, value);
      }
    }
    return shelfReverse(bucket);
  };

  function fold<T1, T2>(callback: (acc: T2, x: T1) => T2, initial: T2, shelf: Shelf<T1>) {
    ensure.func('std.fold', callback);
    ensure.shelf('std.fold', shelf);

    let accumulator: T2 = initial;
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      accumulator = callback(accumulator, value);
    }
    return accumulator;
  };

  function any<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    ensure.func('std.any', predicate);
    ensure.shelf('std.any', shelf);

    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      if (predicate(value)) { return true; }
    }
    return false;
  };

  function all<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    ensure.func('std.all', predicate);
    ensure.shelf('std.all', shelf);

    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      if (!(predicate(value))) { return false; }
    }
    return true;
  };

  type ZipPair<T1, T2> = {
    first: T1;
    second: T2;
  };

  function zip<T1, T2>(a: Shelf<T1>, b: Shelf<T2>): Shelf<Box<ZipPair<T1, T2>>> {
    ensure.shelf('std.zip', a);
    ensure.shelf('std.zip', b);

    const length = Math.min(shelfLength(a), shelfLength(b));
    const output = new Array(length);
    let i = length - 1;

    let left:  Shelf<T1> = a;
    let right: Shelf<T2> = b;

    while (left.kind === 'node' && right.kind === 'node') {
      output[i--] = createBox<ZipPair<T1, T2>>({
        first:  shelfPeek(left)!,
        second: shelfPeek(right)!,
      });
      left  = shelfPop(left)!;
      right = shelfPop(right)!;
    }
    return shelfFromArray(output);
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
    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      callback(value);
    }
  };

  function tuple(a: MewlixValue, b: MewlixValue): Box<Tuple<MewlixValue, MewlixValue>> {
    return createBox<Tuple<MewlixValue, MewlixValue>>({
      first: a,
      second: b,
    });
  };

  function table() {
    const table = new Map<MewlixValue, MewlixValue>();
    return createBox({
      add(key: MewlixValue, value: MewlixValue) {
        table.set(key, value);
        return box;
      },
      has(key: MewlixValue) {
        return table.has(key);
      },
      get(key: MewlixValue) {
        return table.get(key);
      },
      remove(key: MewlixValue) {
        table.delete(key);
        return box;
      },
      clear() {
        table.clear();
        return box;
      },
    });
  };

  function set() {
    const set = new Set<MewlixValue>();
    return createBox({
      add(value: MewlixValue) {
        set.add(value);
        return box;
      },
      has(value: MewlixValue) {
        return set.has(value);
      },
      remove(value: MewlixValue) {
        set.delete(value);
        return box;
      },
      clear() {
        set.clear();
        return box;
      },
    });
  };

  function slap(value: MewlixValue): number {
    return convert.number(value);
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

    let output = shelfBottom<number>();

    for (let i = end; i != stop; i -= step) {
      output = shelfPush(output, i);
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

  type DateInfo = {
    day:     number;
    month:   number;
    year:    number;
    hours:   number;
    minutes: number;
    seconds: number;
  };

  function date(): Box<DateInfo> {
    const now = new Date();
    return createBox<DateInfo>({
      day:     now.getDay() + 1,
      month:   now.getMonth() + 1,
      year:    now.getFullYear(),
      hours:   now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
    });
  };

  function time(): number {
    return Date.now();
  };

  function meowf(value: MewlixValue): string {
    return meowFunc(purrify(value));
  };

  function to_json(value: MewlixValue): string {
    return JSON.stringify(toJSON(value));
  };

  function from_json(value: string): MewlixValue {
    ensure.string('std.from_json', value);
    return fromJSON(JSON.parse(value));
  };

  function log(value: MewlixValue): void {
    const message = purrify(value);
    console?.log(`[Mewlix] ${message}`);
  };

  const error = (function() {
    const codes = [
      ErrorCode.TypeMismatch,
      ErrorCode.InvalidOperation,
      ErrorCode.InvalidConversion,
      ErrorCode.CatOnComputer,
      ErrorCode.Console,
      ErrorCode.Graphic,
      ErrorCode.InvalidImport,
      ErrorCode.CriticalError,
      ErrorCode.ExternalError,
    ];
    const bindings: Record<string, ErrorCode> = {};
    for (const code of codes) {
      const key = ErrorCode[code];
      bindings[key] = code;
    }
    createBox(bindings);
  })();

  const base = {
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
  const std = createYarnBall('std', base)
  lib.std = std;

  /* Note: When currying overloaded functions, the type system gets quirky.
   * Although I can type-cast it away, I chose not to.
   * I prefer to write unique overloaded wrappers for all overloaded functions.
   *
   * Although the wrappers below are slightly repetitive, it's worth it to 
   * ensure type safety and avoid type-casting.
   *
   * A lot of the redundant checks will get minified away with Terser later on,
   * so it's mostly fine! */

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

  const baseCurry = {
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
  const stdCurry = mixYarnBall('std.curry', base, baseCurry);
  lib['std.curry'] = stdCurry;

  /* - * - * - * - * - * - * - * - *
   * Final Touches
  /* - * - * - * - * - * - * - * - * */

  /* A default implementation for the 'run' entrypoint function.
   * The console and graphic templates override this implementation.
   *
   * It should *always* be awaited, as it's expected to be asynchronous. */
  const run = async (func: () => YarnBall<any>): Promise<YarnBall<any>> => func();

  /* - * - * - * - * - * - * - * - *
   * Export Object
  /* - * - * - * - * - * - * - * - * */
  return {
    ErrorCode,
    MewlixError,
    purrify,
    modules: {
      namespace: modules,
      get(key: string) {
        return getModule(modules, key);
      },
      add(key: string, value: () => MewlixObject) {
        return addModule(modules, key, value);
      },
    },
    wake,
    fromJSON,
    numbers,
    boolean,
    compare,
    strings,
    shelf,
    reflection,
    box,
    convert,
    internal,
    meow: (x: string) => meowFunc(x),
    setMeow,
    wrap,
    api,
    lib,
    run,
  };
}

export default createMewlix;
export type Mewlix = ReturnType<typeof createMewlix>;
