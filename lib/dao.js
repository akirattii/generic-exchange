// a DAO class to mediate between service and db
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "Dao";
const DEBUG_LEVEL = 3;

module.exports = class Dao {
  constructor({
    dbOpts, // an option of node-mysql module @see: https://github.com/mysqljs/mysql
    debugLevel = 0, // Debug Level 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
    logger = console,
  }) {
    this.debugLevel = debugLevel;
    this.logger = logger;
    this.dbOpts = dbOpts;
    if (this.debugLevel >= DEBUG_LEVEL) {
      this.logger.info(`[GEX][${CLASS_NAME}] new instance created: dbOpts:${JSON.stringify(dbOpts)}, debugLevel:${debugLevel}`);
    }
    this.createDbInstance(this.dbOpts);
  }

  // *************************************************************************
  //  Database Operations (Generic)
  // *************************************************************************

  query({
    con,
    sql,
    params,
    userId, // optional: executor's userId, just for label use only
  }, cb) {
    const self = this;
    con.query(sql, params, (err, res) => {
      if (self.debugLevel >= DEBUG_LEVEL)
        self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #query: executed [sql]`, sql, "[params]", params);
      return cb && cb(err, res);
    });
  }

  createDbInstance(dbOpts, cb) {
    const self = this;
    if (this.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #createDbInstance`);
    // use db connection pooling
    this.dbPool = mysql.createPool(this.createDbOpts(dbOpts));
    this.dbPool.on('connection', function(con) {
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] DB on connection`);
      return cb && cb(null, con);
    });
  }

  getConnection(cb) {
    const self = this;
    this.dbPool.getConnection(function(err, con) {
      if (err) {
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #getConnection: error:`, err);
      }
      return cb && cb(err, con);
    });
  }

  release(con) {
    con.release();
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #released`);
  }

  lockTables({ con, tables, lockType = "WRITE" }, cb) {
    const self = this;
    const sql = `LOCK TABLES ${tables.join(" ")} ${lockType};`;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #lockTables [sql]`, sql);
    con.query(sql, {}, cb);
  }

  unlockTables({ con }, cb) {
    const self = this;
    const sql = `UNLOCK TABLES;`;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #unlockTables [sql]`, sql);
    con.query(sql, {}, cb);
  }

  createDbOpts(opts) {
    // MySQL Options:
    return {
      connectionLimit: opts.connectionLimit, // use connection pooling
      host: opts.host,
      port: opts.port,
      user: opts.user,
      password: opts.password,
      database: opts.database,
      timezone: opts.timezone ? opts.timezone : 'utc',
      // Enables query format like this: 
      // `connection.query("UPDATE x SET col=:v1" , { v1: 999 }, ...`
      queryFormat: function(query, values) {
        if (!values) return query;
        return query.replace(/\:(\w+)/g, function(txt, key) {
          if (values.hasOwnProperty(key)) {
            return this.escape(values[key]);
          }
          return txt;
        }.bind(this));
      }
    };
  }

};