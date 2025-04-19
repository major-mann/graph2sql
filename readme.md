# Graph2Sql

Graph2Sql allows you to introspectively connect to a SQL database (via knex) exposing the
database structure via GraphQL.

It uses foreign key references to build graph links, and will automatically create a
SQL query (with the appropriate joins) in order to fetch the required data in a single
query.

## Structure
Tables are exposed in a similar structure to Relay graphs, but with several key differences.

1. Input parameters are exposed via an "input" object parameter.
2. Outputs are wrapped with an "output" field.

### Sample structure

#### Country

##### Fields

* `countryId` `int`
* `name` `varchar`

#### Employee

##### Fields

* `employeeId` `int`
* `name` `varchar`
* `countryId` `int`

##### Foreign keys
* `countryId` linking to the `Country` table.

#### Graph structure

##### ListParams
TODO

##### Connection (One per entity type)
* `edges` - TODO
* `pageInfo` - TODO

##### Query
* `employee`
* `country`

##### Country
* `countryId` `int`
* `name` `string`

##### CountryQuery
* `find(input: { countryId: int })` `Country`
* `list(input: ListParams)` `CountryConnection`

##### Employee
* `employeeId` `int`
* `name` `string`
* `country` `CountryQuery`


## TODOs
* Remove linking fields from the GraphQL types (Leaving only the graph linked structures)
* Only allow ordering and filtering on fields with the appropriate indexes
* Add support for MySQL, Postgres and TSQL.
  * This requires adding support to read tables and foreign keys from the relevant databases.
  * All other support should be available through knex