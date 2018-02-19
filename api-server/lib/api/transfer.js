const ParamUtil = require('../param-util.js');

/**
 * Get specified user's transfers
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - [optional] base ccy
 *  - counter {String} - [optional] counter ccy
 *  - userId {Number} - user's ID
 *  - cursor {Number} - [optional] database result's cursor position.defaults to 0.
 *  - limit {Number} - [optional] one side count of buy/sell offers
 */
module.exports.getUserTransfers = function(args, cb) {
  const param = args[0];

  gex.getUserTransfers(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};

/**
 * Get transfers
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - [optional] base ccy
 *  - counter {String} - [optional] counter ccy
 *  - srcUserId {Number} - [optional] sender's userId
 *  - dstUserId {Number} - [optional] receiver's userId
 *  - cursor {Number} - [optional] database result's cursor position.defaults to 0.
 *  - limit {Number} - [optional] one side count of buy/sell offers
 */
module.exports.getTransfers = function(args, cb) {
  const param = args[0];

  gex.getTransfers(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};

/**
 * Make a transfer
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - sending ccy
 *  - srcUserId {Number} - sender's userId
 *  - dstUserId {Number} - receiver's userId
 *  - qty {Number} - sending ccy's quantity
 *  - feeUserId {Number} - [optional] fee receiver's userId
 *  - feeAmount {Number} - [optional] fee amount. its currency is same as `base`.
 *  - memo {String} - [optional] memo
 *  - memoType {String} - [optional] memo MIME type etc.
 */
module.exports.makeTransfer = function(args, cb) {
  const param = args[0];

  gex.makeTransfer(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};
