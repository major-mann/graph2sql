import { Knex } from 'knex';
import { StoreType, types } from '../type.js';
import { ProviderSchema } from './schema.js';

export abstract class Provider {
  abstract knex: Knex;
  abstract schema(): Promise<ProviderSchema>;
  abstract types(): Record<keyof typeof types, StoreType>;

  abstract supportsReturning(type: `insert` | `update` | `delete` | `insert-id`, old?: boolean): boolean;

  abstract rowId(column: string): string;
}
