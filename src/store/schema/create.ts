import { assert } from 'console';
import { tableLinks } from './link.js';
import { NamingStrategy } from './naming-strategy.js';
import { NormalizedProviderSchema, Schema } from './type.js';

export type CreateProps = {
  namingStrategy: NamingStrategy;
}

export function createSchema(schema: NormalizedProviderSchema, options: CreateProps): Schema {
  const result: Schema = {};

  for (const [tableName, table] of Object.entries(schema)) {
    const name = options.namingStrategy.nameEntity(tableName);

    const columns = Object.fromEntries(
      Object.entries(table.columns).map(([columnName, column]) => {
        const name = options.namingStrategy.nameField(tableName, columnName);
        return [name, {
          name,
          provider: column,
          primaryKey: column.primaryKey,
        }];
      })
    );

    result[name] = {
      name,
      provider: table,

      columns,
      links: {},
    };
  }

  for (const table of Object.values(result)) {
    const links = Array.from(tableLinks(result, table.name));

    for (const link of links) {
      const name = options.namingStrategy.nameLink(table.provider.name, link);
      assert(table.links[name] === undefined, `link "${name}" already exists`);
      table.links[name] = link;
    }
  }

  return result;
}
