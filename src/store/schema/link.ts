import assert from 'node:assert';
import { ProviderForeignKey, ProviderSchema, ProviderTable } from '../provider/schema.js';
import { Link, NormalizedProviderTable, Schema } from './type.js';
import { ReferenceKind } from '../store-type.js';
import { reverseKey } from './util.js';

export function* tableLinks(schema: Schema, name: string, ignore: ProviderForeignKey[] = []): Generator<Link> {
  const table = schema[name];
  assert(table, `table "${name}" not found`);

  for (const fKey of table.provider.foreignKeys) {
    if (ignore.some((key) => keyEqual(key, fKey))) {
      continue;
    }

    const target = Object.values(schema).find((table) => table.provider.name === fKey.foreignTable);
    assert(target, `table "${fKey.foreignTable}" not found`);

    const fromOne = primaryOrUnique(table.provider, fKey.columns);
    const toOne = primaryOrUnique(target.provider, fKey.foreignColumns);
    const from = fromOne ? `1` : `n`;
    const to = toOne ? `1` : `n`;

    const kind = `${from}:${to}` as ReferenceKind;

    const link: Link = {
      target,
      kind,
      provider: fKey,
      owner: true,
    };

    yield link;
  }

  for (const fKey of table.provider.reverseForeignKeys) {
    // TODO: Is this required for reverse foreign keys?
    if (ignore.some((key) => keyEqual(key, fKey))) {
      continue;
    }

    const target = Object.values(schema).find((table) => table.provider.name === fKey.foreignTable);
    assert(target, `table "${fKey.foreignTable}" not found`);

    const pivotLinks = target.provider.isPivot
      ? Array.from(tableLinks(schema, target.name, [reverseKey(fKey)]))
      : [];

    if (pivotLinks.length === 0) {
      const fromOne = primaryOrUnique(table.provider, fKey.columns);
      const toOne = primaryOrUnique(target.provider, fKey.foreignColumns);
      const from = fromOne ? `1` : `n`;
      const to = toOne ? `1` : `n`;

      const kind = `${from}:${to}` as ReferenceKind;

      const link: Link = {
        target,
        kind,
        provider: fKey,
        owner: false,
      };

      yield link;
      continue;
    }

    let tbl: NormalizedProviderTable = table.provider;
    for (const pivotLink of pivotLinks) {
      const fromOne = primaryOrUnique(tbl, fKey.columns);
      const toOne = primaryOrUnique(pivotLink.target.provider, fKey.foreignColumns);
      const from = fromOne ? `1` : `n`;
      const to = toOne ? `1` : `n`;
      tbl = pivotLink.target.provider;

      const kind = `${from}:${to}` as ReferenceKind;

      const link: Link = {
        target: pivotLink.target,
        kind,
        provider: fKey,
        pivot: pivotLink,
        owner: false,
      };
      yield link;
    }
  }

  function keyEqual(key1: ProviderForeignKey, key2: ProviderForeignKey): boolean {
    return key1.table === key2.table &&
      key1.foreignTable === key2.foreignTable &&
      arrayMatches(key1.columns, key2.columns) &&
      arrayMatches(key1.foreignColumns, key2.foreignColumns);
  }

  function arrayMatches(array1: unknown[], array2: unknown[]): boolean {
    if (array1.length !== array2.length) {
      return false;
    }

    const check = array2.slice();
    for (const element of array1) {
      const index = check.indexOf(element);
      if (index === -1) {
        return false;
      }
      check.splice(index, 1);
    }

    return check.length === 0;
  }
}

function primaryOrUnique(table: NormalizedProviderTable, columns: string[]) {
  const primaryKey = Object.entries(table.columns).filter(([, column]) => column.primaryKey).map(([name]) => name);

  if (stringArrayMatches(primaryKey, columns)) {
    return true;
  }

  for (const index of table.indexes) {
    if (index.unique && stringArrayMatches(index.columns, columns)) {
      return true;
    }
  }

  return false;
}

function stringArrayMatches(arr1: unknown[], arr2: unknown[]) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  const set1 = arr1.slice().sort();
  const set2 = arr2.slice().sort();

  return set1.every((value, index) => value === set2[index]);
}
