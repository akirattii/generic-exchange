const ParamUtil = require('../param-util.js');

/**
* Get an orderbook
* @param {Array} - one element's array of json rpc param:
*  - base {String} - base ccy
*  - counter {String} - counter ccy
*  - otc {Boolean} - [optional] OTC flag. defaults to false.
*  - limit {Number} - [optional] one side count of buy/sell offers
*  - merge {Boolean} - [optional] merge result flag. defaults to false. if set true, returns simple list merged by price. eg: `[{ price:100, remaining:3000 }]` 
*/
module.exports.getOrderbook = function(args, cb) {
	const param = args[0];

  gex.getOrderbook(param, (err, result) => {
    if (err) return cb && cb(err);
    const props2delete = ["createdAt", "updatedAt", "id", "userId", "qty", "cancelled"];
    ParamUtil.deleteProps(result.buy, props2delete);
    ParamUtil.deleteProps(result.sell, props2delete);
    // NOTE: for json rpc response, `err` must be this style: { code:<int>, message:<string>, [name:<string>] }
    return cb && cb(err, result);
  });

};