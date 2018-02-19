const ParamUtil = require('../param-util.js');

/**
 * Get contracts
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - [optional] base ccy
 *  - counter {String} - [optional] counter ccy
 *  - userId {Number} - [optional] user's ID
 *  - cursor {Number} - [optional] database result's cursor position.defaults to 0.
 *  - limit {Number} - [optional] one side count of buy/sell offers
 */
module.exports.getContracts = function(args, cb) {
  const param = args[0];

  gex.getContracts(param, (err, result) => {
    if (err) return cb && cb(err);
    const props2delete = ["counterUserId"];
    ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });

};