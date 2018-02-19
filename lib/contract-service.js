// a service class to mediate between frontend and dao
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "ContractService";
/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;

module.exports = class ContractService {
  constructor({
    dao,
    debugLevel = 0, // Debug Level 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
    logger = console,
  }) {
    this.debugLevel = debugLevel;
    this.logger = logger;
    this.dao = dao;
    if (this.debugLevel >= DEBUG_LEVEL) {
      this.logger.info(`[GEX][${CLASS_NAME}] constructor: debugLevel:${debugLevel}`);
    }
  }

  getContractById(con, { id, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`contract\` WHERE id=:id`;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { id };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][${CLASS_NAME}] #getContractById: params:`, params);
    this.dao.query({ con, sql, params }, (err, res) => {
      if (err) return cb && cb(err);
      if (!res || res.length <= 0)
        return cb && cb(new GexError(GERR.NOT_FOUND, "contract not found"));
      return cb && cb(null, res[0]);
    });
  }

  /** Get contracts from DB */
  getContracts(con, {
    userId,
    base, // optional
    counter, // optional
    cursor = 0,
    limit = 50,
  }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL)
      self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getContracts: cpair:${base}/${counter}, cursor:${cursor}, limit:${limit}`);

    Step(function() {
      /* Get user's Contracts */
      _getContracts(con, { userId, base, counter, cursor, limit }, this);
    }, function(err, result) {
      return cb && cb(err, result);
    });

    function _getContracts(con, { userId, base, counter, cursor, limit }, cb) {
      let sql = `SELECT * FROM contract `;
      // where clause:
      const wheres = [];
      if (base) wheres.push("base=:base");
      if (counter) wheres.push("counter=:counter");
      if (userId) wheres.push("userId=:userId");
      if (wheres.length >= 1) sql += " WHERE " + wheres.join(" AND ");
      // orderby clause:
      const orderbys = [];
      orderbys.push("updatedAt DESC");
      orderbys.push("id DESC");
      sql += " ORDER BY " + orderbys.join(", ");
      // limit clause:
      sql += " LIMIT " + cursor + "," + limit;
      const params = {
        userId,
        base,
        counter,
        cursor,
        limit
      };
      self.dao.query({ con, sql, params, userId }, cb);
    }
  }

  /** Get new contracts from matchedOffers */
  getNewContracts(offer, matchedOffers) {
    const self = this;
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getNewContracts`);
    if (!matchedOffers) return ret;

    const ret = [];
    let restQty = offer.qty;
    const otc = (offer.otc === 1) ? offer.otc : 0; // 1:OTC Sales, 0:Normal Exchange Trade
    let isAllDone = false; // 全約定したかどうか
    let contracts = []; // contracts of who are making offer 発注者自身の約定一覧 

    // *** 相手の注文処理
    for (let len = matchedOffers.length, i = 0; i < len; i++) {
      let matchedOffer = matchedOffers[i];
      let counterOfferId = matchedOffer.id;
      let counterBase = matchedOffer.base;
      let counterCounter = matchedOffer.counter;
      let counterBuysell = matchedOffer.buysell;
      let counterRemainingBefore = matchedOffer.remaining;
      let counterRemainingAfter = counterRemainingBefore - restQty;
      let counterUserId = matchedOffer.userId;
      let counterQty = matchedOffer.qty;
      let counterPrice = matchedOffer.price;
      let qtyPrice = counterPrice; // 約定price (相手の価格がoffererにとっての約定価格でもある)
      let qtyContract; // 約定qty

      // get a contract qty
      if (counterRemainingAfter >= 0) {
        qtyContract = -(counterRemainingAfter - counterRemainingBefore);
        isAllDone = true;
      } else {
        restQty = -counterRemainingAfter;
        qtyContract = -(0 - counterRemainingBefore);
      }

      // offerer's contract 自身の約定
      let offererItem = {
        userId: offer.userId,
        counterUserId: counterUserId,
        base: offer.base,
        counter: offer.counter,
        buysell: offer.buysell,
        offerPrice: offer.price,
        offerQty: offer.qty,
        price: qtyPrice,
        qty: qtyContract,
        otc,
      };
      ret.push(offererItem);

      // counter's contract 相手の約定
      let counterItem = {
        userId: counterUserId,
        counterUserId: offer.userId,
        base: counterBase,
        counter: counterCounter,
        buysell: counterBuysell,
        offerPrice: counterPrice,
        offerQty: counterQty,
        price: qtyPrice,
        qty: qtyContract,
        otc,
      };
      ret.push(counterItem);

      // FIXME: DEBUG:
      if (self.debugLevel >= DEBUG_LEVEL) {
        self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getNewContracts: offers matched!
    offerer contract: ${JSON.stringify(offererItem)}
    counter contract: ${JSON.stringify(counterItem)}`);
      }

      // console.log("***************************************************");
      // console.log("* 自分の約定:", offererItem);
      // console.log("***************************************************");
      // console.log("***************************************************");
      // console.log("* 相手の約定:", counterItem);
      // console.log("***************************************************");

      if (isAllDone) break;
    }

    return ret;
  }


  /**
   * Inserts new contracts to DB
   *
   * param's `newContract` looks like this:
   *  [ { userId: 101,
   *     counterUserId: 103,
   *     base: 'USD',
   *     counter: 'JPY',
   *     buysell: 1,
   *     offerPrice: 110,
   *     offerQty: 100,
   *     price: 109,
   *     qty: 50,
   *     otc: 0 },
   *   { userId: 103,
   *     counterUserId: 101,
   *     base: 'USD',
   *     counter: 'JPY',
   *     buysell: -1,
   *     offerPrice: 109,
   *     offerQty: 50,
   *     price: 109,
   *     qty: 50,
   *     otc: 0 }]
   */
  insertNewContracts(con, newContracts, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #insertNewContracts start`);
    if (!Array.isArray(newContracts)) throw new GexError(GERR.INVALID_PARAM, "invalid parameter: `newContracts` must be array");
    const ite = function*(_cb) {
      // ** related offers update:
      let nc, sql, params;
      for (let len = newContracts.length, i = 0; i < len; i++) {
        nc = newContracts[i];
        sql = `INSERT contract (
          userId,
          counterUserId,
          base,
          counter,
          buysell,
          offerPrice,
          offerQty,
          price,
          qty,
          otc,
          createdAt,
          updatedAt
        ) VALUES (
          :userId,
          :counterUserId,
          :base,
          :counter,
          :buysell,
          :offerPrice,
          :offerQty,
          :price,
          :qty,
          :otc,
          unix_timestamp(), 
          unix_timestamp() 
        )`;
        let userId = nc.userId;
        params = {
          userId,
          counterUserId: nc.counterUserId,
          base: nc.base,
          counter: nc.counter,
          buysell: nc.buysell,
          offerPrice: nc.offerPrice,
          offerQty: nc.offerQty,
          price: nc.price,
          qty: nc.qty,
          otc: nc.otc,
        };
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #insertNewContracts: inserting:`, params);
        yield self.dao.query({ con, sql, params }, (err, res) => {
          if (err) return _cb && _cb(err, res);
          ite.next();
        });
      }
      return _cb && _cb(null);
    }(cb);
    ite.next();
  }

};