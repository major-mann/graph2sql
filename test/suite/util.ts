import { execute, GraphQLSchema, parse } from 'graphql';
import { GraphqlQuery } from '../../src/graphql/type.js';

export async function exec(query: GraphqlQuery, graph: GraphQLSchema) {
  // TODO: Handle transaction here?
  const document = parse(query.query);
  const result = await execute({
    schema: graph,
    document,
    rootValue: {},
    variableValues: query.variables,
    operationName: query.operationName,
  });

  if ((result.errors?.length ?? 0) > 0) {
    console.debug(`GraphQL execution errors`, result.errors);
    // TODO: Attach other errors
    throw result.errors![0];
  }

  return result.data as any;
}
