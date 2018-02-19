// Simple JSON RPC Client
// NOTICE: To avoid "Reinventing the wheel", you might consider using: https://github.com/tedeh/jayson
const request = require("request");

module.exports = class RpcClient {

  constructor({
    url,
    jsonrpc = "2.0",
    debug = false,
    logger = console,
  }) {
    if (!RpcClient.isValidUrl(url))
      throw Error(`invalid url: "${url}"`);
    this.url = url;
    this.jsonrpc = jsonrpc;
    this.debug = debug;
    this.logger = logger;
  }

  //**************************************************************
  // main methods
  //**************************************************************

  /**
   * Do request
   * Example: `call({method:"getblockhash", params:["1"], id:1}, (err, res)=>{...});
   * @param {Object} - params:
   *  - method {String} - RPC method
   *  - params {Object} - RPC params
   *  - id {String|Number} - [Optional] RPC request ID
   *  - requestOpts {Object} - [Optional] request options.
   *    @see:https://github.com/request/request#requestoptions-callback
   */
  call({ method, params, id = 1, requestOpts = {} }, cb) {
    const self = this;
    const p = self._createRequestParam(method, params, id, requestOpts);
    request(p, (err, response, body) => {
      if (err) return cb && cb(err);
      if (body) body = JSON.parse(body); // parse json string
      err = (body && body.error) ? body.error : null;
      let result = (body && body.result) ? body.result : null;
      return cb && cb(err, result);
    });
  }

  //**************************************************************
  // sub methods
  //**************************************************************

  /**
   * Creates request parameter
   */
  _createRequestParam(method, params, id, requestOpts) {
    // making form data for example like this:  '{"jsonrpc": "1.0", "id":"curltest", "method": "getinfo", "params": [] }'
    const data = {
      jsonrpc: this.jsonrpc,
      id,
      method,
      params,
    };
    let p = {
      url: this.url,
      body: JSON.stringify(data),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Accept": "application/json, text/javascript",
      },
      method: "POST", // JSONRPC server handles only POST requests
      encoding: "UTF-8",
      // json: true,
    };
    if (requestOpts) p = Object.assign(p, requestOpts);
    if (this.debug) this.logger.info("requesting param:", p);
    return p;
  }

  //**************************************************************
  // utility static methods
  //**************************************************************

  static isValidUrl(v) {
    return /^https?:\/\/.+$/.test(v);
  }

};