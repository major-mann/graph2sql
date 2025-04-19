import { execute, GraphQLSchema, parse } from 'graphql';
import { Provider } from './store/provider/provider.js';
import { GraphqlQuery } from './graphql/type.js';
import { Transaction } from './type.js';
import { Knex } from 'knex';

export class Executer {
  readonly provider: Provider;
  readonly graph: GraphQLSchema;

  constructor(provider: Provider, graph: GraphQLSchema) {
    this.provider = provider;
    this.graph = graph;
  }

  #txn() {
    return new Promise<Knex.Transaction>((resolve) => {
      this.provider.knex.transaction(resolve);
    });
  }

  async execute(query: GraphqlQuery) {
    const document = parse(query.query);

    const hasMutation = document.definitions.some((definition) => {
      return definition.kind === 'OperationDefinition' && definition.operation === 'mutation';
    });

    const txn = hasMutation ? await this.#txn() : undefined;

    try {
      const result = await execute({
        schema: this.graph,
        document,
        rootValue: {},
        variableValues: query.variables,
        operationName: query.operationName,
        contextValue: {
          [Transaction]: txn,
        },
      });
  
      if ((result.errors?.length ?? 0) > 0) {
        // TODO: Add a logger
        console.debug(`GraphQL execution errors`, result.errors);
        if (txn) {
          await txn.rollback();
        }
        // throw new ExecutionError(result.errors!);
      } else {
        if (txn) {
          await txn.commit();
        }
      }
      return result;
    } catch (error) {
      if (txn) {
        await txn.rollback(error);
      }
      throw error;
    }
  }
}