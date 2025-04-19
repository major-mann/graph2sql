import { GraphQLScalarType, Kind } from 'graphql';

export const DateScalar = new GraphQLScalarType({
  name: `Date`,
  description: `Date custom scalar type`,
  serialize(value: unknown) {
    if (typeof value === `string`) {
      value = new Date(Date.parse(value));
    }

    if (typeof value === `number`) {
      value = new Date(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    throw Error(`GraphQL Date Scalar serializer expected a "string", "number" or "Date" object`);
  },
  parseValue(value: unknown) {
    // TODO: If number has decimal part convert JulianDay?
    if (typeof value === `number`) {
      return new Date(value); // Convert incoming integer to Date
    }

    if (typeof value === `string`) {
      return new Date(Date.parse(value)); // Convert incoming string to Date
    }

    throw new Error(`GraphQL Date Scalar parser expected a "number" or "string"`);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }

    if (ast.kind === Kind.STRING) {
      return new Date(Date.parse(ast.value));
    }

    // Invalid hard-coded value (not a string or integer)
    return null;
  },
});
