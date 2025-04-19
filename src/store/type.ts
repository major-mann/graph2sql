export type StoreType<TValue = any, TEncoded = any> = {
  encode: (value: TValue) => TEncoded;
  decode: (value: TEncoded) => TValue;
}

class StoreIdType implements StoreType<unknown, unknown> {
  encode(value: unknown): unknown {
    return value;
  }

  decode(value: unknown): unknown {
    return value;
  }
}

class StoreStringType implements StoreType<string, string> {
  encode(value: string): string {
    return value;
  }

  decode(value: string): string {
    return value;
  }
}

class StoreBooleanType implements StoreType<boolean, boolean> {
  encode(value: boolean): boolean {
    return value;
  }

  decode(value: boolean): boolean {
    return value;
  }
}

class StoreIntType implements StoreType<number, number> {
  encode(value: number): number {
    return value;
  }

  decode(value: number): number {
    return value;
  }
}

class StoreFloatType implements StoreType<number, number> {
  encode(value: number): number {
    return value;
  }

  decode(value: number): number {
    return value;
  }
}

class StoreDateType implements StoreType<Date, number> {
  encode(value: Date): number {
    return value.getTime();
  }

  decode(value: number): Date {
    return new Date(value);
  }
}

class StoreJsonType implements StoreType<unknown, string> {
  encode(value: unknown): string {
    if (value === `undefined`) {
      return ``;
    }
    return JSON.stringify(value);
  }

  decode(value: string): unknown {
    if (value === ``) {
      return undefined;
    }
    return JSON.parse(value);
  }
}

class StoreBinaryType implements StoreType<Uint8Array, Uint8Array> {
  encode(value: Uint8Array): Uint8Array {
    return value;
  }
  decode(value: Uint8Array): Uint8Array {
    return value;
  }
}

class StoreObjectType {
  readonly name: string;
  readonly fields: Record<string, StoreType>;
  readonly links: Record<string, StoreObjectType>;

  constructor(name: string, fields: Record<string, StoreType>, links?: Record<string, StoreObjectType>) {
    this.name = name;
    this.fields = fields;
    this.links = links ?? {};
  }
}

const StoreBinaryTypeInstance = new StoreBinaryType();
const StoreBooleanTypeInstance = new StoreBooleanType();
const StoreDateTypeInstance = new StoreDateType();
const StoreFloatTypeInstance = new StoreFloatType();
const StoreIdTypeInstance = new StoreIdType();
const StoreIntTypeInstance = new StoreIntType();
const StoreJsonTypeInstance = new StoreJsonType();
const StoreStringTypeInstance = new StoreStringType();

export const types = {
  StoreBinaryType: StoreBinaryTypeInstance,
  StoreBooleanType: StoreBooleanTypeInstance,
  StoreDateType: StoreDateTypeInstance,
  StoreFloatType: StoreFloatTypeInstance,
  StoreIdType: StoreIdTypeInstance,
  StoreIntType: StoreIntTypeInstance,
  StoreJsonType: StoreJsonTypeInstance,
  StoreStringType: StoreStringTypeInstance,
};

export {
  StoreBinaryTypeInstance as StoreBinaryType,
  StoreBooleanTypeInstance as StoreBooleanType,
  StoreDateTypeInstance as StoreDateType,
  StoreFloatTypeInstance as StoreFloatType,
  StoreIdTypeInstance as StoreIdType,
  StoreIntTypeInstance as StoreIntType,
  StoreJsonTypeInstance as StoreJsonType,
  StoreStringTypeInstance as StoreStringType,

  StoreObjectType,
}
