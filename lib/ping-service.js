// a service class to mediate between frontend and dao
const CLASS_NAME = "PingService";
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;

module.exports = class PingService {
  constructor({
    dao,
    debugLevel = 0, // Debug Level 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
    logger = console,
  }) {
    const self = this;
    this.debugLevel = debugLevel;
    this.logger = logger;
    this.dao = dao;
    if (this.debugLevel >= DEBUG_LEVEL) {
      this.logger.info(`[GEX][${CLASS_NAME}] constructor: debugLevel:${debugLevel}`);
    }
  }

  ping(con, {}, cb) {
    return cb && cb(null, "pong");
  }
};