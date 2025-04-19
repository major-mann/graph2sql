import assert from 'node:assert';
import { TypeObject } from '../../store/store-type.js';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Input } from '../type.js';
import { postProcess } from './result.js';
import { Context } from '../../type.js';
import { convert, key, queryBuilder } from './util.js';
import { Provider } from '../../store/provider/provider.js';
import { hasSelection } from './select.js';

export type FindArgs = {
  input: { [key: string]: unknown };
};

export function createUpdateResolver(
  definition: TypeObject,
  provider: Provider,
): GraphQLFieldResolver<unknown, Context, Input<object>, unknown> {
  return async function (parent: unknown, args: { input: object }, context: Context, info?: GraphQLResolveInfo) {
    const convertedKey = key(definition, args.input);
    const document = convert(definition, args.input);

    let old: any[] | undefined;

    if (info && hasSelection(info.fieldNodes[0], [`output`, `old`])) {
      old = await queryBuilder(provider, context)
        .select(`*`)
        .from(definition.store.name)
        .where(convertedKey);
    } else {
      old = undefined;
    }

    let updated = await queryBuilder(provider, context)
      .from(definition.store.name)
      .where(convertedKey)
      .update(document, `*`);

    if (provider.supportsReturning(`update`) === false) {
      if (info && hasSelection(info.fieldNodes[0], [`output`, `new`])) {
        updated = await queryBuilder(provider, context)
          .select(`*`)
          .from(definition.store.name)
          .where(convertedKey);
      } else {
        updated = [document];
      }
    }

    assert(updated.length === 1, `Unable to find item to update`);

    const [oldProcessed] = old ? Array.from(postProcess(definition, old)) : [];
    const [newProcessed] = Array.from(postProcess(definition, updated));

    return {
      output: {
        old: oldProcessed,
        new: newProcessed,
      }
    };
  };
}
