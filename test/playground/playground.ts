import { createServer, IncomingMessage } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import connect from 'knex';
import { SqliteProvider, connect as graphConnect } from '../../src/index.js';
import { Executer } from '../../src/executer.js';

type GraphqlQuery = {
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

const PLAYGROUND = resolve(dirname(fileURLToPath(import.meta.url)), `playground.html`);
let playground: string | undefined = undefined;

const knex = connect({
  client: 'sqlite3',
  connection: {
    filename: './test/sqlite/northwind.db',
  },
});

const provider = new SqliteProvider(knex);
let executer: Executer | undefined = undefined;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? ``, `http://${req.headers.host}`);

    if (url.pathname === `/graphql` && req.method === `POST`) {
      if (executer === undefined) {
        const schema = await graphConnect(provider);
        executer = new Executer(provider, schema);
      }

      const bodyStr = await readData(req);
      const body: GraphqlQuery = JSON.parse(bodyStr);

      try {
        const result = await executer.execute(body);
        const data = JSON.stringify(result);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Content-Length': Buffer.byteLength(data),
        });

        let index = 0;
        while (index < data.length) {
          res.write(data.slice(index, index + 1024 * 14));
          index += 1024 * 14;
        }
        res.end();
        return;
      } catch (error: any) {
        console.error(`Failed to execute GraphQL query`, error.stack);
        throw error;
      }
    }

    if (url.pathname === `/` && req.method === `GET`) {
      if (playground === undefined) {
        playground = await readFile(PLAYGROUND, `utf8`);
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(playground);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Not Found`);
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    console.error(`Internal server error`, error);
    res.write(`Internal Server Error\n\n`);
    res.write(error.stack ?? error.message);
  }
});

function readData(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = ``;
    req.on(`data`, (chunk) => data += chunk);
    req.on(`end`, () => resolve(data));
    req.on(`error`, reject);
  });
}
server.listen(8080, () => console.log(`Server running on http://localhost:8080`));
server.on(`error`, (error) => console.error(`Server error`, error));