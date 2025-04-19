import assert from 'node:assert';
import { Kind, SelectionNode, FieldNode } from 'graphql';
import { Knex } from 'knex';
import { StoreFieldLinked, StoreFieldScalar, TypeObject, TypeObjectField } from '../../store/store-type.js';
import { KEY, SEPARATOR } from '../../constant.js';

export function extractSelection(node: SelectionNode, path: string[]) {
  if (path.length === 0) {
    return node;
  }

  assert(node.kind === Kind.FIELD, `Unexpected kind "${node.kind}" received`);
  assert(node.selectionSet, `Expected selection set`);

  for (const item of node.selectionSet.selections) {
    if (item.kind !== Kind.FIELD) {
      continue;
    }
    if (item.name.value !== path[0]) {
      continue;
    }
    return extractSelection(item, path.slice(1));
  }

  assert.fail(`Unable to find selection`);
}

export function hasSelection(node: SelectionNode, path: string[]) {
  if (path.length === 0) {
    return true;
  }

  // TODO: Fragment spread, inline fragment
  assert(node.kind === Kind.FIELD, `Unexpected kind "${node.kind}" received`);

  if (!node.selectionSet) {
    return false;
  }

  for (const item of node.selectionSet.selections) {
    // TODO: Fragment spread, inline fragment
    if (item.kind !== Kind.FIELD) {
      continue;
    }

    if (item.name.value !== path[0]) {
      continue;
    }

    return hasSelection(item, path.slice(1));
  }

  return false;
}

export function applySelect(
  entity: TypeObject,
  builder: Knex.QueryBuilder<any, any>,
  field: FieldNode,
  path: string[] = [entity.store.name],
  fieldPath: string[] = [],
) {
  // TODO: We need to update the code to check if the fields selected in a sub selection
  //  are available in the source table. If so, we don't need to join

  const prop: TypeObjectField = entity.fields[field.name.value];
  assert(prop, `Unknown field "${field.name.value}" requested`);
  const alias = [...fieldPath, field.name.value].join(SEPARATOR);

  if (field.selectionSet === undefined) {
    assert(prop.type instanceof TypeObject === false, `Expected a scalar type`);
    assert(prop.store instanceof StoreFieldScalar, `Expected a scalar field`);
    const columnName = [...path, prop.store.name].join(`.`);
    builder = builder.select(`${columnName} as ${alias}`);
    return builder;
  }

  const link = prop.store as StoreFieldLinked;

  const targetFields = Object.values(link.target.fields);
  const findColumn = (name: string) => targetFields.find(
    column => column.store instanceof StoreFieldScalar && column.store.name === name
  ) as TypeObjectField<StoreFieldScalar> | undefined;

  // If we only have columns from the source table, and no pivot,
  //  we can skip the join (Making sure the selected columns from 
  //  the source table are aliased correctly)
  if (!link.pivot) {
    // TODO: Foreign columns has the database name... item.name.value is the
    //  converted name....
    // We need to lookup the name in the target to get get the correct column name
    const linkColumns = link.foreignColumns.map(findColumn).map((column) => column!.name);

    const additional = field.selectionSet.selections.filter(
      (item) => item.kind === Kind.FIELD && linkColumns.includes(item.name.value) === false
    );

    if (additional.length === 0) {
      for (const column of link.columns) {
        const columnName = `${link.source.store.name}.${column}`;
        const targetName = findColumn(column)!.name;
        const columnAlias = [alias, targetName].join(SEPARATOR);
        builder = builder.select(`${columnName} as ${columnAlias}`);
      }
      return builder;
    }
  }

  let hasOuter = false;
  const join = (source: string, link: StoreFieldLinked) => {
    const target = link.pivot
      ? randomName(link.source.store.name)
      : alias;

    const table = link.pivot
      ? link.pivot.source.store.name
      : link.target.store.name;

    builder = builder.join(`${table} as ${target}`, function () {
      const nullable = link.columns.every(column => findColumn(column)?.nullable);

      // TODO: Figure out how to get knex to give us a bracketed join
      //  i.e. left outer join ( someSource on ... inner join someOtherSource on ... )
      // TODO: Is endsWith condition correct?
      if (hasOuter || nullable || link.kind.endsWith(`:n`)) {
        hasOuter = true;
        this.type(`left outer`);
      } else {
        this.type(`inner`);
      }

      link.columns.forEach((column, idx) => {
        this.on(`${source}.${column}`, `=`, `${target}.${link.foreignColumns[idx]}`);
      });
    });

    if (link.pivot) {
      builder = join(target, link.pivot);
    }

    return builder;
  };

  builder = join(link.source.store.name, link);

  // We need the key of each entity so once we have the result, we can
  //  properly transform the row form into a nested object form.
  for (const [name, field] of Object.entries(link.target.primaryKey)) {
    const identifier = `${alias}.${field.store.name}`
    const columnAlias = [alias, KEY, name].join(SEPARATOR);
    builder = builder.select(`${identifier} as ${columnAlias}`);
  }

  for (const selection of field.selectionSet.selections) {
    const subField = selection as FieldNode;
    builder = applySelect(link.target, builder, subField, [alias], [...fieldPath, field.name.value]);
  }

  return builder;
}

function randomName(prefix = ``) {
  return `${prefix}_${Math.random().toString(36).substring(7)}`;
}
