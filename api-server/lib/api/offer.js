const ParamUtil = require('../param-util.js');

/**
 * Get offers
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - base ccy
 *  - counter {String} - counter ccy
 *  - userId {Number} - [optional] user's ID
 *  - cursor {Number} - [optional] database result's cursor position.defaults to 0.
 *  - limit {Number} - [optional] one side count of buy/sell offers
 */
module.exports.getOffers = function(args, cb) {
  const param = args[0];

  gex.getOffers(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};


/**
 * Make an offer
 * @param {Array} - one element's array of json rpc param:
 *  - userId {Number} - user's ID
 *  - base {String} - base ccy
 *  - counter {String} - counter ccy
 *  - buysell {Number} - buy/sell type. 1:buy, -1:sell
 *  - price {Number} - base ccy's price
 *  - qty {Number} - base ccy's quantity
 *  - feeUserId {Number} - [optional] fee receiver's userId
 *  - feeAmount {Number} - [optional] fee amount
 *  - feeCurrency {String} - [optional] fee currency
 */
module.exports.makeOffer = function(args, cb) {
  const param = args[0];

  gex.makeOffer(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};

/**
 * Cancel an offer
 * @param {Array} - one element's array of json rpc param:
 *  - id {Number} - offer's ID
 *  - userId {Number} - user's ID
 */
module.exports.cancelOffer = function(args, cb) {
  const param = args[0];

  gex.cancelOffer(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};


/**
 * Inserts or updates a new otc_offer
 * @param {Array} - one element's array of json rpc param. new otc_offer model to insert/update:
 * - userId {Number} - generally it's a OTC Sales provider's admin userId
 * - base {String} - base currency
 * - counter {String} - counter currency
 * - buysell {Number} - buy/sell flag. sell:-1, buy:1
 * - price {Number} - price of base ccy
 * - qty {Number} - quantity of base ccy to be provided
 * - remaining {Number} - remaining quantity of base ccy to be provided
 * - cancelled {Number} - 1:cancelled, 0:not_cancelled
 */
module.exports.upsertOtcOffer = function(args, cb) {
  const param = args[0];

  gex.upsertOtcOffer(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};