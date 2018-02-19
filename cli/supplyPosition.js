#!/usr/bin/env node

const description = `
  Supply position.
  
  ## Example:
  $ node cli/supplyPosition.js --user-id=101 --base="USD" --qty=100
  
  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"supplyPosition","params":[{"userId":101,"base":"USD","qty":100}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--user-id <v>", "ID of an user who are buying or selling", parseInt)
  .option("--base <v>", "A currency name to be supplied. eg. 'USD'")
  .option('--qty <v>', 'A quantity of currency to be supplied', parseInt)
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const userId = program.userId;
const base = program.base;
const qty = program.qty;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "supplyPosition";
const p = {};
if (userId) p.userId = userId;
if (base) p.base = base;
if (qty) p.qty = qty;
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });
