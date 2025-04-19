import assert from 'node:assert';
import { GraphQLScalarType, Kind } from 'graphql';

export const BinaryScaler = new GraphQLScalarType<Buffer, string>({
  name: `Blob`,
  description: `Binary value`,
  serialize(value: unknown) {
    assert(value instanceof Buffer, `Expected value to be a Buffer`);

    const result = value.toString(`base64`);
    return result;
  },
  parseValue(value: unknown): Buffer {
    if (typeof value !== `string`) {
      throw new Error(`GraphQL Json Scalar parser expected a "string"`);
    }

    try {
      const result = Buffer.from(value, `base64`);
      return result;
    } catch (error: any) {
      throw new Error(`GraphQL Json Binary parser expected a valid base64 string. ${error.message}`);
    }
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        const result = Buffer.from(ast.value, `base64`);
        return result;
      } catch (error: any) {
        throw new Error(`GraphQL Json Binary parser expected a valid base64 string. ${error.message}`);
      }
    }

    throw new Error(`Invalid buffer literal. Expected a string`);
  },
});
