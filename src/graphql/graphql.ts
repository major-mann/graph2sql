import { GraphQLFieldConfig, GraphQLInputFieldConfig, GraphQLInputObjectType, GraphQLInputType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLSchema, GraphQLSchemaConfig, GraphQLType, isInputType, isOutputType } from 'graphql';
import { StoreFieldLinked, TypeObject } from '../store/store-type.js';
import { asGraphQLType } from './type.js';
import { createEntityKey, createEntityMutation, createEntityQuery, entityKeyName } from './entity.js';
import { Filter, ListParams, Operator, Order, OrderDirection, PageInfo } from './list.js';
import { assert } from 'console';
import { createFindResolver } from './resolve/find.js';
import { createListResolver } from './resolve/list.js';
import { AnyScalar } from './scalar/any.js';
import { JsonScalar } from './scalar/json.js';
import { BinaryScaler } from './scalar/binary.js';
import { DateScalar } from './scalar/date.js';
import { createCreateResolver } from './resolve/create.js';
import { createUpdateResolver } from './resolve/update.js';
import { createDeleteResolver } from './resolve/delete.js';
import { Provider } from '../store/provider/provider.js';

export function create(provider: Provider, types: Record<string, TypeObject>) {
  const graphTypes: Record<string, GraphQLType> = {
    Any: AnyScalar,
    Json: JsonScalar,
    Blob: BinaryScaler,
    Date: DateScalar,

    Operator,
    OrderDirection,
    Filter,
    Order,
    ListParams,
    PageInfo,
  };

  const queryConfig: Record<string, GraphQLFieldConfig<unknown, unknown, unknown>> = {};
  const mutationConfig: Record<string, GraphQLFieldConfig<unknown, unknown, unknown>> = {};
  // const subscriptionConfig: Record<string, GraphQLFieldConfig<unknown, unknown, unknown>> = {};

  // We need the keys available for everything in order to create the linked
  //  input types for create and update
  for (const [typeName, type] of Object.entries(types)) {    
    if (type.store.isPivot) {
      continue;
    }
    buildKey(graphTypes, type);
  }

  for (const [typeName, type] of Object.entries(types)) {    
    if (type.store.isPivot) {
      continue;
    }

    const { query, mutation } = process(provider, graphTypes, type);

    if (query) {
      queryConfig[typeName] = {
        type: query,
        resolve: () => ({}),
      };
    }

    if (mutation) {
      mutationConfig[typeName] = {
        type: mutation,
        resolve: () => ({}),
      };
    }
  }

  const query = Object.keys(queryConfig).length > 0
    ? new GraphQLObjectType({
      name: `Query`,
      fields: queryConfig,
    })
    : undefined;

  const mutation = Object.keys(mutationConfig).length > 0
    ? new GraphQLObjectType({
      name: `Mutation`,
      fields: mutationConfig,
    })
    : undefined;

  const schema = new GraphQLSchema({
    query,
    mutation,
    subscription: undefined,
  });

  return schema;
}

function buildKey(types: Record<string, GraphQLType>, type: TypeObject): void {
  const key = createEntityKey(type);
  types[key.name] = key;
}


function process(provider: Provider, types: Record<string, GraphQLType>, type: TypeObject): Pick<GraphQLSchemaConfig, `query` | `mutation` | `subscription`> {
  const key = types[entityKeyName(type)] as GraphQLInputObjectType;

  const createInput = createCreateInputEntity(types);
  types[type.name] = createInput;

  const updateInput = createUpdateInputEntity(types);
  types[type.name] = updateInput;

  const output = createOutputEntity();
  types[type.name] = output;

  const find = createFindResolver(type, provider);
  const list = createListResolver(type, provider);

  const query = createEntityQuery(types, key, output, find, list);
  types[query.name] = query;

  const create = createCreateResolver(type, provider);
  const update = createUpdateResolver(type, provider);
  const remove = createDeleteResolver(type, provider);
  const mutation = createEntityMutation(
    key,
    output,
    createInput,
    updateInput,
    create,
    update,
    remove,
  );


  // TODO: Subscription

  return {
    query,
    mutation,
  };

  function createInputEntity(name: string, partial: boolean, types: Record<string, GraphQLType>) {
    const fields = () => {
      const fields: Record<string, GraphQLInputFieldConfig> = {};

      const ignore: string[] = [];
      for (const [fieldName, field] of Object.entries(type.fields)) {
        if (field.store instanceof StoreFieldLinked) {
          // TODO: At some point we may want to support these additional relationships
          //  (we could destructure them into multiple mutations inside the
          //  same transaction)
          if (field.store.owner === false || field.store.kind.startsWith(`1:`) === false) {
            // We are skipping items where the update would be in a foreign entity
            continue;
          }

          const linkedKeyName = entityKeyName(field.store.target);
          const linkedKey = types[linkedKeyName] as GraphQLInputObjectType;

          if (field.nullable || partial) {
            fields[fieldName] = { type: linkedKey };
          } else {
            fields[fieldName] = { type: new GraphQLNonNull(linkedKey) };
          }

          // Skip linked fields and only include the linked key
          for (const column of field.store.columns) {
            ignore.push(column);
            delete fields[column];
          }
        }

        if (field.type instanceof TypeObject === false) {
          if (ignore.includes(fieldName)) {
            continue;
          }

          const nullable = field.primaryKey
            ? false
            : partial || field.nullable;
          const graphqlType = asGraphQLType<GraphQLInputType>(field.type, nullable);
          fields[fieldName] = { type: graphqlType };
          continue;
        }
      }

      return fields;
    };
  
    const object = new GraphQLInputObjectType({
      name: `${type.name}${name}Input`,
      fields,
    });

    return object;
  }

  function createCreateInputEntity(types: Record<string, GraphQLType>) {
    return createInputEntity(`Create`, false, types);
  }

  function createUpdateInputEntity(types: Record<string, GraphQLType>) {
    return createInputEntity(`Update`, true, types);
  }

  function createOutputEntity() {
    // TODO: We need a way to skip linking fields...
    //  TODO: How should we deal with them on inputs?
    //    We should probably swap out for the key types on inputs.
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
}
