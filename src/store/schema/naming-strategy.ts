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
    // TODO: This is wrong.... 

    // For to n links we should pluralize the target entity name
    // For to 1 links we should singularize the target entity name

    // The name should be defined as follows:
    // TODO

    /*

    Examples

    Category
      products
      mainProducts
      subProducts
      SomeOtherNameThatIsTheSameThingProducts

    In the case of multi key
      SomeOtherNameThatIsTheSameThing
      AndAnother

    What should we name the link?
      <What name?>Products
      SomeOtherNameThatIsTheSameThingAndAnotherProducts

    Product
      CategoryId
      MainCategoryId
      SubCategoryId
      SomeOtherNameThatIsTheSameThing

    What about multi key links? That would need to use common prefix
    Could have the following forms
      MainCategoryOrganizationId
      MainOrganizationId
      AndAnother

    Name is determined by the target

    Name prefix is determined by the foreign columns
      When we have the exact name of the local column(s) in the foreign table, we should use
      the target entity name
      When we have a common prefix, we should use that prefix with the target entity name
      When we have neither we combine the field names for the prefix and use it with
        the target entity name

    Entity name should be singularized or pluralized based on the relationship kind

    */



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

    // This is wrong
    // if (columns.length > 1) {
    //   const common = commonPrefix(...columnNames);

    //   if (common.length > 0) {
    //     return Case(common);
    //   }

    //   return Case(`${entityName}_${targetEntityName}`);
    // }

    // const withColumn = Case(`${targetEntityName}_${columnNames[0]}`, { pascalCase: true });
    // if (entityName.endsWith(withColumn)) {
    //   return Case(`${entityName}_${targetEntityName}`);
    // }

    // const pascalTarget = Case(targetEntityName, { pascalCase: true });
    // const pascalForeign = Case(foreignColumnNames[0], { pascalCase: true });
    // if (entityName.endsWith(pascalForeign)) {
    //   return `${entityName.substring(0, entityName.length - pascalForeign.length)}${pascalTarget}`;
    // }
    // return `${entityName}${pascalTarget}`;

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
