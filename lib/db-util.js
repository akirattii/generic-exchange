const mysql = require('mysql');
const Step = require("step");
const fs = require("fs");

// Util class for database preparation. this class has static methods only
module.exports = class DbUtil {

  /** 
   * drop and create database
   * NOTE: it is a static util method
   */
  static initDb({
    database = "generic_exchange", // dbname
    host = "localhost", // db host 
    port = 3306, // db port
    user = "root", // db user
    password, // db password
    currencyPairs = [], // ["USD/JPY"] currency pairs you retrieve
    insertDummydata = false, // whether insert dummydata or not
    forceRecreate = false,
    debug = false,
    logger = console, // if debug, set log function such as console.log
  }, cb) {
    const self = this;
    const sqls = [];
    if (forceRecreate === true) sqls.push("DROP DATABASE IF EXISTS " + database + ";");
    sqls.push("CREATE DATABASE IF NOT EXISTS " + database + ";");
    const con = mysql.createConnection({ host, port, user, password, multipleStatements: true });
    con.connect();
    const ite = function*(_cb) {
      for (let len = sqls.length, i = 0; i < len; i++) {
        let sql = sqls[i];
        if (self.debug) logger.info(`*** Executing SQL:\n${sql}`);
        yield con.query(sql, {}, (err, res) => {
          if (err) {
            con.end();
            return _cb && _cb(err);
          }
          ite.next();
        });
      }
      con.end(); // connection close
      // create tables:
      _initTables({
        database,
        host,
        port,
        user,
        password,
        currencyPairs,
        insertDummydata,
        debug,
        logger,
      }, (err) => {
        return cb && cb(err);
      });
    }(cb);
    ite.next();

    function _initTables({
      database,
      host,
      port,
      user,
      password,
      currencyPairs,
      debug,
      logger,
    }, cb) {
      const sqls = [];
      /* create otc_offer table sql  */
      const otcOfferSql = fs.readFileSync(__dirname + "/sql/ddl_otc_offer.sql").toString();
      sqls.push(otcOfferSql);
      /* create transfer table sql  */
      const transferSql = fs.readFileSync(__dirname + "/sql/ddl_transfer.sql").toString();
      sqls.push(transferSql);
      /* create position table sql  */
      const positionSql = fs.readFileSync(__dirname + "/sql/ddl_position.sql").toString();
      sqls.push(positionSql);
      /* create contract table sql  */
      const contractSql = fs.readFileSync(__dirname + "/sql/ddl_contract.sql").toString();
      sqls.push(contractSql);
      /* create offer table sql  */
      const offerSql = fs.readFileSync(__dirname + "/sql/ddl_offer.sql").toString();
      sqls.push(offerSql);
      /* create dummydata insert sql */
      if (insertDummydata === true)
        sqls.push(fs.readFileSync(__dirname + "/sql/dummydata.sql").toString());
      const con = mysql.createConnection({ database, host, port, user, password, multipleStatements: true });
      con.connect();
      const ite = function*(_cb) {
        for (let len = sqls.length, i = 0; i < len; i++) {
          let sql = sqls[i];
          if (debug) logger.info(`*** Executing SQL:\n${sql}`);
          yield con.query(sql, {}, (err, res) => {
            if (err) {
              con.end();
              return _cb && _cb(err);
            }
            ite.next();
          });
        }
        con.end();
        return _cb && cb(null);
      }(cb);
      ite.next();
    }
  }


}