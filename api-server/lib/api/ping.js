const ParamUtil = require('../param-util.js');

/**
 * Ping to server
 * @param {Array} - one element's array of json rpc param:
 * - empty object
 */
module.exports.ping = function(args, cb) {
  const param = args[0];

  gex.ping(param, (err, result) => {
    if (err) return cb && cb(err);
    // const props2delete = ["counterUserId"];
    // ParamUtil.deleteProps(result, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });
};