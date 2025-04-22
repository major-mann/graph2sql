import { Provider } from './store/provider/provider.js';
import { SqliteProvider } from './store/provider/sqlite.js';
import {
  DefaultNamingStrategy,
  type NamingStrategy
} from './store/schema/naming-strategy.js';
import { create as createStoreSchema } from './store/create.js';
import { create } from './graphql/graphql.js';
import { Executer } from './executer.js';

import type {
  ProviderColumn,
  ProviderForeignKey,
  ProviderIndex,
  ProviderSchema,
  ProviderTable,
} from './store/provider/schema.js';

import { AnyScalar } from './graphql/scalar/any.js'
import { BinaryScaler } from './graphql/scalar/binary.js';
import { DateScalar } from './graphql/scalar/date.js';
import { JsonScalar } from './graphql/scalar/json.js';

import {
  Connection,
  Direction,
  ListParams,
  Filter,
  Input,
  Output,
} from './graphql/type.js'

import {
  StoreBinaryType,
  StoreBooleanType,
  StoreDateType,
  StoreFloatType,
  StoreIdType,
  StoreIntType,
  StoreStringType,
  StoreType,
  StoreJsonType,
  StoreObjectType,
} from './store/type.js'

export {
  Provider,
  SqliteProvider,

  type ProviderSchema,
  type ProviderTable,
  type ProviderColumn,
  type ProviderForeignKey,
  type ProviderIndex,

  StoreBinaryType,
  StoreBooleanType,
  StoreDateType,
  StoreFloatType,
  StoreIdType,
  StoreIntType,
  StoreStringType,
  StoreJsonType,
  StoreObjectType,
  StoreType,

  AnyScalar,
  BinaryScaler,
  DateScalar,
  JsonScalar,

  type NamingStrategy,
  DefaultNamingStrategy,

  Executer,
};

export type ConnectProps = {
  namingStrategy: NamingStrategy;
}

export async function connect(provider: Provider, options?: ConnectProps) {
  const providerSchema = await provider.schema();
  const schema = createStoreSchema(providerSchema, options);
  const graphQlSchema = create(provider, schema);
  return graphQlSchema;
}
