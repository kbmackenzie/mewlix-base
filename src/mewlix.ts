'use strict';

/* - * - * - * - * - * - * - * - *
 * Symbols (Core)
/* - * - * - * - * - * - * - * - * */
const tag  = Symbol('tag');
const wake = Symbol('wake');

/* - * - * - * - * - * - * - * - *
 * Types (Core)
/* - * - * - * - * - * - * - * - * */
type Maybe<T> =
  | { type: 'some', value: T }
  | { type: 'none' };

type If<T> = T | undefined;

type ObjectTag = 'shelf' | 'box' | 'clowder' | 'clowder instance' | 'cat tree' | 'cat fruit' | 'yarnball';
type MewlixObject = { [tag]: ObjectTag };

type Shelf<T> =
  | Readonly<{ [tag]: 'shelf', kind: 'node', value: T, tail: Shelf<T>, length: number }>
  | Readonly<{ [tag]: 'shelf', kind: 'bottom', }>;

type Box<T> = Readonly<{
  [tag]: 'box',
  bindings: Record<string, T>;
  get(key: string): If<T>;
  set(key: string, value: T): void;
}>;

type Initializer<T> =
  (bindings: Record<string, T>) => void;

type Clowder<T> = Readonly<{
  [tag]: 'clowder';
  kind: symbol;
  name: string;
  parent: Clowder<T> | null;
  initialize: Initializer<T>;
}>;

type ClowderInstance<T> = Readonly<{
  [tag]: 'clowder instance',
  clowder: Clowder<T>;
  parent: ClowderInstance<T> | null;
  bindings: Record<string, T>;
  get(key: string): If<T>;
  set(key: string, value: T): void;
  outside(key: string): If<T>;
}>;

type YarnBall<T> = Readonly<{
  [tag]: 'yarnball',
  key: string;
  get(key: string): If<T>;
}>;

type CatTree = Readonly<{
  [tag]: 'cat tree';
  name: string;
  fruits: Record<string, CatFruit>;
  get(key: string): If<CatFruit>;
}>;

type CatFruit = Readonly<{
  [tag]: 'cat fruit';
  key: string;
  value: number;
  get(key: string): If<string | number>;
}>;

/* - * - * - * - * - * - * - * - *
 * Shelf: Logic + Operations
/* - * - * - * - * - * - * - * - * */
function newShelf<T>(value: T, tail?: Shelf<T>): Shelf<T> {
  return {
    [tag]: 'shelf',
    kind: 'node',
    value: value,
    tail: tail ?? { [tag]: 'shelf', kind: 'bottom' },
    length: tail ? shelfLength(tail) + 1 : 1,
  };
}

function shelfLength<T>(shelf: Shelf<T>): number {
  if (shelf.kind === 'bottom') return 0;
  return shelf.length;
}

function shelfPush<T>(shelf: Shelf<T>, value: T): Shelf<T> {
  return newShelf(value, shelf);
}

function shelfPeek<T>(shelf: Shelf<T>): Maybe<T> {
  if (shelf.kind === 'bottom') return { type: 'none' };
  return { type: 'some', value: shelf.value };
}

function shelfPop<T>(shelf: Shelf<T>): Maybe<Shelf<T>> {
  if (shelf.kind === 'bottom') return { type: 'none' };
  return { type: 'some', value: shelf.tail };
}

function shelfContains<T>(shelf: Shelf<T>, value: T): boolean {
  let node = shelf;
  while (node.kind === 'node') {
    if (node.value === value) return true;
    node = node.tail;
  }
  return false;
}

function shelfConcat<T>(a: Shelf<T>, b: Shelf<T>): Shelf<T> {
  if (a.kind === 'bottom') return b;
  if (b.kind === 'bottom') return a;

  const bucket = shelfToArray(b);
  let output: Shelf<T> = a;
  for (const value of bucket) {
    output = shelfPush(output, value);
  }
  return output;
}

function shelfReverse<T>(shelf: Shelf<T>): Shelf<T> {
  let output: Shelf<T> = { [tag]: 'shelf', kind: 'bottom' };
  for (let node = shelf; node.kind === 'node'; node = node.tail) {
    output = shelfPush(output, node.value);
  }
  return output;
}

function* shelfIterator<T>(a: Shelf<T>): Generator<T, void, void> {
  let node: Shelf<T> = a;
  while (node.kind === 'node') {
    yield node.value;
    node = node.tail;
  }
}

function shelfToArray<T>(shelf: Shelf<T>): T[] {
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

function shelfFromArray<T>(array: T[]): Shelf<T> {
  return array.reduce(
    (shelf: Shelf<T>, value: T) => shelfPush<T>(shelf, value),
    { [tag]: 'shelf', kind: 'bottom' },
  );
}

/* - * - * - * - * - * - * - * - *
 * Box: Logic + Operations
/* - * - * - * - * - * - * - * - * */

function createBox<T>(init: (box: Box<T>) => void): Box<T> {
  const innerBox: Record<string, T> = {};
  const box: Box<T> = {
    [tag]: 'box',
    bindings: innerBox,
    get(key: string): If<T> {
      return innerBox[key];
    },
    set(key: string, value: T): void {
      innerBox[key] = value;
    },
  };
  init(box);
  return box;
}

/* - * - * - * - * - * - * - * - *
 * Cat Tree: Logic + Operations
/* - * - * - * - * - * - * - * - * */

function createCatTree(name: string, keys: string[]): CatTree {
  const fruits: Record<string, CatFruit> = {};
  let i = 0;
  for (const key of keys) {
    const fruit: CatFruit = {
      [tag]: 'cat fruit',
      key: key,
      value: i,
      get(k: string): If<string | number> {
        if (k === 'key') return key;
        if (k === 'value') return i;
        return undefined;
      }
    };
    fruits[key] = fruit;
    i++;
  }
  return {
    [tag]: 'cat tree',
    name: name,
    fruits: fruits,
    get(key: string): If<CatFruit> {
      return fruits[key];
    },
  };
}

/* - * - * - * - * - * - * - * - *
 * Yarn Ball: Logic + Operations
/* - * - * - * - * - * - * - * - * */

type Bindings<T> = Record<string, () => T>;

function createYarnBall<T>(key: string, init: (yarn: Bindings<T>) => void): YarnBall<T> {
  const bindings: Bindings<T> = {};
  init(bindings);
  return {
    [tag]: 'yarnball',
    key: key,
    get(key: string): If<T> {
      return bindings[key]?.();
    }
  };
}

function mixYarnBall<T>(key: string, a: YarnBall<T>, b: YarnBall<T>) {
  /* Mix through closures; preserve the original yarnballs. */
  return {
    [tag]: 'yarnball',
    key: key,
    get(key: string): If<T> {
      const value = a.get(key);
      return (value === undefined) ? b.get(key) : value;
    }
  };
}

/* - * - * - * - * - * - * - * - *
 * Clowders: Logic + Operations
/* - * - * - * - * - * - * - * - * */

function createClowder<T>(name: string, parent: Clowder<T> | null, init: Initializer<T>): Clowder<T> {
  return {
    [tag]: 'clowder',
    kind: Symbol(name),
    name: name,
    parent: parent,
    initialize: init,
  };
}

function instanceClowder<T>(clowder: Clowder<T>): ClowderInstance<T> {
  const bindings: Record<string, T> = {};
  clowder.initialize(bindings);
  const parent = clowder.parent && instanceClowder(clowder.parent)
  return {
    [tag]: 'clowder instance',
    clowder: clowder,
    parent: parent,
    bindings: bindings,
    get(key: string): If<T> {
      if (key in bindings) return bindings[key];
      if (parent) return parent.get(key);
      return undefined;
    },
    set(key: string, value: T): void {
      bindings[key] = value;
    },
    outside(key: string): If<T> {
      if (parent) return parent.get(key);
      return undefined;
    },
  };
}

function instanceOf<T1, T2>(instance: ClowderInstance<T1>, clowder: Clowder<T2>): boolean {
  const kind = instance.clowder.kind;
  let c: Clowder<T2> | null = clowder;
  while (c) {
    if (c.kind === kind) return true;
    c = clowder.parent;
  }
  return false;
}

/* - * - * - * - * - * - * - * - *
 * Namespace: Logic + Operations
/* - * - * - * - * - * - * - * - * */

type Namespace<T> = Readonly<{
  [tag]: 'namespace',
  name: string;
  cache: Map<string, T>;
  modules: Map<string, () => T>;
}>;

function createNamespace<T>(name: string): Namespace<T> {
  return {
    [tag]: 'namespace',
    name: name,
    cache: new Map(),
    modules: new Map(),
  };
}

function getModule<T>(namespace: Namespace<T>, name: string): T | undefined {
  if (namespace.cache.has(name)) return namespace.cache.get(name);
  const mod = namespace.modules.get(name);
  if (!mod) return mod;
  return mod();
}

function addModule<T>(namespace: Namespace<T>, name: string, mod: () => T): void {
  namespace.modules.set(name, mod);
  if (namespace.cache.has(name)) {
    namespace.cache.delete(name);
  }
}

/* - * - * - * - * - * - * - * - *
 * Errors: Logic + Operations
/* - * - * - * - * - * - * - * - * */

enum ErrorCode {
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

const errorToString: Record<ErrorCode, string> = {
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

class MewlixError extends Error {
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
type MewlixFunction = (...args: any[]) => MewlixValue;

type MewlixValue =
  | number
  | string
  | boolean
  | MewlixObject
  | MewlixFunction
  | null
  | undefined
  | Promise<void>;

/* - * - * - * - * - * - * - * - *
 * Utilities
/* - * - * - * - * - * - * - * - * */

function getEntries<T>(record: Record<string, T>): [string, T][] {
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
  'box': function<T>(box: Box<T>): string {
    const items = getEntries(box.bindings)
      .map(([key, value]) => `"${key}": ${purrify(value)}`)
      .join(', ');
    return `📦 [${items}]`;
  },
  'clowder': function<T>(clowder: Clowder<T>): string {
    return `clowder ${clowder.name}`;
  },
  'clowder instance': function<T>(instance: ClowderInstance<T>): string {
    const items = getEntries(instance.bindings)
      .map(([key, value]) => `"${key}": ${purrify(value)}`)
      .join(', ');
    return `clowder ${instance.clowder.name} [${items}]`;
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

function purrify(value: any): string {
  if (typeof value === 'object' && tag in value) {
    return purrifyTable[value.tag as ObjectTag](value);
  }
  if (value === null || value === undefined) { return 'nothing'; }
  return String(value);
}

/* - * - * - * - * - * - * - * - *
 * JSON Conversion
/* - * - * - * - * - * - * - * - * */
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

const mewlixToJSON: Record<ObjectTag, (a: any) => JSONValue> = {
  'shelf': function<T>(shelf: Shelf<T>): JSONValue {
    return shelfToArray(shelf).map(toJSON);
  },
  'box': function<T>(box: Box<T>): JSONValue {
    return objectToJSON(box.bindings);
  },
  'clowder instance': function<T>(instance: ClowderInstance<T>): JSONValue {
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

function toJSON(value: any): JSONValue {
  if (typeof value === 'object' && tag in value) {
    return mewlixToJSON[value.tag as ObjectTag](value);
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

function fromJSON(value: JSONValue): MewlixValue {
  if (Array.isArray(value)) {
    return shelfFromArray(value.map(fromJSON));
  }
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
      return value;
    default:
      return null;
  }
}

/* - * - * - * - * - * - * - * - *
 * Value Utils
/* - * - * - * - * - * - * - * - * */

function isNothing(x: any): boolean {
  return x === null || x === undefined;
}

function clamp_(value: number, min: number, max: number): number {
  return (value < min) ? min : ((value > max) ? max : value);
}

function opaque(x: object): void {
  Object.defineProperty(x, 'get', {
    value: function(key: string) {
      throw new MewlixError(ErrorCode.InvalidOperation,
        `Cannot look up property "${key}": Object ${x} isn't accessible through Mewlix!`);
    },
  });
}
