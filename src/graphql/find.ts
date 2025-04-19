import { GraphQLObjectType, GraphQLOutputType } from 'graphql';

export function createFindResult(name: string, type: GraphQLOutputType) {
  return new GraphQLObjectType({
    name: `${name}FindResult`,
    fields: {
      output: { type },
    },
  });
}
