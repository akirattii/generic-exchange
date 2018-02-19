const config = require('config');
const jayson = require('jayson');
const jsonParser = require('body-parser').json;
const connect = require('connect');
const app = connect();
const apiManager = require('./lib/api-manager.js');
const ipFilter = require('./middleware/ip-filter.js');
const errorHandler = require('./middleware/error-handler.js');
logger = require('./lib/logger.js').getLogger(); // global logger
const host = config.gex.apiServer.host;
const port = config.gex.apiServer.port;
const dbOpts = config.gex.dbOpts;
const debugLevel = config.gex.debugLevel;

logger.info(`\n\n
***************************************************************************
* GEX API Server starting:
*  host: ${host}:${port}
*  database: ${JSON.stringify(dbOpts)}
*  logLevel: console:"${config.gex.logging.console.level}", file:"${config.gex.logging.file.level}"
*  GEX debugLevel: ${debugLevel}
***************************************************************************`);

process.on('uncaughtException', function(err) {
  if (err) {
    logger.error(`!!! Aborting in 1 second later on uncaughtException! err.stack:`, err.stack);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

// IP Address filter: allowed localhost access only!
app.use(ipFilter);

// Create JSON server:
logger.info(`Creating JSON RPC APIs:`, JSON.stringify(apiManager.getApiMap()));
const server = jayson.server(apiManager.create());

// parse request body before the jayson middleware:
app.use(jsonParser());
app.use(server.middleware());

// the final error handling
app.use(errorHandler);

//
// ** create a GEX instance as global one
//
const GenericExchange = require('../lib');
gex = new GenericExchange({
  dbOpts,
  debugLevel,
  logger,
}, onload);

function onload() {
  app.listen(port, host, function() {
    logger.info(`GEX API Server listening on port ${port}`);
  });
}
