import assert from 'node:assert';
import { Knex } from 'knex';
import { StoreFieldScalar, TypeObject } from '../../store/store-type.js';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Input } from '../type.js';
import { postProcess } from './result.js';
import { Context, Transaction } from '../../type.js';
import { key, queryBuilder } from './util.js';
import { Provider } from '../../store/provider/provider.js';

export function createDeleteResolver(
  definition: TypeObject,
  provider: Provider,
): GraphQLFieldResolver<unknown, Context, Input<object>, unknown> {
  return async function (parent: unknown, args: { input: object }, context: Context, info?: GraphQLResolveInfo) {
    const convertedKey = key(definition, args.input);

    let hasAdditionalFields = false;
    const returning = Object.values(definition.fields).map(
      (field) => {
        if (field.store instanceof StoreFieldScalar === false) {
          return undefined;
        }

        if (field.primaryKey === false) {
          hasAdditionalFields = true;
        }

        return `${field.store.name} as ${field.name}`;
      }
    ).filter(Boolean) as string[];

    let old: any[];
    if (hasAdditionalFields && provider.supportsReturning(`delete`) === false) {
      old = await queryBuilder(provider, context)
        .select(returning)
        .from(definition.store.name)
        .where(convertedKey);
    } else {
      old = [convertedKey];
    }

    const query = queryBuilder(provider, context)
      .from(definition.store.name)
      .where(convertedKey)
      .delete()
      .returning(returning);

    const deleted = await query;

    if (provider.supportsReturning(`delete`) === false) {
      return Array.from(postProcess(definition, old));
    }

    const processed = Array.from(postProcess(definition, deleted));
    assert(processed.length <= 1, `Expected at most one result`);
    return { output: processed[0] };
  };
}
