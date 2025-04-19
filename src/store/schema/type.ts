import { ReferenceKind } from '../store-type.js';
import { ProviderColumn, ProviderForeignKey, ProviderTable } from '../provider/schema.js';

export type NormalizedProviderTable = ProviderTable & {
  isPivot: boolean;
  reverseForeignKeys: ProviderForeignKey[]
}

export type NormalizedProviderSchema = Record<string, NormalizedProviderTable>;

export type Table = {
  name: string;
  provider: NormalizedProviderTable;
  
  columns: Record<string, Column>;
  links: Record<string, Link>;
}

export type Column = {
  name: string;
  provider: ProviderColumn;
  primaryKey: boolean;
}

export type Link = {
  target: Table;
  kind: ReferenceKind;
  provider: ProviderForeignKey;
  pivot?: Link;
  owner: boolean;
}

export type Schema = Record<string, Table>;
