import { Knex } from 'knex';

export const Transaction = Symbol('ContextTransaction');

export type Context = {
  [Transaction]: Knex.Transaction;
}
