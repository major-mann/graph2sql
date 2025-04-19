import { GraphQLSchema } from 'graphql';
import { describe } from 'vitest';
import { simple } from './simple.js';
import { join } from './join.js';

export function find(graph: () => GraphQLSchema) {
  describe(`Find`, () => {
    simple(graph);
    join(graph);
  });
}
