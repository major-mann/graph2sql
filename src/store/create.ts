import assert from 'node:assert';

import {
  ReferenceKind,
  StoreEntity,
  StoreFieldLinked,
  StoreFieldScalar,
  Type,
  TypeBinary,
  TypeBoolean,
  TypeDate,
  TypeFloat,
  TypeId,
  TypeInt,
  TypeObject,
  TypeObjectField,
  TypeString,
} from './store-type.js';

import {
  StoreBinaryType,
  StoreBooleanType,
  StoreDateType,
  StoreFloatType,
  StoreIdType,
  StoreIntType,
  StoreJsonType,
  StoreStringType,
} from './type.js';

import { ProviderColumn, ProviderSchema, ProviderTable } from './provider/schema.js';
import { normalize } from './schema/normalize.js';
import { createSchema } from './schema/create.js';
import { DefaultNamingStrategy, NamingStrategy } from './schema/naming-strategy.js';
import { Link } from './schema/type.js';

export type CreateProps = {
  namingStrategy: NamingStrategy;
}

export function create(providerSchema: ProviderSchema, options: CreateProps = { namingStrategy: new DefaultNamingStrategy() }) {
  const normalized = normalize(providerSchema);
  const schema = createSchema(normalized, options);

  const types: Record<string, TypeObject> = {};

  for (const [name, info] of Object.entries(schema)) {
    const fields = () => {
      const fields: Record<string, TypeObjectField> = {};

      for (const [name, column] of Object.entries(info.columns)) {
        const storeType = asStoreType(info.provider, column.provider);
        const store = new StoreFieldScalar(column.provider.name, storeType);

        let type: Type;
        switch (store.type) {
          case StoreIdType:
            type = TypeId;
          case StoreStringType:
            type = TypeString;
            break;
          case StoreIntType:
            type = TypeInt;
            break;
          case StoreFloatType:
            type = TypeFloat;
            break;
          case StoreBinaryType:
            type = TypeBinary;
            break;
          case StoreBooleanType:
            type = TypeBoolean;
            break;
          case StoreDateType:
            type = TypeDate;
            break;
          default:
            throw new Error(`Unknown store type "${store.type.constructor.name}" received`);
        }

        fields[name] = new TypeObjectField({
          name,
          type,
          store,
          nullable: column.provider.nullable,
          primaryKey: column.primaryKey,
        });
      }

      for (const [linkName, link] of Object.entries(info.links)) {
        assert(fields[linkName] === undefined, `A column with the name "${linkName}" already exists`);

        const buildStoreField = (source: string, link: Link): StoreFieldLinked => {
          let current = link;
          let toMany = current.kind.endsWith(`:n`);

          while (toMany === false && current.pivot) {
            current = current.pivot;
            toMany = current.kind.endsWith(`:n`);
          }

          const [from] = link.kind.split(`:`);
          const kind = toMany ? `${from}:n` : `${from}:1`;

          const pivot = link.pivot
            ? buildStoreField(options.namingStrategy.nameEntity(link.pivot.provider.table), link.pivot)
            : undefined;

          return new StoreFieldLinked(
            types[source],
            types[link.target.name],
            link.provider.columns,
            link.provider.foreignColumns,
            kind as ReferenceKind,
            link.owner,
            pivot,
          );
        };

        const store = buildStoreField(name, link);

        const findColumn = (name: string) => Object.values(info.columns).find(column => column.provider.name === name);
        const nullable = link.provider.columns.every(column => findColumn(column)?.provider.nullable);

        fields[linkName] = new TypeObjectField({
          name: linkName,
          type: types[link.target.name], // TODO: Is this correct?
          store,
          nullable,
          primaryKey: false,
        });
      }

      return fields;
    }

    const type = new TypeObject({
      name,
      fields,
      store: new StoreEntity(info.provider.name, info.provider.isPivot),
    });
    types[name] = type;
  }

  return types;

  function asStoreType(table: ProviderTable, column: ProviderColumn) {
    const primaryKeys = Object.entries(table.columns).filter(([, column]) => column.primaryKey).map(([name]) => name);
    const isOnlyPrimaryKey = primaryKeys.length === 1 && primaryKeys[0] === column.name;

    if (isOnlyPrimaryKey) {
      return StoreIdType;
    }

    switch (column.type) {
      case `string`:
        return StoreStringType;
      case `integer`:
        return StoreIntType;
      case `numeric`:
        return StoreFloatType;
      case `binary`:
        return StoreBinaryType;
      case `boolean`:
        return StoreBooleanType;
      case `date`:
        return StoreDateType;
      case `json`:
        return StoreJsonType;
      default:
        throw new Error(`Unknown column type "${column.type}" received`);
    }
  }
}
