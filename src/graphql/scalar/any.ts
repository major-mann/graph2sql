import { GraphQLScalarType, Kind } from 'graphql';

export const AnyScalar = new GraphQLScalarType({
  name: `Any`,
  description: `Any value type`,
  serialize(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.stringify(value);
  },
  parseValue(value: unknown) {
    if (typeof value !== `string`) {
      throw new Error(`GraphQL Any Scalar parser expected a "string"`);
    }

    try {
      return JSON.parse(value);
    } catch (error: any) {
      throw new Error(`GraphQL Any Scalar parser expected a valid JSON string. ${error.message}`);
    }
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch (error: any) {
        throw new Error(`GraphQL Any Scalar parser expected a valid JSON string. ${error.message}`);
      }
    }

    // Invalid hard-coded value (not a string)
    return null;
  },
});
