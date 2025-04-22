import Case from 'camelcase';
import pluralize from 'pluralize';
import { assert } from 'console';
import { Link } from './type.js';
export type ItemType = `table` | `column` | `link`;

export type NamingStrategy = {
  nameEntity(name: string): string;
  nameField(tableName: string, name: string): string;
  nameLink(tableName: string, link: Link): string;
}

// TODO: Update this to something like "DefaultNamingStrategy"
export class DefaultNamingStrategy implements NamingStrategy {
  nameEntity(name: string): string {
    const pascal = Case(name, { pascalCase: true });
    const singular = pluralize.singular(pascal);
    return singular;
  }

  nameField(tableName: string, name: string): string {
    return Case(name);
  }

  nameLink(name: string, link: Link): string {
    const { target: { provider: { name: target } }, provider: { columns, foreignColumns } } = link;

    assert(columns.length === foreignColumns.length, `columns and foreignColumns must have the same length`);
    assert(columns.length > 0, `columns and foreignColumns must have at least one element`);

    const targetEntityName = this.nameEntity(target);
    const entityName = this.nameEntity(name);
    const columnNames = columns.map(column => this.nameField(name, column));
    const foreignColumnNames = foreignColumns.map(column => this.nameField(target, column));

    const resultCase = (str: string) => {
      if (link.kind.endsWith(`:n`)) {
        return Case(pluralize(str));
      }
      return Case(pluralize.singular(str));
    }

    const allColumnsMatch = columnNames.every((column, idx) => column === foreignColumnNames[idx]);
    if (allColumnsMatch) {
      return resultCase(targetEntityName);
    }

    const common = commonPrefix(...foreignColumnNames);
    if (common.length > 0) {
      return resultCase(`${common}_${targetEntityName}`);
    }

    return resultCase([...columnNames, targetEntityName].join(`_`));

    function commonPrefix(...strings: string[]): string {
      if (strings.length === 0) return "";
      if (strings.length === 1) return strings[0];

      let prefix = strings[0];

      for (let i = 1; i < strings.length; i++) {
        let j = 0;
        while (j < prefix.length && j < strings[i].length && prefix[j] === strings[i][j]) {
          j++;
        }
        prefix = prefix.substring(0, j);
        if (prefix === "") break; // No common prefix, exit early
      }

      return prefix;
    }
  }
}
