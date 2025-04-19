import assert from 'node:assert';
import { StoreFieldScalar, TypeObject } from '../../store/store-type.js';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Input } from '../type.js';
import { postProcess } from './result.js';
import { Context } from '../../type.js';
import { convert, queryBuilder } from './util.js';
import { Provider } from '../../store/provider/provider.js';

export function createCreateResolver(
  definition: TypeObject,
  provider: Provider,
): GraphQLFieldResolver<unknown, Context, Input<object>, unknown> {
  return async function (parent: unknown, args: { input: object }, context: Context, info?: GraphQLResolveInfo) {
    const document = convert(definition, args.input);
    const returning = Object.values(definition.fields).map(
      (field) => {
        if (field.store instanceof StoreFieldScalar === false) {
          return undefined;
        }

        return `${field.store.name} as ${field.name}`;
      }
    ).filter(Boolean) as string[];

    const query = queryBuilder(provider, context)
      .insert(document)
      .into(definition.store.name);

    if (provider.supportsReturning(`insert`) === false) {
      if (provider.supportsReturning(`insert-id`) === false || Object.keys(definition.primaryKey).length !== 1) {
        await query;
        // Return the supplied data (We have no way to return generated ids)
        return {
          output: args.input,
        };
      }

      // Get the id and return it
      const pKey = Object.keys(definition.primaryKey)[0];
      const pKeyStore = definition.primaryKey[pKey].store.name;

      const [id] = await queryBuilder(provider, context)
        .insert(document, pKeyStore)
        .into(definition.store.name);

      return {
        output: {
          ...args.input,
          [pKey]: id[pKeyStore],
        },
      };
    }

    // Provider supports returning, we can get any generated data without issue
    const inserted = await queryBuilder(provider, context)
      .insert(document)
      .into(definition.store.name)
      .returning(returning);

    const processed = Array.from(postProcess(definition, inserted));
    assert(processed.length === 1, `Expected exactly one result`);
    return { output: processed[0] };
  };
}
