import connect, { Knex } from 'knex';
import { afterAll, beforeAll, describe } from 'vitest';
import { connect as graphConnect, SqliteProvider } from '../../src/index.js'
import { test } from '../suite/test.js';
import { GraphQLSchema } from 'graphql';

let knex: Knex;
let graph: GraphQLSchema;
describe(`SQLite`, () => {
  beforeAll(async () => {
    knex = connect({
      client: 'sqlite3',
      connection: {
        filename: './test/sqlite/northwind.db',
      },
    });

    const provider = new SqliteProvider(knex);
    graph = await graphConnect(provider);
  });

  afterAll(() => {
    knex.destroy();
  });

  test(() => graph);
});
