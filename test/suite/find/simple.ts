import { GraphQLSchema } from 'graphql';
import { describe, test, expect } from 'vitest';
import { gql } from '../../../src/graphql/type.js';
import { exec } from '../util.js';
import category from '../artifact/category.js';

export function simple(graph: () => GraphQLSchema) {
  describe(`Simple`, () => {

    test(`Missing`, async () => {
      const result = await exec(gql`
        query {
          Category {
            find(input: { categoryId: "-1234" }) {
              output {
                categoryId
                categoryName
              }
            }
          }
        }
      `, graph());

      expect(result).toEqual({
        Category: {
          find: {
            output: null
          }
        }
      });
    });

    test(`Existing`, async () => {
      const result = await exec(gql`
        query {
          Category {
            find(input: { categoryId: "1" }) {
              output {
                categoryId
                categoryName
              }
            }
          }
        }
      `, graph());

      const output = category.find((edge) => edge.categoryId === `1`);

      expect(result).toEqual({
        Category: {
          find: {
            output,
          }
        }
      });
    });
  });
}
