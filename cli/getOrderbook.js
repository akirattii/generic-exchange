#!/usr/bin/env node

const description = `
  Get a specified currencypair's orderbook.
  
  ## Example:
  $ node cli/getOrderbook.js --cpair="USD/JPY" --merge

  ## Example (curl):
  $ curl -XPOST \\
    -d '{"jsonrpc":"2.0","id":1,"method":"getOrderbook","params":[{"base":"USD","counter":"JPY","merge":true}]}' \\
    -H 'content-type: application/json' \\
    http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--cpair <v>", "Currency pair to buy/sell. eg. 'USD/JPY'")
  .option('--limit <v>', 'Limit count to list', parseInt)
  .option('--merge', 'Returns simple orderbook response merged by price')
  .option('--otc', 'Returns orderbook of OTC offer')
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const [base, counter] = program.cpair.split("/");
const merge = (program.merge) ? true : false;
const otc = (program.otc) ? true : false;
const limit = (program.limit) ? program.limit : 10;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "getOrderbook";
const params = [{
  base,
  counter,
  limit,
  merge,
  otc,
}];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });