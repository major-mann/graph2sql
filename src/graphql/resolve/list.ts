import assert from 'node:assert';
import { Knex } from 'knex';
import { StoreFieldScalar, TypeObject, TypeObjectField } from '../../store/store-type.js';
import { FieldNode, GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Input, ListParams as ListParamsInput, Filter as FilterInput, Order as OrderInput } from '../type.js';
import { applySelect, extractSelection } from './select.js';
import { CURSOR, KEY, MAX_LIMIT, SEPARATOR } from '../../constant.js';
import { postProcess } from './result.js';
import { Context } from '../../type.js';
import { Provider } from '../../store/provider/provider.js';
import { queryBuilder } from './util.js';

export function createListResolver(
    definition: TypeObject,
    provider: Provider,
): GraphQLFieldResolver<unknown, Context, Input<ListParamsInput>, unknown> {
    return async function (parent: unknown, args: { input: ListParamsInput }, context: Context, info?: GraphQLResolveInfo) {
        const { before, after, first, last, order, filter, cursorOrder, reversed } = extractParams(args.input, definition);

        // Note: We process root fields separately, so that we can apply
        //  limits to the collection that will form the final root object
        // If we have subsequent joins, the base query gets wrapped in a "with"
        //  statement, and the final query is built on top of that

        let baseBuilder = queryBuilder(provider, context)
            .from(definition.store.name)
            .limit(first + 1);

        for (let index = 0; index < filter.length; index++) {
            const filterItem = filter[index];
            if (isRootField(filterItem.field)) {
                filter.splice(index, 1);
                index--;
                baseBuilder = processFilterItem(definition, baseBuilder, filterItem);
            }
        }

        for (const orderItem of order) {
            if (isRootField(orderItem.field)) {
                const identifier = fullNameFromFieldName(definition, orderItem.field);
                baseBuilder = baseBuilder.orderBy(identifier, orderItem.direction);
                // Note: We don't remove the order item from the list, as we need to
                //  apply it to the final query
            }
        }

        const applyBound = (lower: boolean, decoded: any[]) => {
            const operator = lower ? `>` : `<`;
            const alternateOperator = lower ? `<` : `>`;

            if (cursorOrder.length === 1) {
                const orderItem = cursorOrder[0];
                const opr = orderItem.direction === `DESC` ? alternateOperator : operator;
                const identifier = fullNameFromFieldName(definition, orderItem.field);
                baseBuilder = baseBuilder.where(identifier, opr, decoded[0]);
                return baseBuilder;
            }

            // If everything is in the same direction, we can use a tuple based comparison
            // TODO: knex doesn't directly support tuple based comparisons, so we need to
            //  use a raw query, which we don't want to do since it's not portable
            // So, until something changes, we'll use the multiple where conditions approach

            // const allMatch = cursorOrder.reduce<Direction | boolean>((acc, orderItem) => {
            //     if (orderItem.direction === acc) {
            //         return acc;
            //     }
            //     return false;
            // }, cursorOrder[0].direction);

            // if (allMatch) {
            //     // TODO: We need the provider to encode the names....
            //     const opr = cursorOrder[0].direction === `DESC` ? alternateOperator : operator;
            //     const names = cursorOrder.map((item) => item.field).map((name) => fullRawNameFromFieldName(definition, name));
            //     baseBuilder = baseBuilder.whereRaw(`(${names.join(`, `)}) ${opr} (?, ?)`, decoded);
            //     return baseBuilder;
            // }

            baseBuilder = baseBuilder.where(function () {
                const items = cursorOrder.slice();
                const values = decoded.slice();
                const previous: OrderInput[] = [];

                let first = true;
                do {
                    const item = items.shift()!;
                    const value = values.shift();
                    previous.push(item);

                    const opr = item.direction === `DESC` ? alternateOperator : operator;
                    const identifier = fullNameFromFieldName(definition, item.field);
                    if (first) {
                        this.where(identifier, opr, value);
                        first = false;
                        continue;
                    }

                    this.orWhere(function () {
                        for (let index = 0; index < previous.length; index++) {
                            const prev = previous[index];
                            const identifier = fullNameFromFieldName(definition, prev.field);
                            this.andWhere(identifier, `=`, decoded[index]);
                        }
                        this.andWhere(identifier, opr, value);
                    });
                } while (items.length > 0);
            });

            return baseBuilder;
        };

        if (after !== undefined) {
            const decoded = decodeOpaque(after);
            assert(Array.isArray(decoded), `Invalid "after" cursor value received`);
            assert(decoded.length === cursorOrder.length, `Invalid "after" cursor value received`);
            baseBuilder = applyBound(true, decoded);
        }

        if (before !== undefined) {
            const decoded = decodeOpaque(before);
            assert(Array.isArray(decoded), `Invalid "before" cursor value received`);
            assert(decoded.length === cursorOrder.length, `Invalid "before" cursor value received`);
            baseBuilder = applyBound(false, decoded);
        }

        const output = info && extractSelection(info.fieldNodes[0], [`output`, `edges`, `node`]) as FieldNode;
        assert(!output || output.kind === `Field`, `Unexpected output kind`);
        
        const set = output?.selectionSet;
        const fields = set?.selections.map((selection) => {
          assert(selection.kind === `Field`, `Unexpected selection kind`);
          return selection as FieldNode;
        });

        const hasJoin = fields?.some((field) => Boolean(field.selectionSet?.selections.length));

        if (hasJoin) {
            baseBuilder = baseBuilder.select(`*`);
        }
        
        // If we only have root fields, we don't need to do with "with" wrap....
        let builder = hasJoin
          ? queryBuilder(provider, context).with(definition.store.name, baseBuilder).from(definition.store.name)
          : baseBuilder;
        
        for (const field of Object.values(definition.primaryKey)) {
          const identifier = fullNameFromFieldName(definition, field.name);
          builder = builder.select(`${identifier} as ${KEY}.${field.name}`);
        }
        
        if (fields) {
            for (const field of fields) {
                builder = applySelect(definition, builder, field);
            }

            // We need to make sure cursor values are selected so we can construct it
            for (const orderItem of cursorOrder) {
                const identifier = fullNameFromFieldName(definition, orderItem.field);
                builder = builder.select(`${identifier} as ${CURSOR}.${orderItem.field}`);
            }
        } else {
            builder = builder.select(`*`);
        }

        for (const filterItem of filter) {
            builder = processFilterItem(definition, builder, filterItem);
        }

        // We have already applied the order if we have no join
        if (hasJoin) {
          for (const orderItem of order) {
              builder = builder.orderBy(orderItem.field, orderItem.direction);
          }
        }

        console.debug(`List SQL`, builder.toSQL());
        const start = Date.now();
        const result = await builder;
        console.debug(`List. ${result.length} results.(${Date.now() - start}ms)`, result);
        let processed = Array.from(postProcess(definition, result));

        const hasNextPage = processed.length > 0 && (Boolean(before) || processed.length > first);
        processed = processed.slice(0, first);

        if (last !== undefined) {
            processed = processed.slice(processed.length - last, processed.length);
        }

        if (reversed) {
            processed.reverse();
        }

        const edges = processed.map((node) => {
            const cursor = encodeCursor(node, cursorOrder);
            return { node, cursor };
        });

        const connection = {
            edges,
            pageInfo: {
                hasPreviousPage: Boolean(after) || Boolean(last! < first),
                hasNextPage,
                startCursor: edges[0]?.cursor,
                endCursor: edges[edges.length - 1]?.cursor,
            },
        };

        return { output: connection };
    };
}


function extractParams(params: ListParamsInput | undefined, definition: TypeObject) {
  const primaryKeys = Object.values(definition.primaryKey);
  const cursorOrder: OrderInput[] = [
      ...(params?.order ?? []).filter((ord) => isRootField(ord.field)),
      ...primaryKeys.map((key) => ({ field: key.name, direction: `ASC` } as const)),
  ];

  const orderItems: OrderInput[] = [...(params?.order ?? []), ...primaryKeys.map((key) => ({ field: key.name, direction: `ASC` } as const))];
  const filterItems = params?.filter ?? [];

  const order = orderItems.sort(byDepth) ?? [];
  if (params === undefined) {
      return {
          // TODO: This needs to be configurable
          first: MAX_LIMIT,
          order: orderItems,
          filter: filterItems,
          reversed: false,
          cursorOrder,
      };
  }

  if (params.last === undefined) {
      return {
          ...params,
          filter: filterItems,
          first: Math.min(params.first ?? Number.POSITIVE_INFINITY, MAX_LIMIT),
          order,
          reversed: false,
          cursorOrder,
      };
  }

  if (params.first !== undefined && params.last < params.first) {
      const last = params.last === undefined ? undefined : Math.min(params.last, MAX_LIMIT);
      return {
          ...params,
          filter: filterItems,
          first: Math.min(params.first ?? Number.POSITIVE_INFINITY, MAX_LIMIT),
          last,
          order,
          reversed: false,
          cursorOrder,
      };
  }

  const swapDirection = (item: OrderInput): OrderInput => {
      return { ...item, direction: item.direction === `ASC` ? `DESC` : `ASC` };
  };

  return {
      first: Math.min(params.last, MAX_LIMIT),
      last: params.first ? Math.min(params.first, MAX_LIMIT) : undefined,
      after: params.before,
      before: params.after,
      filter: filterItems,
      order: order.map(swapDirection),
      reversed: true,
      cursorOrder: cursorOrder.map(swapDirection),
  };
}

function byDepth(itemA: OrderInput, itemB: OrderInput) {
  const depthA = itemA.field.startsWith(`${KEY}${SEPARATOR}`) ? itemA.field.split(SEPARATOR).length - 1 : itemA.field.split(SEPARATOR).length;
  const depthB = itemB.field.startsWith(`${KEY}${SEPARATOR}`) ? itemB.field.split(SEPARATOR).length - 1 : itemB.field.split(SEPARATOR).length;
  return depthA - depthB;
}

function processFilterItem(definition: TypeObject, builder: Knex.QueryBuilder, item: FilterInput) {
  const field = fieldFromName(definition, item.field);
  const name = fullNameFromFieldName(definition, item.field);
  const value = field.store.type.encode(item.value);
  
  switch (item.operator) {
      case `NE`:
          builder = builder.where(name, `!=`, value);
          break;
      case `LT`:
          builder = builder.where(name, `<`, value);
          break;
      case `LTE`:
          builder = builder.where(name, `<=`, value);
          break;
      case `EQ`:
          builder = builder.where(name, `=`, value);
          break;
      case `GT`:
          builder = builder.where(name, `>`, value);
          break;
      case `GTE`:
          builder = builder.where(name, `>=`, value);
          break;
      case `IN`:
          builder = builder.where(name, `in`, value);
          break;
      default:
          throw new Error(`Unknown operator "${item.operator}" received`);
  }
  return builder;
}

function isRootField(field: string) {
  return field.startsWith(`${KEY}${SEPARATOR}`) || field.split(SEPARATOR).length === 1;
}

function encodeOpaque(value: unknown = ``) {
  const json = JSON.stringify(value);
  return Buffer.from(json).toString(`base64`);
}

function decodeOpaque(value: string) {
  if (value === ``) {
      return undefined;
  }
  const json = Buffer.from(value, `base64`).toString();
  return JSON.parse(json);
}

function encodeCursor(node: Record<string, unknown>, order: OrderInput[]) {
  // TODO: This data needs to be encrypted as it could leak sensitive information
  //  for example, of we specify order by password (and it is in plain text), the
  //  password data would be returned in the cursor
  const data = order.map((item) => node[`${CURSOR}.${item.field}`]);
  return encodeOpaque(data);
}

export function fieldFromName(definition: TypeObject, fieldName: string): TypeObjectField<StoreFieldScalar> {
  const parts = fieldName.split(`.`);
  const field = definition.fields[parts.shift()!];
  assert(field, `Unknown field "${fieldName}" requested`);
  if (parts.length === 0) {
      assert(field.store instanceof StoreFieldScalar, `Expected a scalar field`);
      return field as TypeObjectField<StoreFieldScalar>;
  }
  assert(field.type instanceof TypeObject, `Expected a linked field`);
  return fieldFromName(field.type, parts.join(`.`));
}

export function fullNameFromFieldName(definition: TypeObject, fieldName: string) {
  // TODO: What about aliases?
  const parts = fieldName.split(`.`);
  const field = definition.fields[parts.shift()!];
  assert(field, `Unknown field "${fieldName}" requested`);

  if (parts.length === 0) {
      assert(field.store instanceof StoreFieldScalar, `Expected a scalar field`);
      return `${definition.store.name}.${field.store.name}`;
  }
  
  return fullNameFromFieldName(field.type as TypeObject, parts.join(`.`));
}