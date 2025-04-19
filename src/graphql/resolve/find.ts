import assert from 'node:assert';
import { Knex } from 'knex';
import { StoreFieldScalar, TypeObject } from '../../store/store-type.js';
import { FieldNode, GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Input } from '../type.js';
import { applySelect, extractSelection } from './select.js';
import { KEY, SEPARATOR } from '../../constant.js';
import { postProcess } from './result.js';
import { Context } from '../../type.js';
import { key, queryBuilder } from './util.js';
import { Provider } from '../../store/provider/provider.js';

export type FindArgs = {
  input: { [key: string]: unknown };
};

export function createFindResolver(
  definition: TypeObject,
  provider: Provider,
): GraphQLFieldResolver<unknown, Context, Input<FindArgs>, unknown> {
  return async function (parent: unknown, args: { input: FindArgs }, context: Context, info?: GraphQLResolveInfo) {
    let builder = queryBuilder(provider, context).from(definition.store.name);

    const output = info && extractSelection(info.fieldNodes[0], [`output`]) as FieldNode;
    assert(!output || output.kind === `Field`, `Unexpected output kind`);

    const set = output?.selectionSet;
    const fields = set?.selections.map((selection) => {
      assert(selection.kind === `Field`, `Unexpected selection kind`);
      return selection as FieldNode;
    });

    if (fields) {
      for (const field of Object.values(definition.primaryKey)) {
        const identifier = `${definition.store.name}.${field.store.name}`;
        const alias = `${KEY}${SEPARATOR}${field.name}`;
        builder = builder.select(`${identifier} as ${alias}`);
      }

      for (const field of fields) {
        builder = applySelect(definition, builder, field);
      }
    } else {
      builder = builder.select(`*`);
    }

    // TODO: This isn't right...
    //  we need the entity name in the key names
    const convertedKey = key(definition, args.input);
    builder = builder.where(convertedKey);

    console.debug(`Find SQL`, builder.toSQL());
    const start = Date.now();
    const result = await builder;
    console.debug(`Find result (${Date.now() - start}ms)`, result);

    const processed = Array.from(postProcess(definition, result));

    assert(processed.length <= 1, `Expected at most one result`);
    console.debug(`Output`, processed[0]);
    return { output: processed[0] };
  };
}
