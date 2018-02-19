#!/usr/bin/env node

const description = `
  Make an offer.
  
  ## Example:
  $ node cli/makeOffer.js --user-id=101 --cpair="USD/JPY" --buysell=1 --price=120 --qty=100

  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"makeOffer","params":[{"userId":101,"base":"USD","counter":"JPY","buysell":1,"price":120,"qty":100}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--user-id <v>", "user's ID", parseInt)
  .option("--cpair <v>", "A currencypair. eg. 'USD/JPY'")
  .option("--buysell <v>", "buy/sell flag. -1:sell, 1:buy", parseInt)
  .option('--price <v>', 'A price of base ccy', parseInt)
  .option('--qty <v>', 'A quantity to base ccy', parseInt)
  .option("--fee-user-id <v>", "ID of an user who receives fee", parseInt)
  .option("--fee-amount <v>", "Fee amount", parseInt)
  .option("--fee-currency <v>", "Fee currency. eg. 'JPY'")
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const [base, counter] = program.cpair.split("/");
const userId = program.userId;
const buysell = program.buysell;
const price = program.price;
const qty = program.qty;
const feeUserId = program.feeUserId;
const feeAmount = program.feeAmount;
const feeCurrency = program.feeCurrency;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "makeOffer";
const p = {};
if (userId) p.userId = userId;
if (base) p.base = base;
if (counter) p.counter = counter;
if (buysell) p.buysell = buysell;
if (price) p.price = price;
if (qty) p.qty = qty;
if (feeUserId) p.feeUserId = feeUserId;
if (feeAmount) p.feeAmount = feeAmount;
if (feeCurrency) p.feeCurrency = feeCurrency;
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });
