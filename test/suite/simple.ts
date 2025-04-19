import { execute, GraphQLError, GraphQLSchema, parse } from 'graphql';
import { describe, test, expect } from 'vitest';
import { gql } from '../../src/graphql/type.js';
import { exec } from './util.js';
import category from './artifact/category.js';

// TODO: Move to "list" directory

export function simple(graph: () => GraphQLSchema) {
  describe(`Simple`, () => {

    test(`List Categories`, async () => {
      const query = gql`
        query {
          Categories {
            list {
              output {
                edges {
                  node {
                    categoryId
                    categoryName
                  }
                }
              }
            }
          }
        }
      `;
      const result = await exec(query, graph());
      const output = {
        Categories: {
          list: {
            output: {
              edges: category.map((edge) => ({
                node: edge
              })),
            }
          }
        }
      };
      expect(result.data).toEqual(output);
    });
  });
}
