export type ProviderTable = {
  name: string;
  columns: Record<string, ProviderColumn>;
  foreignKeys: ProviderForeignKey[];
  indexes: ProviderIndex[];
}

export type ProviderColumn = {
  name: string;
  type: `string` | `integer` | `numeric` | `date` | `boolean` | `binary` | `json`;
  maxLength?: number;
  defaultValue?: unknown;
  nullable: boolean;
  primaryKey: boolean;
}

export type ProviderForeignKey = {
  table: string;
  foreignTable: string;
  columns: string[];
  foreignColumns: string[];
}

export type ProviderIndex = {
  name: string;
  unique: boolean;
  columns: string[];
}

export type ProviderSchema = Record<string, ProviderTable>;
