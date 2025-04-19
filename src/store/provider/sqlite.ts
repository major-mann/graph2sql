import { Knex } from 'knex';
import { StoreType, types } from '../type.js';
import { Provider } from './provider.js';
import { ProviderForeignKey, ProviderSchema, ProviderTable } from './schema.js';

export class SqliteProvider extends Provider {
  readonly knex: Knex;

  constructor(knex: Knex) {
    super();
    this.knex = knex;
  }

  async schema(): Promise<ProviderSchema> {
    const tables = await fetchTables.call(this);
    const processed = await Promise.all(tables.map((table: string) => processTable.call(this, table)));

    return Object.fromEntries(processed.map((table: ProviderTable) => [table.name, table]));

    async function processTable(this: SqliteProvider, tableName: string) {
      const columns = await fetchColumns.call(this, tableName);
      const tableForeignKeys = await fetchForeignKeys.call(this, tableName);

      const foreignKeys = tableForeignKeys.reduce((acc: Record<string, any[]>, item: any) => {
        if (acc[item.id]) {
          acc[item.id].push(item);
        } else {
          acc[item.id] = [item];
        }
        return acc;
      }, {});
      const indexes = await fetchIndexes.call(this, tableName);

      const table: ProviderTable = {
        name: tableName,
        columns: {},
        foreignKeys: [],
        indexes: [],
      };

      for (const column of columns) {
        const definition = {
          name: column.name,
          type: asSchemaType(column.type),
          defaultValue: column.dflt_value,
          nullable: Boolean(column.notnull) === false,
          primaryKey: Boolean(column.pk),
        };

        table.columns[column.name] = definition;
      }

      const keys: ProviderForeignKey[] = [];
      for (const item of Object.keys(foreignKeys)) {
        foreignKeys[item].sort(({ seq: a }: { seq: number }, { seq: b }: { seq: number }) => a - b);

        keys.push({
          table: tableName,
          foreignTable: foreignKeys[item][0].table,
          columns: foreignKeys[item].map(({ from }: { from: string }) => from),
          foreignColumns: foreignKeys[item].map(({ to }: { to: string }) => to),
        });
      }
      table.foreignKeys = keys;

      for (const index of indexes) {
        const columns = await fetchIndexColumns.call(this, index.name);
        const definition = {
          name: index.name,
          unique: Boolean(index.unique),
          columns: columns.map(({ name }: { name: string }) => name),
        };
        table.indexes.push(definition);
      }

      return table;
    }

    async function fetchTables(this: SqliteProvider) {
      const tables = await this.knex.raw(`select name from sqlite_master where type = 'table'`);
      return tables
        .filter((table: any) => !table.name.startsWith(`sqlite_`))
        .map((table: any) => table.name);
    }

    async function fetchColumns(this: SqliteProvider, tableName: string) {
      const columns = await this.knex.raw(`pragma table_info('${tableName}')`);
      return columns;
    }

    async function fetchForeignKeys(this: SqliteProvider, tableName: string) {
      const foreignKeys = await this.knex.raw(`pragma foreign_key_list('${tableName}')`);
      return foreignKeys;
    }

    async function fetchIndexes(this: SqliteProvider, tableName: string) {
      const indexes = await this.knex.raw(`PRAGMA index_list('${tableName}')`);
      return indexes
        .filter((index: any) => index.origin === `c`);
    }

    async function fetchIndexColumns(this: SqliteProvider, indexName: string) {
      const columns = await this.knex.raw(`PRAGMA index_info('${indexName}')`);
      return columns;
    }

    function asSchemaType(type: string): `integer` | `numeric` | `string` | `binary` | `date` | `boolean` {
      switch (type.toLowerCase()) {
        case `bit`:
          return `boolean`;
        case `integer`:
          return `integer`;
        case `real`:
        case `numeric`:
          return `numeric`;
        case `text`:
          return `string`;
        case `blob`:
          return `binary`;
        case `date`:
        case `datetime`:
          return `date`;
        default:
          throw new Error(`Unexpected column type: ${type}`);
      }
    }
  }

  types(): Record<keyof typeof types, StoreType> {
    return {
      ...types,
      StoreBinaryType: new SqliteBinaryType(),
    };
  }

  supportsReturning(type: `insert` | `insert-id` | `update` | `delete`): boolean {
    switch (type) {
      case `insert`:
        return true;
      case `update`:
      case `delete`:
      case `insert-id`:
      default:
        return false;
    }
  }

  rowId(column: string): string {
    return column;
  }
}

class SqliteBinaryType implements StoreType<Uint8Array, Buffer> {
  encode(value: Uint8Array): Buffer {
    return Buffer.from(value);
  }

  decode(value: Buffer): Uint8Array {
    return value;
  }
}
