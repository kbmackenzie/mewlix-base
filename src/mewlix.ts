'use strict';

/* - * - * - * - * - * - * - * - *
 * Symbols (Core)
/* - * - * - * - * - * - * - * - * */
export const tag  = Symbol('tag');
export const wake = Symbol('wake');

/* - * - * - * - * - * - * - * - *
 * Types (Core)
/* - * - * - * - * - * - * - * - * */
export type Nothing = null | undefined;

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

export type Wake = Function;
export type Purr = Function;

export type ClowderBlueprint = {
  [wake]?: Wake;
  [key: string]: Function;
};

export type ClowderBindings = {
  [key: string]: MewlixValue;
};

export type Clowder = Readonly<{
  [tag]: 'clowder';
  kind: symbol;
  name: string;
  parent: Clowder | null;
  blueprint: ClowderBlueprint;
  meta: { purr?: Purr; };
}>;

export type ClowderInstance = Readonly<{
  [tag]: 'clowder instance',
  clowder: Clowder;
  home: ClowderBindings;
  get(key: string): MewlixValue;
  set(key: string, value: MewlixValue): void;
  call(key: string, ...args: MewlixValue[]): MewlixValue;
}>;

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

export function shelfCompare<T extends MewlixValue>(a: Shelf<T>, b: Shelf<T>): Ordering {
  if (a.kind === 'bottom') return b.kind === 'bottom' ? Ordering.Equal : Ordering.Less;
  if (b.kind === 'bottom') return Ordering.Greater;
  const ord = relation.ordering(a.value, b.value);
  return ord == Ordering.Equal ? shelfCompare(a.tail, b.tail) : ord;
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

type BindingMap<T> = [string, () => T][];
type Bindings<T>   = Record<string, () => T>;

export function bindYarnBall<T>(key: string, map: BindingMap<T>): YarnBall<Record<string, T>> {
  const bindings: Bindings<T> = {};
  for (const [key, value] of map) {
    bindings[key] = value;
  }
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

export function createClowder(name: string, parent: Clowder | null, blueprint: ClowderBlueprint): Clowder {
  const clowder: Clowder = {
    [tag]: 'clowder',
    kind: Symbol(name),
    name: name,
    parent: parent,
    blueprint: blueprint,
    meta: {},
  };
  const purr = getPurr(clowder);
  if (purr) {
    clowder.meta.purr = purr;
  }
  return clowder;
}

function getPurr(clowder: Clowder): Purr | null {
  const hasPurr = 'purr' in clowder.blueprint && typeof clowder.blueprint.purr === 'function';
  return (hasPurr) ? clowder.blueprint.purr : null;
}

function getConstructor(clowder: Clowder): Wake | Nothing {
  if (wake in clowder.blueprint) return clowder.blueprint[wake];
  return clowder.parent && getConstructor(clowder.parent);
}

function instanceClowder(clowder: Clowder): ClowderInstance {
  const instance: ClowderInstance = {
    [tag]: 'clowder instance',
    clowder: clowder,
    home: {},
    get(key: string): MewlixValue {
      if (key in instance.home) return instance.home[key];
      let node: Clowder | null = clowder;
      while (node) {
        if (key in node.blueprint) {
          return node.blueprint[key].bind(instance);
        }
        node = node.parent;
      }
    },
    set(key: string, value: MewlixValue): void {
      instance.home[key] = value;
    },
    call(key: string, ...args: MewlixValue[]): MewlixValue {
      let node: Clowder | null = clowder;
      while (node) {
        if (key in node.blueprint) {
          return node.blueprint[key].apply(instance, ...args);
        }
        node = node.parent;
      }
      throw new MewlixError(ErrorCode.TypeMismatch,
        `Key ${key} is not a method in clowder ${purrify(clowder)}!`);
    }
  };
  return instance;
}

export function instantiate(clowder: Clowder): (...args: MewlixValue[]) => ClowderInstance {
  const instance = instanceClowder(clowder);
  const wake = getConstructor(clowder);
  return (...args) => {
    if (wake) {
      wake.apply(instance, ...args);
    }
    return instance;
  };
}

export function instanceOf(instance: ClowderInstance, clowder: Clowder): boolean {
  let i: Clowder | null = instance.clowder;
  while (i) {
    if (i.kind === clowder.kind) return true;
    i = i.parent;
  }
  return false;
}

export function isClowderInstance(value: any): value is ClowderInstance {
  return typeof value === 'object'
    && value !== null
    && tag in value
    && value[tag] === 'clowder instance';
}

export function isGettable(a: any) {
  return isBox(a) || isClowderInstance(a);
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
export type MewlixValue =
  | number
  | string
  | boolean
  | MewlixObject
  | Function
  | null
  | void
  | undefined
  | Promise<void>;

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
    const items = shelfToArray(shelf).map(x => purrify(x, true)).join(', ');
    return `[${items}]`;
  },
  'box': function<T extends { [key: string]: any }>(box: Box<T>): string {
    const items = getEntries(box.bindings)
      .map(([key, value]) => `"${key}": ${purrify(value, true)}`)
      .join(', ');
    return `📦 [${items}]`;
  },
  'clowder': function(clowder: Clowder): string {
    return `clowder ${clowder.name}`;
  },
  'clowder instance': function(instance: ClowderInstance): string {
    if (instance.clowder.meta.purr) {
      return purrify(
        instance.clowder.meta.purr.apply(instance)
      );
    }
    const items = getEntries(instance.home)
      .map(([key, value]) => `"${key}": ${purrify(value, true)}`)
      .join(', ');
    return `clowder instance ${instance.clowder.name} [${items}]`;
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

export function purrify(value: any, nested: boolean = false): string {
  if (typeof value === 'object' && value !== null && tag in value) {
    return purrifyTable[value[tag] as ObjectTag](value);
  }
  if (value === null || value === undefined) { return 'nothing'; }
  switch (typeof value) {
    case 'number':
    case 'boolean':
      return String(value);
    case 'string':
      return (nested) ? JSON.stringify(value) : value;
    case 'function':
        return '<function>';
    default:
      return 'unrecognized';
  }
}

/* - * - * - * - * - * - * - * - *
 * JSON Conversion
/* - * - * - * - * - * - * - * - * */
export type Serializable =
  | number
  | string
  | boolean
  | null
  | Serializable[]
  | SerializableObject;

export type SerializableObject = {
  [key: string]: Serializable;
};

const mewlixSerialize: Record<ObjectTag, (a: any) => Serializable> = {
  'shelf': function<T>(shelf: Shelf<T>): Serializable {
    return shelfToArray(shelf).map(toSerializable);
  },
  'box': function<T extends { [key: string]: any }>(box: Box<T>): Serializable {
    return makeObjectSerializable(box.bindings);
  },
  'clowder instance': function(instance: ClowderInstance): Serializable {
    return makeObjectSerializable(instance.home);
  },
  'cat fruit': function(fruit: CatFruit): Serializable {
    return fruit.key;
  },
  /* Not convertible: */
  'cat tree': (_) => null,
  'clowder' : (_) => null,
  'yarnball': (_) => null,
};

export function toSerializable(value: any): Serializable {
  if (typeof value === 'object' && value !== null && tag in value) {
    return mewlixSerialize[value[tag] as ObjectTag](value);
  }
  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
      return value;
    case 'object':
      if (value === null) return null;
      return makeObjectSerializable(value);
    default:
      return null;
  }
}

function makeObjectSerializable(object: Record<string, any>): Serializable {
  const output: Record<string, Serializable> = {};
  for (const key in object) {
    output[key] = toSerializable(object[key]);
  }
  return output;
}

export function fromSerializable(value: Serializable): MewlixValue {
  if (Array.isArray(value)) {
    return shelfFromArray(value.map(fromSerializable));
  }
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
      return value;
    case 'object': {
      if (value === null) return null;
      return fromSerializableObject(value);
    }
    default:
      return null;
  }
}

function fromSerializableObject(object: SerializableObject): Box<Record<string, MewlixValue>> {
  const bindings: Record<string, MewlixValue> = {};
  for (const key in object) {
    bindings[key] = fromSerializable(object[key]);
  }
  return createBox(bindings);
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
        if (a === null) return 'nothing';
        if (tag in a) return a[tag] as string;
        break;
      case 'function': return 'function';
      case 'undefined': return 'nothing';
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
    if (isShelf<MewlixValue>(a) && isShelf<MewlixValue>(b)) {
      return shelfCompare(a, b);
    }
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

export const report = {
  number(where: string, a: any): void {
    throw typeError(where, a, 'number');
  },
  string(where: string, a: any): void {
    throw typeError(where, a, 'string');
  },
  shelf(where: string, a: any): void {
    throw typeError(where, a, 'shelf');
  },
  func(where: string, a: any): void {
    throw typeError(where, a, 'function');
  },
  gettable(where: string, a: any): void {
    throw typeError(where, a, 'box or clowder instance');
  },
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
    typeof a === 'number' || report.number('+', a);
    typeof b === 'number' || report.number('+', b);
    return a + b;
  },
  sub(a: number, b: number): number {
    typeof a === 'number' || report.number('-', a);
    typeof b === 'number' || report.number('-', b);
    return a - b;
  },
  mul(a: number, b: number): number {
    typeof a === 'number' || report.number('*', a);
    typeof b === 'number' || report.number('*', b);
    return a * b;
  },
  div(a: number, b: number): number {
    typeof a === 'number' || report.number('/', a);
    typeof b === 'number' || report.number('/', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `/: Attempted to divide ${a} by ${b}!`);
    }
    return a / b;
  },
  floordiv(a: number, b: number): number {
    typeof a === 'number' || report.number('//', a);
    typeof b === 'number' || report.number('//', b);
    if (b == 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `//: Attempted to divide ${a} by ${b}!`);
    }
    return Math.floor(a / b);
  },
  mod(a: number, b: number): number {
    typeof a === 'number' || report.number('%', a);
    typeof b === 'number' || report.number('%', b);
    if (b === 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `%: Attempted to divide ${a} by ${b}!`);
    }
    return ((a % b) + b) % b;
  },
  pow(a: number, b: number): number {
    typeof a === 'number' || report.number('^', a);
    typeof b === 'number' || report.number('^', b);
    return a ** b;
  },
  plus(a: number): number {
    typeof a === 'number' || report.number('+', a);
    return +a;
  },
  minus(a: number): number {
    typeof a === 'number' || report.number('-', a);
    return -a;
  },
};

export const boolean = {
  not(a: any): boolean {
    return !convert.bool(a);
  },
};

export const strings = {
  concat(a: MewlixValue, b: MewlixValue): string {
    if (a === '') return purrify(b);
    if (b === '') return purrify(a);
    return purrify(a) + purrify(b);
  },
};

export const shelf = {
  create: shelfFromArray,
  peek<T>(shelf: Shelf<T>): T | null {
    isShelf(shelf) || report.shelf('paw at', shelf);
    return shelfPeek(shelf);
  },
  pop<T>(shelf: Shelf<T>): Shelf<T> | null {
    isShelf(shelf) || report.shelf('knock over', shelf);
    return shelfPop(shelf);
  },
  push<T>(value: T, shelf: Shelf<T>): Shelf<T> {
    isShelf(shelf) || report.shelf('push', shelf);
    return shelfPush(shelf, value);
  },
  toArray: shelfToArray,
  fromArray: shelfFromArray,
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
      | ClowderInstance
      | string
  ): boolean {
    if (isShelf(collection)) {
      return shelfContains(collection, value);
    }
    if (typeof value === 'string') {
      if (typeof collection === 'string') {
        return collection.includes(value);
      }
      if (isBox(collection)) {
        return value in collection.bindings;
      }
      if (isClowderInstance(collection)) {
        return value in collection.home || collection.get(value) !== undefined;
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
    isGettable(value) || report.gettable('claw at', value);
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

export const clowder = {
  create: createClowder,
  instantiate: instantiate,
};

export const catTree = {
  create: createCatTree,
};

export const yarnball = {
  bind: bindYarnBall,
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
export type MeowState = { meow: MeowFunc; };

/* - * - * - * - * - * - * - * - *
 * Standard Library
/* - * - * - * - * - * - * - * - * */
export function standardLibrary(meow?: MeowState) {
  /* The std library documentation can be found in... (see readme).
   *
   * It won't be included in this source file to avoid clutter.
   * All standard library functions *should use snake_case*. */

  function purr(value: MewlixValue): string {
    return purrify(value);
  };

  function cat(shelf: Shelf<string>): string {
    isShelf(shelf) || report.shelf('std.cat', shelf);
    const iterator = shelfIterator(shelf);
    let acc = '';
    for (const value of iterator) {
      acc = purrify(value) + acc;
    }
    return acc;
  };

  /* ------------------
   * Bitwise Operations
   * ------------------ */
  function itty(a: number): number {
    typeof a === 'number' || report.number('std.itty', a);
    return ~a;
  }

  function bitty(a: number, b: number): number {
    typeof a === 'number' || report.number('std.bitty', a);
    typeof b === 'number' || report.number('std.bitty', b);
    return a | b;
  }

  function kitty(a: number, b: number): number {
    typeof a === 'number' || report.number('std.kitty', a);
    typeof b === 'number' || report.number('std.kitty', b);
    return a & b;
  }

  /* -----------------
   * Strings & Shelves
   * ----------------- */
  function trim(str: string): string {
    typeof str === 'string' || report.string('std.trim', str);
    return str.trim();
  };

  function tear(str: string, start: number, end: number): string {
    typeof str   === 'string' || report.string('std.tear', str);
    typeof start === 'number' || report.string('std.tear', start);
    typeof end   === 'number' || report.string('std.tear', end);
    return str.substring(start, end);
  };

  function push_down(str: string): string {
    typeof str === 'string' || report.string('std.push_down', str);
    return str.toLowerCase();
  };

  function push_up(str: string): string {
    typeof str === 'string' || report.string('std.push_up', str);
    return str.toUpperCase();
  };

  function poke(value: string, index: number): string | null;
  function poke<T>(value: Shelf<T>, index: number): T | null;
  function poke<T>(value: string | Shelf<T>, index: number = 0) {
    typeof index === 'number' || report.number('std.poke', index);
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
    typeof amount === 'number' || report.number('std.take', amount);
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
    typeof amount === 'number' || report.number('std.drop', amount);
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
    isShelf(shelf) || report.shelf('std.sort', shelf);
    return shelfFromArray(
      shelfToArray(shelf)
        .sort((a, b) => relation.ordering(a, b))
    );
  };

  function shuffle<T>(shelf: Shelf<T>): Shelf<T> {
    isShelf(shelf) || report.shelf('std.shuffle', shelf);
    const output = shelfToArray(shelf);
    for (let i = output.length - 1; i > 0; i--) {
      const j = random_int(0, i);

      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }
    return shelfFromArray(output);
  };

  function find<T>(predicate: (t: T) => boolean, shelf: Shelf<T>): number | null {
    isShelf(shelf)                  || report.shelf('std.find', shelf);
    typeof predicate === 'function' || report.func('std.find', predicate);

    for (let node = shelf, i = 0; node.kind === 'node'; node = node.tail, i++) {
      const result = predicate(node.value);
      if (convert.bool(result)) return i;
    }
    return null;
  }

  function insert<T>(shelf: Shelf<T>, value: T, index: number = 0): Shelf<T> {
    isShelf(shelf)            || report.shelf('std.insert', shelf);
    typeof index === 'number' || report.number('std.insert', index);
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
    isShelf(shelf)            || report.shelf('std.remove', shelf);
    typeof index === 'number' || report.number('std.remove', index);
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
    typeof callback === 'function' || report.func('std.map', callback);
    isShelf(shelf)                 || report.shelf('std.map', shelf);
    const output = new Array(shelfLength(shelf));
    let i = shelfLength(shelf) - 1;
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      output[i--] = callback(value);
    }
    return shelfFromArray(output);
  };

  function filter<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): Shelf<T> {
    typeof predicate === 'function' || report.func('std.filter', predicate);
    isShelf(shelf)                  || report.shelf('std.filter', shelf);
    let bucket = shelfBottom<T>();
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      const result = predicate(value);
      if (convert.bool(result)) {
        bucket = shelfPush(bucket, value);
      }
    }
    return shelfReverse(bucket);
  };

  function fold<T1, T2>(callback: (acc: T2, x: T1) => T2, initial: T2, shelf: Shelf<T1>) {
    typeof callback === 'function' || report.func('std.fold', callback);
    isShelf(shelf)                 || report.shelf('std.fold', shelf);
    let accumulator: T2 = initial;
    const iterator = shelfIterator(shelf);

    for (const value of iterator) {
      accumulator = callback(accumulator, value);
    }
    return accumulator;
  };

  function any<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    typeof predicate === 'function' || report.func('std.any', predicate);
    isShelf(shelf)                  || report.shelf('std.any', shelf);
    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      const result = predicate(value);
      if (convert.bool(result)) { return true; }
    }
    return false;
  };

  function all<T>(predicate: (x: T) => boolean, shelf: Shelf<T>): boolean {
    typeof predicate === 'function' || report.func('std.all', predicate);
    isShelf(shelf)                  || report.shelf('std.all', shelf);
    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      const result = predicate(value);
      if (!convert.bool(result)) { return false; }
    }
    return true;
  };

  type ZipPair<T1, T2> = {
    first: T1;
    second: T2;
  };

  function zip<T1, T2>(a: Shelf<T1>, b: Shelf<T2>): Shelf<Box<ZipPair<T1, T2>>> {
    isShelf(a) || report.shelf('std.zip', a);
    isShelf(b) || report.shelf('std.zip', b);
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

  function repeat<T>(callback: (i?: number) => T, number: number): Shelf<T> {
    typeof number   === 'number'   || report.number('std.repeat', number);
    typeof callback === 'function' || report.func('std.repeat', callback);

    let shelf: Shelf<T> = { [tag]: 'shelf', kind: 'bottom' };
    for (let i = 0; i < number; i++) {
      shelf = shelfPush(shelf, callback(i));
    }
    return shelf;
  };

  function sequence<T>(callback: (i?: number) => T, number: number): void {
    typeof number   === 'number'   || report.number('std.sequence', number);
    typeof callback === 'function' || report.func('std.sequence', callback);
    for (let i = 0; i < number; i++) { void callback(i); }
  }

  function foreach<T>(callback: (x: T) => void, shelf: Shelf<T>): void {
    typeof callback === 'function' || report.func('std.foreach', callback);
    isShelf(shelf)                 || report.shelf('std.foreach', shelf);
    const iterator = shelfIterator(shelf);
    for (const value of iterator) {
      callback(value);
    }
  };

  /* --------------------------
   * Collections & Constructors
   * -------------------------- */
  function tuple(a: MewlixValue, b: MewlixValue): Box<Tuple<MewlixValue, MewlixValue>> {
    return createBox<Tuple<MewlixValue, MewlixValue>>({
      first: a,
      second: b,
    });
  };

  function table() {
    const table = new Map<MewlixValue, MewlixValue>();
    const box = createBox({
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
    return box;
  };

  function set() {
    const set = new Set<MewlixValue>();
    const box = createBox({
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
    return box;
  };

  function slap(value: MewlixValue): number {
    return convert.number(value);
  };

  function round(value: number): number {
    typeof value === 'number' || report.number('std.round', value);
    return Math.round(value);
  };

  function floor(value: number): number {
    typeof value === 'number' || report.number('std.floor', value);
    return Math.floor(value);
  };

  function ceiling(value: number): number {
    typeof value === 'number' || report.number('std.ceiling', value);
    return Math.ceil(value);
  };

  function min(a: number, b: number): number {
    typeof a === 'number' || report.number('std.min', a);
    typeof b === 'number' || report.number('std.min', b);
    return Math.min(a, b);
  };

  function max(a: number, b: number): number {
    typeof a === 'number' || report.number('std.max', a);
    typeof b === 'number' || report.number('std.max', b);
    return Math.max(a, b);
  };

  function clamp(value: number, min: number, max: number): number {
    typeof value === 'number' || report.number('std.clamp', value);
    typeof min   === 'number' || report.number('std.clamp', min);
    typeof max   === 'number' || report.number('std.clamp', max);
    return clamp_(value, min, max);
  };

  function abs(value: number): number {
    typeof value === 'number' || report.number('std.abs', value);
    return Math.abs(value);
  };

  const pi = Math.PI;
  const e  = Math.E;

  function sqrt(value: number): number {
    typeof value === 'number' || report.number('std.sqrt', value);
    if (value < 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.sqrt: Cannot calculate square root of negative number ${value}!`);
    }
    return Math.sqrt(value);
  };

  function logn(value: number, base: number): number {
    typeof value === 'number' || report.number('std.logn', value);
    if (value <= 0) {
      const logType = (base === undefined)
        ? 'natural logarithm'
        : `logarithm to base ${base}`;
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.logn: Cannot calculate ${logType} of ${value}!`);
    }
    if (base === undefined) {
      return Math.log(value);
    }
    typeof base === 'number' || report.number('std.logn', base);
    if (base <= 0) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `std.logn: Invalid base for logarithm: ${base}!`);
    }
    return Math.log(value) / Math.log(base);
  };

  function acos(value: number): number {
    typeof value === 'number' || report.number('std.acos', value);
    return Math.acos(value);
  };

  function asin(value: number): number {
    typeof value === 'number' || report.number('std.asin', value);
    return Math.asin(value);
  };

  function atan(value: number): number {
    typeof value === 'number' || report.number('std.atan', value);
    return Math.atan(value);
  };

  function cos(value: number): number {
    typeof value === 'number' || report.number('std.cos', value);
    return Math.cos(value);
  };

  function sin(value: number): number {
    typeof value === 'number' || report.number('std.sin', value);
    return Math.sin(value);
  };

  function tan(value: number): number {
    typeof value === 'number' || report.number('std.tan', value);
    return Math.tan(value);
  };

  function atan2(y: number, x: number): number {
    typeof y === 'number' || report.number('std.atan2', y);
    typeof x === 'number' || report.number('std.atan2', x);
    return Math.atan2(y, x);
  };

  function truncate(value: number, places: number = 0): number {
    typeof value === 'number'  || report.number('std.truncate', value);
    typeof places === 'number' || report.number('std.truncate', places);
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
    typeof min === 'number' || report.number('std.random_int', min);
    typeof max === 'number' || report.number('std.random_int', max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  function count(start: number = 0, end: number): Shelf<number> {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    typeof start === 'number' || report.number('std.count', start);
    typeof end   === 'number' || report.number('std.count', end);

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

  /* ---------------------------
   * Byte streams and weirdness.
   * --------------------------- */
  function from_bytes(shelf: Shelf<number>): string {
    if (!globalThis.TextDecoder) {
      throw new MewlixError(ErrorCode.CriticalError,
        `std.from_bytes: 'TextDecoder' constructor not available in global object!`);
    }
    isShelf(shelf) || report.shelf('std.from_bytes', shelf);
    const bytes = new Uint8Array(shelfLength(shelf));
    let i = bytes.length - 1;
    for (const byte of shelfIterator(shelf)) {
      typeof byte === 'number' || report.number('std.from_bytes', byte);
      bytes[i--] = byte;
    }
    return new TextDecoder('utf-8').decode(bytes);
  };

  function to_bytes(value: string): Shelf<number> {
    if (!globalThis.TextEncoder) {
      throw new MewlixError(ErrorCode.CriticalError,
        `std.to_bytes: 'TextDecoder' constructor not available in global object!`);
    }
    typeof value === 'string' || report.string('std.to_bytes', value);
    const bytes = new TextEncoder().encode(value);
    let shelf = shelfBottom<number>();
    for (let i = 0; i < bytes.length; i++) {
      shelf = shelfPush(shelf, bytes[i]);
    }
    return shelf;
  };

  /* ---------------------------
   * I/O operations.
   * --------------------------- */
  function read(key: string): string | null {
    typeof key === 'string' || report.string('std.read', key);
    return globalThis.localStorage?.getItem(key);
  };

  function save(key: string, contents: string): void {
    typeof key === 'string'      || report.string('std.save', key);
    typeof contents === 'string' || report.string('std.save', contents);
    globalThis.localStorage?.setItem(key, contents);
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
    const message = purrify(value);
    meow?.meow?.(message);
    return message;
  };

  function to_json(value: MewlixValue): string {
    return JSON.stringify(toSerializable(value));
  };

  function from_json(value: string): MewlixValue {
    typeof value === 'string' || report.string('std.from_json', value);
    return fromSerializable(JSON.parse(value));
  };

  function log(value: MewlixValue): void {
    const message = purrify(value);
    console?.log(`[mewlix] ${message}`);
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
    return createBox(bindings);
  })();

  const base = {
    purr,
    cat,
    itty,
    bitty,
    kitty,
    trim,
    tear,
    push_down,
    push_up,
    poke,
    nuzzle,
    empty,
    join,
    take,
    drop,
    reverse,
    sort,
    shuffle,
    find,
    insert,
    remove,
    map,
    filter,
    fold,
    any,
    all,
    zip,
    repeat,
    sequence,
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
    from_bytes,
    to_bytes,
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
  return base;
}

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
    box: <T>(obj: T) => createBox(obj, true),
    shelf: <T>(...items: T[]) => shelfFromArray(items),
    inject<T>(key: string, record: Record<string, T>): void {
      const yarnball = createYarnBall(key, record);
      addModule(modules, key, () => yarnball);
    },
  };

  // a default 'meow' implementation
  const meow: MeowState = {
    meow(_) {
      throw new MewlixError(ErrorCode.CriticalError,
        'meow: Core function \'meow\' hasn\'t been implemented!');
    }
  };

  function setMeow(func: MeowFunc): void {
    meow.meow = func;
  }

  // meow.lib: Core libraries.
  const lib: Record<string, YarnBall<any>> = {};

  // meow.lib.std: Standard library.
  const base = standardLibrary(meow);
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
      ? function(index: number) { return base.poke(value, index); }
      : function(index: number) { return base.poke(value, index); };
  }

  function joinCurry(a: string): (b: string) => string;
  function joinCurry<T>(a: Shelf<T>): (b: Shelf<T>) => Shelf<T>;
  function joinCurry<T>(a: string | Shelf<T>) {
    return (typeof a === 'string')
      ? function(b: string)   { return base.join(a, b); }
      : function(b: Shelf<T>) { return base.join(a, b); }
  }

  function takeCurry(value: string): (amount: number) => string;
  function takeCurry<T>(value: Shelf<T>): (amount: number) => Shelf<T>;
  function takeCurry<T>(value: string | Shelf<T>) {
    return (typeof value === 'string')
      ? function(amount: number) { return base.take(value, amount); }
      : function(amount: number) { return base.take(value, amount); };
  }

  function dropCurry(value: string): (amount: number) => string;
  function dropCurry<T>(value: Shelf<T>): (amount: number) => Shelf<T>;
  function dropCurry<T>(value: string | Shelf<T>) {
    return (typeof value === 'string')
      ? function(amount: number) { return base.drop(value, amount); }
      : function(amount: number) { return base.drop(value, amount); };
  }

  const baseCurry = {
    bitty: (a: number) =>
      (b: number) =>
        base.bitty(a, b),

    kitty: (a: number) =>
      (b: number) =>
        base.kitty(a, b),

    tear: (str: string) =>
      (start: number) =>
        (end: number) =>
          base.tear(str, start, end),

    poke: pokeCurry,
    join: joinCurry,
    take: takeCurry,
    drop: dropCurry,

    insert: <T>(shelf: Shelf<T>) =>
      (value: T) =>
        (index: number) =>
          base.insert(shelf, value, index),

    remove: <T>(shelf: Shelf<T>) =>
      (index: number) =>
        base.remove(shelf, index),

    map: <T1, T2>(callback: (x: T1) => T2) =>
      (shelf: Shelf<T1>) =>
        base.map(callback, shelf),

    filter: <T1>(predicate: (x: T1) => boolean) =>
      (shelf: Shelf<T1>) =>
        base.filter(predicate, shelf),

    fold: <T1, T2>(callback: (acc: T2, x: T1) => T2) =>
      (initial: T2) =>
        (shelf: Shelf<T1>) =>
          base.fold(callback, initial, shelf),

    any: <T>(predicate: (x: T) => boolean) =>
      (shelf: Shelf<T>) =>
        base.any(predicate, shelf),

    all: <T>(predicate: (x: T) => boolean) =>
      (shelf: Shelf<T>) =>
        base.all(predicate, shelf),

    zip: <T1, T2>(a: Shelf<T1>) =>
      (b: Shelf<T2>) =>
        base.zip(a, b),

    repeat: <T>(callback: (i?: number) => T) =>
      (number: number) =>
        base.repeat(callback, number),

    sequence: <T>(callback: (i?: number) => T) =>
      (number: number) =>
        base.sequence(callback, number),

    foreach: <T>(callback: (x: T) => void) =>
      (shelf: Shelf<T>) =>
        base.foreach(callback, shelf),

    tuple: (a: MewlixValue) =>
      (b: MewlixValue) =>
        base.tuple(a, b),

    min: (a: number) =>
      (b: number) =>
        base.min(a, b),

    max: (a: number) =>
      (b: number) =>
        base.max(a, b),

    clamp: (value: number) =>
      (min: number) =>
        (max: number) =>
          base.clamp(value, min, max),

    logn: (value: number) =>
      (base_: number) =>
        base.logn(value, base_),

    atan: (y: number) =>
      (x: number) =>
        base.atan2(y, x),

    truncate: (value: number) =>
      (places: number) =>
        base.truncate(value, places),

    random_int: (min: number) =>
      (max: number) =>
        base.random_int(min, max),

    count: (start: number) =>
      (end: number) =>
        base.count(start, end),

    save: (key: string) =>
      (contents: string) =>
        base.save(key, contents),
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
    fromJSON: fromSerializable,
    numbers,
    boolean,
    strings,
    shelf,
    box,
    clowder,
    catTree,
    collections,
    yarnball,
    compare,
    relation,
    reflection,
    convert,
    internal,
    meow: (x: string) => meow.meow(x),
    setMeow,
    wrap,
    api,
    lib,
    run,
  };
}

export default createMewlix;
export type Mewlix = ReturnType<typeof createMewlix>;
