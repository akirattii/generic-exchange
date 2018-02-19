/** 
 * GEX operational application error module.
 * For good performance it is just a pure js class and used as `Error` alternative.
 *
 * # Usage:
 * ```
 * const GexError = require("../lib/gex-error.js");
 * const GERR = GexError.errors;
 * throw new GexError(GERR.INVALID_PARAM, "Invalid parameter!");
 * ```
 *
 * GexError instance created by `new Gex(...)` looks like this:
 * ```
 *  GexError {
 *   name: 'GexError',
 *   code: 'UNKNOWN_ERR',
 *   message: 'hogehoge'
 *  }
 * ```
 */

const errors = {
  "UNKNOWN_ERR": 10000,
  "DB_ERR": 10100,
  "NOT_FOUND": 10200,
  "PERMISSION_ERR": 10300,
  "INVALID_PARAM": 10400,
  "INSUFFICIENT_FUNDS": 10500,
  "INVALID_OFFER": 10600,
  "TIMEOUT": 10700,
};


module.exports = class GexError {
  constructor(code = errors.UNKNOWN_ERR, message) {
    this.name = this.constructor.name;
    this.code = code;
    let errname = _getErrorNameByCode(code);
    this.message = (errname) ? errname + ": " + message : message;
  }
};

function _getErrorNameByCode(code) {
  let keys = Object.keys(errors);
  for (let len = keys.length, i = 0; i < len; i++) {
    let k = keys[i];
    if (errors[k] === code) return k;
  }
  return null;
};

module.exports.errors = errors;