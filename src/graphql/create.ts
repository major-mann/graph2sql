import { GraphQLInputObjectType, GraphQLInputType, GraphQLObjectType, GraphQLOutputType } from 'graphql';

export function createCreateResult(name: string, type: GraphQLOutputType) {
  return new GraphQLObjectType({
    name: `${name}CreateResult`,
    fields: {
      output: { type },
    },
  });
}

export function createCreateInput(name: string, type: GraphQLInputType) {
  return new GraphQLInputObjectType({
    name: `${name}CreateInput`,
    fields: {
      input: { type },
    },
  });
}
