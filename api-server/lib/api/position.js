const ParamUtil = require('../param-util.js');

/**
 * Get positions
 * @param {Array} - one element's array of json rpc param:
 *  - base {String} - [optional] base ccy
 *  - userId {Number} - [optional] user's ID
 */
module.exports.getPositions = function(args, cb) {
  const param = args[0];

  gex.getPositions(param, (err, result) => {
    if (err) return cb && cb(err);
    const props2delete = ["id", "createdAt", "updatedAt"];
    ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};

/**
 * Supply position
 * @param {Array} - one element's array of json rpc param:
 *  - userId {Number} - user's ID
 *  - currency {String} - supplying base ccy
 *  - qty {Number} - supplying quantity
 */
module.exports.supplyPosition = function(args, cb) {
  const param = args[0];

  gex.supplyPosition(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = [];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};