const config = require('config');
// const jayson = require('jayson');
const RpcClient = require('../api-server/lib/rpc-client.js');
const host = config.gex.apiServer.host;
const port = config.gex.apiServer.port;
const url = `http://${host}:${port}`;
// const client = jayson.client.http({ port });

// returns JSON RPC Client instance
module.exports.getClient = function({ debug = false }) {
  const client = new RpcClient({ url, debug });
  return client;
};

module.exports.call = function({ client, method, params, prettyprint = false }) {
  client.call({ method, params }, function(err, result) {
    if (err) {
      console.error("[Error]", err);
    } else {
      if (prettyprint)
        console.log(JSON.stringify(result, null, 2));
      else
        console.log(JSON.stringify(result));
    }
  });
};