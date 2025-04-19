import { GraphQLObjectType, GraphQLOutputType } from 'graphql';

export function createDeleteResult(name: string, type: GraphQLOutputType) {
  return new GraphQLObjectType({
    name: `${name}DeleteResult`,
    fields: {
      output: { type },
    },
  });
}
