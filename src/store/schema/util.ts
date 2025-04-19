import { ProviderForeignKey } from '../provider/schema.js';

export function reverseKey(fKey: ProviderForeignKey): ProviderForeignKey {
  return {
    table: fKey.foreignTable,
    columns: fKey.foreignColumns,
    foreignTable: fKey.table,
    foreignColumns: fKey.columns,
  };
}
