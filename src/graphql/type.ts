import assert from 'node:assert';
import { Type, TypeObject } from '../store/store-type.js';
import { GraphQLID, GraphQLInt, GraphQLFloat, GraphQLString, GraphQLBoolean, GraphQLType, GraphQLNonNull } from 'graphql';

import { DateScalar } from './scalar/date.js';
import { BinaryScaler } from './scalar/binary.js';
import { JsonScalar } from './scalar/json.js';
import { AnyScalar } from './scalar/any.js';

export function asGraphQLType<TResult extends GraphQLType = GraphQLType>(type: Type, nullable = false): TResult {
  const result = toGraphQLType(type);
  if (nullable) {
    return result as TResult;
  } else {
    return new GraphQLNonNull(result) as TResult;
  }
}

function toGraphQLType<TResult extends GraphQLType = GraphQLType>(type: Type): TResult {
  assert(type instanceof TypeObject === false, `Only scalar types are supported`);

  switch (type.name) {
    case `id`:
      return GraphQLID as TResult;
    case `int`:
      return GraphQLInt as TResult;
    case `float`:
      return GraphQLFloat as TResult;
    case `string`:
      return GraphQLString as TResult;
    case `boolean`:
      return GraphQLBoolean as TResult;
    case `date`:
      return DateScalar as TResult;
    case `json`:
      return JsonScalar as TResult;
    case `binary`:
      return BinaryScaler as TResult;
    default:
      console.warn(`unknown type "${type.name}"`);
      return AnyScalar as TResult;
  }
}

export type Input<T> = {
  input: T;
};

export type Output<T> = {
  output: T;
};

export type Connection<TNode, TCursor = string> = {
  edges: {
    node: TNode;
    cursor: TCursor;
  }[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: TCursor;
    endCursor?: TCursor;
  };
};

export type GraphqlQuery = {
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

export type Operator = `LT` | `LTE` | `EQ` | `GTE` | `GT` | `NE` | `IN`;
export type Direction = `ASC` | `DESC`;

export type Filter = {
  field: string;
  operator: Operator;
  value: unknown;
};

export type Order = {
  field: string;
  direction: Direction;
};

export type ListParams = {
  first?: number;
  last?: number;
  after?: string;
  before?: string;

  filter?: Filter[];
  order?: Order[];
};

/**
 * Just a wrapper to provide syntax highlighting for GraphQL queries.
 */
export function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, string, index) => {
    const value = values[index] ?? ``;
    return `${result}${string}${value}`;
  }, ``);
}
