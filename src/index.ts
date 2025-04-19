import { Provider } from './store/provider/provider.js';
import { SqliteProvider } from './store/provider/sqlite.js';
import { DefaultNamingStrategy, type NamingStrategy } from './store/schema/naming-strategy.js';
import { create as createStoreSchema } from './store/create.js';
import { create } from './graphql/graphql.js';
import { Executer } from './executer.js';

export {
  Provider,
  SqliteProvider,

  NamingStrategy,
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
