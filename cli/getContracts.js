#!/usr/bin/env node

const description = `
  Get contracts.
  
  ## Example:
  $ node cli/getContracts.js --cpair="USD/JPY" --user-id=101 --cursor=0 --limit=10

  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"getContracts","params":[{"userId":101,"cursor":0,"limit":10}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--cpair <v>", "Currency pair to buy/sell. eg. 'USD/JPY'")
  .option("--user-id <v>", "user's ID", parseInt)
  .option('--cursor <v>', 'Cursor position of list', parseInt)
  .option('--limit <v>', 'Limit count to list', parseInt)
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const [base, counter] = (program.cpair) ? program.cpair.split("/"): [null, null];
const userId = program.userId;
const cursor = (program.cursor) ? program.cursor : 0;
const limit = (program.limit) ? program.limit : 10;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "getContracts";
const p = {};
if (base) p.base = base;
if (counter) p.counter = counter;
if (userId) p.userId = userId;
if (cursor) p.cursor = cursor;
if (limit) p.limit = limit;
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });