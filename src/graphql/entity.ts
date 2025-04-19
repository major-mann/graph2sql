import assert from 'node:assert';

import {
  GraphQLFieldConfig,
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLType,
  isInputType,
  isOutputType,
} from 'graphql';

import { StoreFieldLinked, TypeObject, TypeObjectField } from '../store/store-type.js';
import { asGraphQLType } from './type.js';
import { createFindResult } from './find.js';
import { createConnection, createEdge, createListResult } from './list.js';
import { createCreateResult } from './create.js';
import { createUpdateResult } from './update.js';
import { createDeleteResult } from './delete.js';

type FieldResolver = GraphQLFieldResolver<any, any, any, any>;

export function createEntity(
  types: Record<string, GraphQLType>,
  type: TypeObject,
) {
  const fields = () => {
    const fields: Record<string, GraphQLFieldConfig<unknown, unknown, unknown>> = {};

    for (const [fieldName, field] of Object.entries(type.fields)) {
      if (field.type instanceof TypeObject === false) {
        const graphqlType = asGraphQLType<GraphQLOutputType>(field.type, field.nullable);
        fields[fieldName] = { type: graphqlType };
        continue;
      }

      assert(isOutputType(types[field.type.name]), `Type "${field.type.name}" is not defined`);
      assert(field.store instanceof StoreFieldLinked, `Expected a linked field`);

      const type = types[field.type.name] as GraphQLOutputType;
      const isList = (field.store as StoreFieldLinked).kind.endsWith(`:n`);

      fields[fieldName] = {
        type: isList ? new GraphQLList(type) : type,
        args: undefined,
        resolve: undefined,
      };
    }

    return fields;
  };

  const object = new GraphQLObjectType({
    name: type.name,
    fields,
  });

  return object;
}

export function createEntityQuery(
  { ListParams }: Record<string, GraphQLType>,
  key: GraphQLInputObjectType,
  type: GraphQLObjectType,

  find: FieldResolver,
  list: FieldResolver,
) {
  assert(isInputType(ListParams), `Expected ListParams to be an input type`);

  const Edge = createEdge(type.name, type);
  const Connection = createConnection(type.name, Edge);

  const FindResult = createFindResult(type.name, type);
  const ListResult = createListResult(type.name, Connection);

  const query = new GraphQLObjectType({
      name: `${type.name}Query`,
      fields: {
          find: {
              args: { input: { type: new GraphQLNonNull(key) } },
              type: FindResult,
              resolve: find,
          },
          list: {
              args: { input: { type: ListParams } },
              type: ListResult,
              resolve: list,
          },
      },
  });

  return query;
}

export function entityKeyName(definition: TypeObject) {
  return `${definition.name}Key`;
}

export function createEntityKey(definition: TypeObject) {
  const props = Object.values(definition.fields).filter((field) => field.primaryKey);
  const process = (prop: TypeObjectField) => ({ type: asGraphQLType<GraphQLInputType>(prop.type, !prop.nullable) });
  const fields = Object.fromEntries(props.map((prop) => [prop.name, process(prop)])); 

  return new GraphQLInputObjectType({
      name: entityKeyName(definition),
      fields,
  });
}

export function createEntityMutation(
  key: GraphQLInputObjectType,
  output: GraphQLObjectType,
  createInput: GraphQLInputObjectType,
  updateInput: GraphQLInputObjectType,

  create: FieldResolver,
  update: FieldResolver,
  remove: FieldResolver,
) {

  const CreateResult = createCreateResult(output.name, output);
  const UpdateResult = createUpdateResult(output.name, output);
  const DeleteResult = createDeleteResult(output.name, output);

  const query = new GraphQLObjectType({
      name: `${output.name}Mutation`,
      fields: {
          create: {
              args: { input: { type: new GraphQLNonNull(createInput) } },
              type: CreateResult,
              resolve: create,
          },
          update: {
              args: { input: { type: new GraphQLNonNull(updateInput) } },
              type: UpdateResult,
              resolve: update,
          },
          delete: {
            args: { input: { type: new GraphQLNonNull(key) } },
            type: DeleteResult,
            resolve: remove,
          }
      },
  });

  return query;
}
