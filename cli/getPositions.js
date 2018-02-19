#!/usr/bin/env node

const description = `
  Get positions.
  
  ## Example:
  $ node cli/getPositions.js --base="USD" --user-id=101

  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"getPositions","params":[{"base":"USD","userId":101}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--base <v>", "A base currency eg. 'USD'")
  .option("--user-id <v>", "user's ID", parseInt)
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const base = program.base;
const userId = program.userId;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "getPositions";
const p = {};
if (base) p.base = base;
if (userId) p.userId = userId;
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });