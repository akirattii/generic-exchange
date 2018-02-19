const config = require('config');
const host = config.gex.apiServer.host;

module.exports = function(req, res, next) {
  const ip = req.connection.remoteAddress;
  if (ip !== host) {
    res.writeHead(401, {});
    res.write(`${ip} access denied`);
    res.end();
    return;
  }
  next();
};