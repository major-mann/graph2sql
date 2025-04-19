import { GraphQLSchema } from 'graphql';
import { describe, test, expect } from 'vitest';
import { gql } from '../../../src/graphql/type.js';
import { exec } from '../util.js';
import product from '../artifact/product.js';
import supplier from '../artifact/supplier.js';
import employee from '../artifact/employee.js';
import territory from '../artifact/territory.js';
import employeeTerritory from '../artifact/employee-territory.js';

export function join(graph: () => GraphQLSchema) {
  describe(`Join`, () => {

    test(`Single`, async () => {
      const result = await exec(gql`
        query {
          Product {
            find(input: { productId: "10" }) {
              output {
                productId
                productName
                supplier {
                  supplierId
                  companyName
                }
              }
            }
          }
        }
      `, graph());

      const outputProduct = product.find((edge) => edge.productId === `10`)!;
      const outputSupplier = supplier.find((edge) => edge.supplierId === outputProduct.supplierId)!;

      const output = {
        productId: outputProduct.productId,
        productName: outputProduct.productName,
        supplier: {
          supplierId: outputSupplier.supplierId,
          companyName: outputSupplier.companyName
        }
      };

      expect(result).toEqual({
        Product: {
          find: {
            output
          }
        }
      });
    });

    test(`Reverse`, async () => {
      const result = await exec(gql`
        query {
          Supplier {
            find(input: { supplierId: "4" }) {
              output {
                supplierId
                companyName
                products {
                  productId
                  productName
                }
              }
            }
          }
        }
      `, graph());

      const outputSupplier = supplier.find((edge) => edge.supplierId === `4`)!;
      const outputProducts = product.filter((edge) => edge.supplierId === `4`)!;

      const output = {
        supplierId: outputSupplier.supplierId,
        companyName: outputSupplier.companyName,
        products: outputProducts.map((outputProduct) => ({
          productId: outputProduct.productId,
          productName: outputProduct.productName,
        })),
      };

      expect(result).toEqual({
        Supplier: {
          find: {
            output
          }
        }
      });
    });

    test(`Pivot`, async () => {
      const result = await exec(gql`
        query {
          Employee {
            find(input: { employeeId: "1" }) {
              output {
                employeeId
                firstName
                lastName
                territories {
                  territoryId
                  territoryDescription
                }
              }
            }
          }
        }
      `, graph());

      const outputEmployee = employee.find((edge) => edge.employeeId === `1`)!;
      const outputEmployeeTerritories = employeeTerritory.filter((edge) => edge.employeeId === `1`)!;
      const outputTerritories = outputEmployeeTerritories.map((outputEmployeeTerritory) => {
        return territory.find((edge) => edge.territoryId === outputEmployeeTerritory.territoryId)!;
      });

      const output = {
        employeeId: outputEmployee.employeeId,
        firstName: outputEmployee.firstName,
        lastName: outputEmployee.lastName,
        territories: outputTerritories.map((outputTerritory) => ({
          territoryId: outputTerritory.territoryId,
          territoryDescription: outputTerritory.territoryDescription,
        })),
      };

      expect(result).toEqual({
        Employee: {
          find: {
            output
          }
        }
      });
    });
  });


}
