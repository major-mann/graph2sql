import assert from 'node:assert';
import { StoreFieldLinked, StoreFieldScalar, TypeObject, TypeObjectField } from '../../store/store-type.js';
import { Context, Transaction } from '../../type.js';
import { Provider } from '../../store/provider/provider.js';

export function convert(definition: TypeObject, arg: object, prefix?: string) {
  const result: Record<string, unknown> = {};
  const pfx = prefix ? `${prefix}.` : ``;
  for (const [key, value] of Object.entries(arg)) {
    const field = definition.fields[key];
    assert(field, `Unknown field "${key}" requested`);

    if (field.store instanceof StoreFieldScalar) {
      result[resultName(field.store.name)] = field.store.type.encode(value);
      continue;
    }

    if (field.store instanceof StoreFieldLinked) {
      const linked = field.store as StoreFieldLinked;

      assert(linked.kind.startsWith(`1:`), `Linked field "${key}" is not a 1:? relationship`);

      const findField = (def: TypeObject, column: string) => {
        const field = Object.values(def.fields)
          .find((field) => field.store instanceof StoreFieldScalar && field.store.name === column)
        assert(field, `Field "${key}" has invalid column "${column}"`);
        return field as TypeObjectField<StoreFieldScalar>;
      };

      const columns = linked.columns.map((column) => findField(definition, column));
      const foreignColumns = linked.foreignColumns.map((column) => findField(linked.target, column));
      assert(columns.length === foreignColumns.length, `Linked field "${key}" has mismatched columns`);

      let writeValues: Record<string, unknown>;
      if (value === null) {
        writeValues = Object.fromEntries(
          columns.map((column) => [`${pfx}${column.store.name}`, null]),
        );
      } else {
        writeValues = Object.fromEntries(
          columns.map((column, index) => {
            const foreignColumn = foreignColumns[index];
            assert(column && foreignColumn, `Linked field "${key}" has invalid columns`);

            const foreignField = linked.target.fields[foreignColumn.name];
            assert(foreignField, `Linked field "${key}" has invalid foreign column "${foreignColumn.name}"`);
            assert(foreignField.store instanceof StoreFieldScalar, `Linked field "${key}" has invalid foreign column "${foreignColumn.name}"`);

            return [resultName(column.store.name), value[foreignField.name]];
          })
        );
      }
      Object.assign(result, writeValues);
    }

    throw new Error(`Unsupported field type "${field.store.constructor.name}" for "${key}"`);
  }
  return result;

  function resultName(name: string) {
    return `${pfx}${name}`;
  }
}

export function key(definition: TypeObject, arg: object) {
  const keyArgs = Object.fromEntries(
    Object.entries(arg).filter(([key]) => definition.primaryKey[key])
  );
  const convertedKey = convert(definition, keyArgs, definition.store.name);
  return convertedKey;
}

export function queryBuilder(provider: Provider, context: Context) {
  const builder = provider.knex.queryBuilder();
  if (context[Transaction]) {
    builder.transacting(context[Transaction]);
  }
  return builder;
}
