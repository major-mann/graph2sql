import { ProviderSchema, ProviderTable } from '../provider/schema.js';
import { NormalizedProviderSchema, NormalizedProviderTable } from './type.js';
import { reverseKey } from './util.js';

export function normalize(schema: ProviderSchema): NormalizedProviderSchema {
  const tables = Object.entries(schema).map(([name, table]) => {
    const isPivot = isPivotTable(table);

    const reverseForeignKeys = Object.entries(schema)
      .filter(([tableName]) => tableName !== name)
      .flatMap(([,targetTable]) => targetTable.foreignKeys)
      .filter(fKey => fKey.foreignTable === name)
      .map(reverseKey);

    return [name, {
      ...table,
      isPivot,
      reverseForeignKeys,
    } as NormalizedProviderTable];
  });

  return Object.fromEntries(tables);
}

function isPivotTable(table: ProviderTable): boolean {
  // TODO: Think about this carefully
  const columns = Object.entries(table.columns);
  const primaryColumns = columns.filter(([, column]) => column.primaryKey).map(([name]) => name);
  const referenceColumns = table.foreignKeys.map(fKey => fKey.columns).flat().filter((ele, idx, arr) => arr.indexOf(ele) === idx);

  for (const column of columns) {
      const primaryIndex = primaryColumns.indexOf(column[0]);
      if (primaryIndex === -1) {
        return false;
      }
      primaryColumns.splice(primaryIndex, 1);

      const referenceIndex = referenceColumns.indexOf(column[0]);
      if (referenceIndex === -1) {
        return false;
      }
      referenceColumns.splice(referenceIndex, 1);
  }

  return primaryColumns.length === 0 && referenceColumns.length === 0;
}