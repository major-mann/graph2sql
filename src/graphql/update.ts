import { GraphQLInputObjectType, GraphQLInputType, GraphQLObjectType, GraphQLOutputType } from 'graphql';
import { TypeObject, TypeObjectField } from '../store/store-type.js';
import { asGraphQLType } from './type.js';

export function createUpdateResult(name: string, type: GraphQLOutputType) {
  const output = new GraphQLObjectType({
    name: `${name}UpdateResultOutput`,
    fields: {
      new: { type },
      old: { type },
    },
  });

  return new GraphQLObjectType({
    name: `${name}UpdateResult`,
    fields: {
      output: { type: output },
    },
  });
}

export function createUpdateInput(definition: TypeObject) {
  const props = Object.values(definition.fields);
  const primaryProps = props
    .filter((field) => field.primaryKey)
    .map((field) => field.name);

  const process = (prop: TypeObjectField) => ({
    type: asGraphQLType<GraphQLInputType>(prop.type, primaryProps.includes(prop.name) === false)
  });

  const fields = Object.fromEntries(props.map((prop) => [prop.name, process(prop)])); 

  return new GraphQLInputObjectType({
      name: `${definition.name}UpdateInput`,
      fields,
  });
}
