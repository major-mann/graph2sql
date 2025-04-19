import assert from 'node:assert';
import { StoreType } from './type.js';

type LateBound<T> = T | (() => T);

export type ReferenceKind = `1:1` | `1:n` | `n:1` | `n:n`;

export class Type {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class TypeId extends Type {
  constructor() {
    super(`id`);
  }
}

class TypeInt extends Type {
  constructor() {
    super(`int`);
  }
}

class TypeFloat extends Type {
  constructor() {
    super(`float`);
  }
}

class TypeString extends Type {
  constructor() {
    super(`string`);
  }
}

class TypeBoolean extends Type {
  constructor() {
    super(`boolean`);
  }
}

class TypeDate extends Type {
  constructor() {
    super(`date`);
  }
}

class TypeJson extends Type {
  constructor() {
    super(`json`);
  }
}

class TypeBinary extends Type {
  constructor() {
    super(`binary`);
  }
}

class TypeList extends Type {
  readonly ofType: Type;

  constructor(ofType: Type) {
    super(`[${ofType.name}]` as any);
    this.ofType = ofType;
  }
}

class TypeNotNull extends Type {
  readonly type: Type;

  constructor(type: Type) {
    super(`${type.name}!`);
    this.type = type;
  }
}

class StoreEntity {
  readonly name: string;
  readonly isPivot: boolean;


  constructor(name: string, pivot = false) {
    this.name = name;
    this.isPivot = pivot;
  }
}

class StoreField { }

class StoreFieldScalar extends StoreField {
  readonly name: string;
  readonly type: StoreType;

  constructor(name: string, type: StoreType) {
    super();
    this.name = name;
    this.type = type;
  }
}

class StoreFieldLinked extends StoreField {
  readonly source: TypeObject;
  readonly target: TypeObject;
  readonly columns: string[];
  readonly foreignColumns: string[];
  readonly kind: ReferenceKind;
  readonly pivot?: StoreFieldLinked;
  readonly owner: boolean;

  // TODO: owner?

  constructor(source: TypeObject, target: TypeObject, columns: string[], foreignColumns: string[], kind: ReferenceKind, owner: boolean, pivot?: StoreFieldLinked) {
    super();

    assert(source, `source MUST be supplied`);
    assert(target, `target MUST be supplied`);
    assert(columns.length === foreignColumns.length, `columns and foreignColumns MUST have the same length`);
    assert(columns.length > 0, `columns and foreignColumns MUST have at least one column`);

    this.source = source;
    this.target = target;
    this.columns = columns;
    this.foreignColumns = foreignColumns;
    this.kind = kind;
    this.owner = owner;
    this.pivot = pivot;
  }
}

type TypeObjectFieldProps<TStore extends StoreField = StoreField> = {
  name: string;
  type: Type;
  description?: string;
  store: TStore;
  nullable: boolean;
  primaryKey: boolean;
}

class TypeObjectField<TStore extends StoreField = StoreField> {
  readonly name: string;
  readonly type: Type;
  readonly description?: string;
  readonly store: TStore;
  readonly nullable: boolean;
  readonly primaryKey: boolean;

  constructor({ name, type, description, store, nullable, primaryKey }: TypeObjectFieldProps<TStore>) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.store = store;
    this.nullable = nullable;
    this.primaryKey = primaryKey;
  }
}

type TypeObjectProps = {
  name: string;
  description?: string;
  fields: LateBound<Record<string, TypeObjectField>>;
  store: StoreEntity;
}

class TypeObject extends Type {
  readonly store: StoreEntity;
  readonly description?: string;
  #fields: () => Record<string, TypeObjectField>;
  #primaryKey?: Record<string, TypeObjectField<StoreFieldScalar>> = undefined;
  #scalars?: Record<string, TypeObjectField<StoreFieldScalar>> = undefined;

  get fields(): Record<string, TypeObjectField> {
    return this.#fields();
  }

  get primaryKey(): Record<string, TypeObjectField<StoreFieldScalar>> {
    if (this.#primaryKey === undefined) {
      this.#primaryKey = {};
      for (const [name, field] of Object.entries(this.fields)) {
        if (field.primaryKey) {
          this.#primaryKey[name] = field as TypeObjectField<StoreFieldScalar>;
        }
      }
    }
    return this.#primaryKey;
  }

  get scalars(): Record<string, TypeObjectField<StoreFieldScalar>> {
    if (this.#scalars === undefined) {
      this.#scalars = {};
      for (const [name, field] of Object.entries(this.fields)) {
        if (field instanceof TypeObjectField === false) {
          continue;
        }
        this.#scalars[name] = field as TypeObjectField<StoreFieldScalar>;
      }
    }
    return this.#scalars;
  }

  constructor({ name, description, store, fields }: TypeObjectProps) {
    super(name);
    this.store = store;
    this.description = description;

    let cache: Record<string, TypeObjectField> | undefined = typeof fields === `function` ? undefined : fields;
    this.#fields = () => {
      if (cache === undefined) {
        cache = (fields as Function)();
      }
      return cache!;
    };
  }
}

const Id = new TypeId();
const Int = new TypeInt();
const Float = new TypeFloat();
const String = new TypeString();
const Boolean = new TypeBoolean();
const Date = new TypeDate();
const Json = new TypeJson();
const Binary = new TypeBinary();

export {
  Id as TypeId,
  Int as TypeInt,
  Float as TypeFloat,
  String as TypeString,
  Boolean as TypeBoolean,
  Date as TypeDate,
  Json as TypeJson,
  Binary as TypeBinary,

  StoreEntity,
  StoreField,
  StoreFieldScalar,
  StoreFieldLinked,

  TypeList,
  TypeNotNull,
  TypeObjectFieldProps,
  TypeObjectField,
  TypeObjectProps,
  TypeObject,
};
