#!/usr/bin/env node

const description = `
  Cancel an offer.
  
  ## Example:
  $ node cli/cancelOffer.js --id=1 --user-id=101

  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"cancelOffer","params":[{"id":1,"userId":101}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option('--id <v>', 'Offer ID', parseInt)
  .option("--user-id <v>", "userId of an user who made its offer", parseInt)
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const id = program.id;
const userId = program.userId;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "cancelOffer";
const p = {
  id,
  userId,
};
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });