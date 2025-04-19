import assert from 'node:assert';
import isEqual from 'lodash.isequal';
import { CURSOR, KEY, SEPARATOR } from '../../constant.js';
import { StoreFieldLinked, StoreFieldScalar, TypeObject } from '../../store/store-type.js';

export function* postProcess(structure: TypeObject, data: Record<string, unknown>[]) {

  // TODO: We need to know the requested graphql structure....

  if (data.length === 0) {
    return;
  }

  // Key fields for the root object
  const rootKeys = Object.keys(data[0]).filter((key) => key.startsWith(`${KEY}${SEPARATOR}`));
  // Cursor fields for the root object
  const rootCursors = Object.keys(data[0]).filter((key) => key.startsWith(`${CURSOR}${SEPARATOR}`));
  // Whether a field is a key or a cursor
  const isSpecial = (key: string) => rootKeys.includes(key) || rootCursors.includes(key);
  // All the fields which do not belong to sub objects
  const rootFields = Object.keys(data[0]).filter((key) => isSpecial(key) === false && key.split(SEPARATOR).length === 1);
  // All the fields which belong to sub objects
  const nonRootFields = Object.keys(data[0]).filter((key) => isSpecial(key) === false && key.split(SEPARATOR).length > 1);

  while (data.length > 0) {
    const matching = extractMatching();
    if (rootKeys.length && rootKeys.every((key) => matching[0][key] === null)) {
      continue;
    }

    const rootObject = Object.fromEntries([
      ...rootCursors.map((key) => {
        return [key, matching[0][key]];
      }),
      ...rootFields.map((key) => {
        return [key, matching[0][key]];
      }),
    ]);

    // TODO: We need to process specialist fields like JSON and Binary
    for (const [name, value] of Object.entries(structure.fields)) {
      if (value.store instanceof StoreFieldScalar === false) {
        continue;
      }
      rootObject[name] = value.store.type.decode(rootObject[name]);
    }

    const grouped = nonRootFields.reduce((acc, key) => {
      const [root, ...rest] = key.split(SEPARATOR);
      if (acc[root] === undefined) {
        acc[root] = [];
      }
      acc[root].push(rest.join(SEPARATOR));
      return acc;
    }, {} as Record<string, string[]>);

    for (const field of Object.keys(grouped)) {
      const limitedData = matching.map((element) =>
        Object.fromEntries(
          Object.entries(element)
            .filter(([rowKey]) => rowKey.startsWith(`${field}${SEPARATOR}`))
            .map(([rowKey, value]) => [rowKey.slice(field.length + SEPARATOR.length), value]),
        ),
      );

      const typeField = structure.fields[field];
      assert(typeField, `Unknown field "${field}" requested`);
      assert(typeField.store instanceof StoreFieldLinked, `Expected a linked field`);
      assert(typeField.type instanceof TypeObject, `Expected a linked field to be an object`);

      const processed = Array.from(postProcess(typeField.type, limitedData));
      if (typeField.store.kind.endsWith(`:n`)) {
        rootObject[field] = processed;
      } else {
        assert(processed.length <= 1, `Expected at most one result`);
        rootObject[field] = processed[0];
      }
    }

    yield rootObject;
  }

  function extractMatching() {
    const matching: Record<string, unknown>[] = [];
    const first = data[0];
    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      if (rootKeys.every((key) => isEqual(first[key], element[key]))) {
        matching.push(element);
        data.splice(index, 1);
        index--;
      }
    }
    return matching;
  }
}
