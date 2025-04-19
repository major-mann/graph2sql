import { GraphQLSchema } from 'graphql';
import { find } from './find/find.js';

export function test(graph: () => GraphQLSchema) {
  find(graph);
}
