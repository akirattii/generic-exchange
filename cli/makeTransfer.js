#!/usr/bin/env node

const description = `
  Make a transfer.
  
  ## Example:
  $ node cli/makeTransfer.js --base="USD" --qty=100 --src-user-id=101 --dst-user-id=102 --memo="thanks!" --memo-type="text/plain"

  ## Example (curl):
  $ curl -XPOST \
   -d '{"jsonrpc":"2.0","id":1,"method":"makeTransfer","params":[{"base":"USD","qty":100,"srcUserId":101,"dstUserId":102,"memo":"thanks!","memoType":"text/plain"}]}' \
   -H 'content-type: application/json' \
   http://127.0.0.1:3001/
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');

program
  .version('0.0.1')
  .description(description)
  .option("--src-user-id <v>", "sender's userID", parseInt)
  .option("--dst-user-id <v>", "receiver's userID", parseInt)
  .option("--base <v>", "A sending currency. eg. 'USD'")
  .option('--qty <v>', 'A quantity to send', parseInt)
  .option("--fee-user-id <v>", "ID of an user who receives fee", parseInt)
  .option("--fee-amount <v>", "Fee amount", parseInt)
  .option("--memo <v>", "Memo")
  .option("--memo-type <v>", "Memo type")
  .option('--debug', 'Enables debug log')
  .option('--prettyprint', 'Prettyprint the result')
  .parse(process.argv);

const srcUserId = program.srcUserId;
const dstUserId = program.dstUserId;
const base = program.base;
const qty = program.qty;
const feeUserId = program.feeUserId;
const feeAmount = program.feeAmount;
const memo = program.memo;
const memoType = program.memoType;
const debug = (program.debug) ? true : false;
const prettyprint = (program.prettyprint) ? true : false;

const method = "makeTransfer";
const p = {};
if (srcUserId) p.srcUserId = srcUserId;
if (dstUserId) p.dstUserId = dstUserId;
if (base) p.base = base;
if (qty) p.qty = qty;
if (feeUserId) p.feeUserId = feeUserId;
if (feeAmount) p.feeAmount = feeAmount;
if (memo) p.memo = memo;
if (memoType) p.memoType = memoType;
const params = [p];

const client = common.getClient({ debug });
common.call({ client, method, params, prettyprint });
