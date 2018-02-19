#!/usr/bin/env node

const description = `
  Ping GAS to check if it alives.
  
  ## Example:
  $ node cli/ping.js

  ## Example (curl):
  $ curl -XPOST -H 'content-type: application/json' -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "ping",
    "params": [{}]
  }' http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "ping";
const p = {};
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });