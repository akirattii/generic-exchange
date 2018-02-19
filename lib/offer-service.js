// a service class to mediate between frontend and dao
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "OfferService";
/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;

module.exports = class OfferService {
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

  //********************************************************************************
  // DB util methods
  //********************************************************************************

  lockTable(con, { offer, lockType = "WRITE" }, cb) {
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}]  #lockTable`);
    const offerTableName = "offer";
    const tables = [offerTableName];
    self.dao.lockTables({ con, tables, lockType }, cb);
  }

  unlockTable(con, cb) {
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}]  #unlockTable`);
    self.dao.unlockTables({ con }, cb);
  }

  lockOffers(con, {
    userId, // [optional]
  }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][user:${ userId ? userId : "" }][${CLASS_NAME}]  #lockOffers`);
    let sql = `SELECT * FROM offer `;
    // // where clause:
    // const wheres = [];
    // wheres.push("base=:base");
    // wheres.push("counter=:counter");
    // if (userId) wheres.push("userId=:userId");
    // sql += " WHERE " + wheres.join(" AND ");
    // // for update clause:
    sql += " FOR UPDATE";
    let params = {};
    // const params = {
    //   base,
    //   counter,
    // };
    self.dao.query({ con, sql, params, userId }, cb);
  }

  //********************************************************************************
  // Main methods
  //********************************************************************************

  getOrderbook(con, {
    userId, // [optional]
    base,
    counter,
    otc = false, // [optional]
    forUpdate = false, // [optional]
    limit = 10, // [optional]
    merge = false, // [optional] if set true, returns specialized data for orderbook readonly / 1に設定することで板表示専用のレスポンスを返します
  }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL)
      self.logger.info(`[GEX][user:${ userId ? userId : "" }][user:${ userId ? userId : "" }][${CLASS_NAME}] #getOrderbook: ${base}/${counter}`);
    const result = {
      // buy:[], sell:[]
    };

    const origLimit = limit;
    if (merge) limit = 100; // 読み取り専用の注文板を作成するために多めにデータを拾う

    Step(function() {
      /* Get buying offers */
      _getOrderbook(con, { userId, base, counter, buysell: 1, otc, forUpdate, limit }, this);
    }, function(err, res) {
      if (err) throw err;
      result.buy = res;
      /* Get selling offers */
      _getOrderbook(con, { userId, base, counter, buysell: -1, otc, forUpdate, limit }, this);
    }, function(err, res) {
      if (err) throw err;
      result.sell = res;
      if (merge) { // same price merging
        result.buy = _mergeBySamePrice(result.buy, origLimit);
        result.sell = _mergeBySamePrice(result.sell, origLimit);
      }
      return null;
    }, function(err) {
      return cb && cb(err, result);
    });

    // sums remainings of same price / 同じ価格のremainingをマージし、読み取り専用の注文板情報を作成
    function _mergeBySamePrice(items, limit) {
      let output = [];
      for (let len = items.length, i = 0; i < len; i++) {
        let item = items[i];
        let base = item.base;
        let counter = item.counter;
        let price = item.price;
        let remaining = item.remaining;
        if (output.length >= limit) break;
        if (i === 0) {
          output.push({ price, remaining });
          continue;
        }
        let lastItem = output[output.length - 1];
        if (price === lastItem.price) {
          lastItem.remaining += remaining;
        } else {
          output.push({ price, remaining });
        }
      };
      return output;
    }

    function _getOrderbook(con, { userId, base, counter, buysell, otc, forUpdate, limit }, cb) {
      const tablename = (otc === true) ? "otc_offer" : "offer";
      let sql = `SELECT * FROM ${tablename} `;
      // where clause:
      const wheres = [];
      wheres.push("base=:base");
      wheres.push("counter=:counter");
      wheres.push("buysell=:buysell");
      wheres.push("remaining>0");
      wheres.push("cancelled=0");
      if (userId) wheres.push("userId=:userId");
      sql += " WHERE " + wheres.join(" AND ");
      // orderby clause:
      const orderbys = [];
      orderbys.push((buysell === 1) ? "price DESC" : "price ASC");
      orderbys.push("updatedAt ASC");
      sql += " ORDER BY " + orderbys.join(", ");
      // limit clause:
      sql += " LIMIT 0," + limit;
      // for update clause:
      if (forUpdate === true) sql += " FOR UPDATE";
      const params = {
        base,
        counter,
        buysell,
        userId,
      };
      self.dao.query({ con, sql, params, userId }, cb);
    }
  }


  getOffers(con, {
    userId,
    base,
    counter,
    otc = 0,
    cursor = 0,
    limit = 50,
  }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL)
      self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getOffers: userId:${userId}, cpair:${base}/${counter}, cursor:${cursor}, limit:${limit}`);

    Step(function() {
      /* Get user's offers */
      _getOffers(con, { userId, base, counter, otc, cursor, limit }, this);
    }, function(err, result) {
      return cb && cb(err, result);
    });

    function _getOffers(con, { userId, base, counter, otc, cursor, limit }, cb) {
      const tablename = (otc === 1) ? "otc_offer" : "offer";
      let sql = `SELECT * FROM ${tablename} `;
      // where clause:
      const wheres = [];
      if (base) wheres.push("base=:base");
      if (counter) wheres.push("counter=:counter");
      if (userId) wheres.push("userId=:userId");
      sql += " WHERE " + wheres.join(" AND ");
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

  getOfferById(con, { id, otc = 0, forUpdate = false }, cb) {
    const tablename = (otc === 1) ? "otc_offer" : "offer";
    let sql = `SELECT * FROM \`${tablename}\` WHERE id=:id`;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { id, forUpdate };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][${CLASS_NAME}] #getOfferById: params:`, params);
    this.dao.query({ con, sql, params }, (err, res) => {
      if (err) return cb && cb(err);
      if (!res || res.length <= 0)
        return cb && cb(new GexError(GERR.NOT_FOUND, "offer not found"));
      return cb && cb(null, res[0]);
    });
  }

  getMatchingOffers(con, { offer, forUpdate = false }, cb) {
    const self = this;
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getMatchingOffers`);
    const tablename = (offer.otc === 1) ? "otc_offer" : "offer";
    const base = offer.base;
    const counter = offer.counter;
    const price = offer.price;
    let counterBuysell, priceInequalitySign, priceSort;
    if (offer.buysell === 1) { // BUY
      counterBuysell = -1; // counter is SELL
      priceInequalitySign = "<="; // buyer wants cheap price
      priceSort = "ASC";
    } else if (offer.buysell === -1) {
      counterBuysell = 1; // counter is BUY
      priceInequalitySign = ">="; // seller wants high price
      priceSort = "DESC";
    } else {
      throw new GexError(GERR.INVALID_PARAM, `invalid 'buysell': ${offer.buysell}`);
    }
    let sql = `SELECT * FROM ${tablename}
    WHERE
      base=:base AND
      counter=:counter AND
      buysell=:buysell AND
      price${priceInequalitySign}:price AND
      remaining>0 AND
      cancelled=0
    ORDER BY
      price ${priceSort},
      updatedAt ASC`;
    if (forUpdate) sql += " FOR UPDATE";
    const params = {
      base,
      counter,
      buysell: counterBuysell,
      price,
    };
    self.dao.query({ con, sql, params, userId }, cb);
  }

  pickupMatchedOffers(offer, rows) {
    const self = this;
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #pickupMatchedOffers`);
    if (!rows) return null;
    let ret = [];
    let sum = 0;
    for (let len = rows.length, i = 0; i < len; i++) {
      let row = rows[i];
      ret.push(row);
      sum += row.qty;
      if (sum >= offer.qty) return ret;
    }
    return ret;
  }


  getRelatedOffersChange(offer, matchedOffers) {
    const self = this;
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getRelatedOffersChange`);
    const ret = {
      offersChanged: [],
      offerCreated: null,
    };
    if (!matchedOffers) return ret;

    let restQty = offer.qty;
    const otc = offer.otc; // 1:OTC Sales, 0:Normal Exchange Trade
    let isAllDone = false; // 全約定したかどうか

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
      let counterPrice = matchedOffer.price;

      if (counterRemainingAfter >= 0) {
        // offer changing (offer of counter)
        let qtyChange = counterRemainingAfter - counterRemainingBefore; // quantity of remaining change
        ret.offersChanged.push({
          offerId: counterOfferId,
          base: counterBase,
          counter: counterCounter,
          userId: counterUserId,
          remainingBefore: counterRemainingBefore,
          remainingAfter: counterRemainingAfter,
          qtyChange,
          buysell: counterBuysell,
          price: counterPrice,
          otc,
        });
        // return ret;
        isAllDone = true;
        break;
      } else {
        restQty = -counterRemainingAfter;
        // offer changing: (offer of counter)
        let qtyChange = 0 - counterRemainingBefore; // quantity of remaining change
        ret.offersChanged.push({
          offerId: counterOfferId,
          base: counterBase,
          counter: counterCounter,
          userId: counterUserId,
          remainingBefore: counterRemainingBefore,
          remainingAfter: 0,
          qtyChange,
          buysell: counterBuysell,
          price: counterPrice,
          otc,
        });

      }
    }
    // ** 自分自身の注文処理 (offer of myself)
    //（捌ききれなかった分は新規注文に）
    ret.offerCreated = {
      userId: offer.userId,
      base: offer.base,
      counter: offer.counter,
      buysell: offer.buysell,
      price: offer.price,
      qty: offer.qty,
      remaining: (isAllDone) ? 0 : restQty,
      otc,
    };
    return ret;
  }

  updateRelatedOffers(con, relatedOffersChange, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #updateRelatedOffers start`);
    if (!relatedOffersChange)
      throw new GexError(GERR.INVALID_PARAM, "`relatedOffersChange` must be set");

    const ite = function*(_cb) {
      // ** related offers update:
      let oc, sql, params;
      for (let len = relatedOffersChange.offersChanged.length, i = 0; i < len; i++) {
        oc = relatedOffersChange.offersChanged[i];
        const tablename = (oc.otc === 1) ? "otc_offer" : "offer";
        sql = `UPDATE ${tablename} SET
         remaining = remaining + (:qtyChange),
         updatedAt = unix_timestamp() 
        WHERE id=:id`;
        params = { id: oc.offerId, qtyChange: oc.qtyChange };
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #updateRelatedOffers: updating:`, params);
        yield self.dao.query({ con, sql, params }, (err, res) => {
          if (err) return _cb && _cb(err, res);
          ite.next();
        });
      }
      // ** new offer insert if exists:
      if (relatedOffersChange.offerCreated) {
        oc = relatedOffersChange.offerCreated;
        sql = `INSERT INTO offer (
          userId,
          base,
          counter,
          buysell,
          price,
          qty,
          remaining,
          createdAt,
          updatedAt
        ) VALUES (
          :userId,
          :base,
          :counter,
          :buysell,
          :price,
          :qty,
          :remaining,
          unix_timestamp(),
          unix_timestamp()
        )`;
        let userId = oc.userId
        params = {
          userId,
          base: oc.base,
          counter: oc.counter,
          buysell: oc.buysell,
          price: oc.price,
          qty: oc.qty,
          remaining: oc.remaining,
        };
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #updateRelatedOffers: inserting:`, params);
        self.dao.query({ con, sql, params }, (err, res) => {
          return _cb && _cb(err, res);
        });
      } else {
        return _cb && _cb(null);
      }
    }(cb);
    ite.next();
  }

  cancelOffer(con, { id }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #cancelOffer start`);
    let sql = `UPDATE offer SET cancelled=1 WHERE id=:id`;
    const params = { id };
    self.dao.query({ con, sql, params }, cb);
  }


  // selectForUpdate(con, { offer }, cb) {
  //   const self = this;
  //   const offerTableName = DbUtil.getOfferTableName(offer.base, offer.counter);
  //   let sql = `SELECT * FROM ${offerTableName} FOR UPDATE`;
  //   const params = {};
  //   self.dao.query({ con, sql, params }, cb);
  // }

};