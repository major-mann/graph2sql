import {
  GraphQLInt,
  GraphQLBoolean,
  GraphQLString,
  GraphQLID,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLEnumType,
  GraphQLOutputType,
  GraphQLNonNull,
} from 'graphql';

import { AnyScalar } from './scalar/any.js';

// TODO: Clashing names?

export const Operator = new GraphQLEnumType({
  name: `ListFilterOperator`,
  values: {
    LT: { value: `LT` },
    LTE: { value: `LTE` },
    EQ: { value: `EQ` },
    GTE: { value: `GTE` },
    GT: { value: `GT` },
    NE: { value: `NE` },
    IN: { value: `IN` },
  },
});

export const OrderDirection = new GraphQLEnumType({
  name: `ListOrderDirection`,
  values: {
    ASC: { value: `ASC` },
    DESC: { value: `DESC` },
  },
});

export const Filter = new GraphQLInputObjectType({
  name: `ListFilterClause`,
  fields: {
    field: { type: GraphQLString },
    operator: { type: Operator },
    value: { type: AnyScalar },
  },
});

export const Order = new GraphQLInputObjectType({
  name: `ListOrderClause`,
  fields: {
    field: { type: GraphQLString },
    direction: { type: OrderDirection },
  },
});

export const ListParams = new GraphQLInputObjectType({
  name: `ListInputParams`,
  fields: {
    first: { type: GraphQLInt },
    last: { type: GraphQLInt },
    after: { type: GraphQLID },
    before: { type: GraphQLID },

    filter: { type: new GraphQLList(Filter) },
    order: { type: new GraphQLList(Order) },
  },
});

export const PageInfo = new GraphQLObjectType({
  name: `ListConnectionPageInfo`,
  fields: {
    hasNextPage: { type: GraphQLBoolean },
    hasPreviousPage: { type: GraphQLBoolean },
    startCursor: { type: GraphQLID },
    endCursor: { type: GraphQLID },
  },
});

export function createEdge(name: string, type: GraphQLOutputType) {
  return new GraphQLObjectType({
    name: `${name}ListEdge`,
    fields: {
      node: { type },
      cursor: { type: GraphQLID },
    },
  });
}

export function createConnection(name: string, edge: GraphQLObjectType) {
  return new GraphQLObjectType({
    name: `${name}ListConnection`,
    fields: {
      pageInfo: { type: new GraphQLNonNull(PageInfo) },
      edges: {
        type: new GraphQLNonNull(new GraphQLList(edge)),
      },
    },
  });
}

export function createListResult(name: string, connection: GraphQLObjectType) {
  return new GraphQLObjectType({
    name: `${name}ListResult`,
    fields: {
      output: { type: new GraphQLNonNull(connection) },
    },
  });
}
