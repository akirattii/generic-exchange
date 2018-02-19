// a service class to mediate between frontend and dao
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "PositionService"
/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;


module.exports = class PositionService {
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

  /** supply some asset to an user */
  supplyPosition(con, { userId, base, qty }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #supplyPosition`);
    self.getAndUpdatePosition(con, { userId, base, qtyChange: qty }, cb);
  }

  /** transfer funds among users */
  makeTransfer(con, { transfer }, cb) {
    const self = this;
    const userId = transfer.srcUserId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #makeTransfer`);

    const srcUserId = transfer.srcUserId;
    const dstUserId = transfer.dstUserId;
    const base = transfer.base;
    const qty = transfer.qty;
    const feeUserId = transfer.feeUserId;
    const feeCurrency = transfer.feeCurrency;
    const feeAmount = transfer.feeAmount;

    let relatedPositionsChange = [];
    // ** sender
    const senderItem = { base, userId: srcUserId, qtyChange: -qty };
    relatedPositionsChange.push(senderItem);
    // ** recipient
    const recipientItem = { base, userId: dstUserId, qtyChange: qty };
    relatedPositionsChange.push(recipientItem);
    // ** fee
    const feeRelatedPositionsChange = self.getFeeRelatedPositionsChange(transfer);
    relatedPositionsChange = relatedPositionsChange.concat(feeRelatedPositionsChange)
    this.updateRelatedPositions(con, relatedPositionsChange, cb);
  }

  getFeeRelatedPositionsChange(transfer) {
    const self = this;
    const userId = transfer.srcUserId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getFeeRelatedPositionsChange`);

    const srcUserId = transfer.srcUserId;
    const dstUserId = transfer.dstUserId;
    const base = transfer.base;
    const qty = transfer.qty;
    const feeUserId = transfer.feeUserId;
    let feeCurrency = transfer.feeCurrency;
    const feeAmount = transfer.feeAmount;

    const relatedPositionsChange = [];
    // ** fee
    if (feeUserId && feeAmount > 0) {
      if (!feeCurrency) feeCurrency = base;
      // **** fee sender
      const feeSenderItem = { base: feeCurrency, userId: srcUserId, qtyChange: -feeAmount };
      relatedPositionsChange.push(feeSenderItem);
      // **** fee recipient
      const feeRecipientItem = { base: feeCurrency, userId: feeUserId, qtyChange: feeAmount };
      relatedPositionsChange.push(feeRecipientItem);
    }
    return relatedPositionsChange;
  }

  chargeFee(con, { transfer }, cb) {
    const self = this;
    const userId = transfer.srcUserId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #chargeFee`);
    const relatedPositionsChange = self.getFeeRelatedPositionsChange(transfer);
    this.updateRelatedPositions(con, relatedPositionsChange, cb);
  }

  /** Get a positions' change of a related offers */
  getRelatedPositionsChange(offer, offersChange) {
    const self = this;
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getRelatedPositionsChange`);
    let ret = [];
    const base = offer.base;
    const counter = offer.counter;
    const buysell = offer.buysell;
    const price = offer.price;
    const qty = offer.qty;

    for (let len = offersChange.offersChanged.length, i = 0; i < len; i++) {
      //
      // ** ポジション更新データ作成 (counter)
      //
      let oc = offersChange.offersChanged[i];
      let counterUserId = oc.userId;
      // let counterPositionId = oc.positionId;
      let counterBuysell = oc.buysell;
      let counterPrice = oc.price;
      let counterRemainingBefore = oc.remainingBefore;
      let counterRemainingAfter = oc.remainingAfter;
      let counterRemainingDiff = counterRemainingBefore - counterRemainingAfter;
      let counterCounterPriceDiff = new BigNumber(counterPrice).times(counterRemainingDiff).toNumber();

      // 相手の base currency:
      let counterBaseItem = {
        base,
        userId: counterUserId,
        //決済注文約定ならbaseポジ減らしてcounterポジ（typically キャッシュ）増やす
        //新規注文約定ならbaseポジ増やしてcounterポジ（typically キャッシュ）減らす
        qtyChange: (counterBuysell === -1) ? -counterRemainingDiff : counterRemainingDiff,
      };
      ret.push(counterBaseItem);
      // 相手の counter currency:
      let counterCounterItem = {
        base: counter, // 反転
        userId: counterUserId,
        // 売注文約定ならbaseポジ減らしてcounterポジ増やす。買注文約定ならその逆
        qtyChange: (counterBuysell === -1) ? counterCounterPriceDiff : -counterCounterPriceDiff,
      };
      ret.push(counterCounterItem);

      //
      // ** ポジション更新データ作成 (self)
      //

      // 自分の base currency:
      let selfBaseItem = {
        base,
        userId,
        // 売注文約定ならbaseポジ減らしてcounterポジ増やす。買注文約定ならその逆
        qtyChange: (buysell === -1) ? -counterRemainingDiff : counterRemainingDiff,
      };
      ret.push(selfBaseItem);
      // 自分の counter currency:
      let selfCounterItem = {
        base: counter, // 反転
        userId,
        // 売注文約定ならbaseポジ減らしてcounterポジ増やす。買注文約定ならその逆
        qtyChange: (buysell === -1) ? counterCounterPriceDiff : -counterCounterPriceDiff,
      };
      ret.push(selfCounterItem);
    }

    /* この時点での example:[ 
    { base: 'USD', userId: 103, qtyChange: -50 },
    { base: 'JPY', userId: 103, qtyChange: 5450 },
    { base: 'USD', userId: 101, qtyChange: 50 },
    { base: 'JPY', userId: 101, qtyChange: -5450 },
    { base: 'USD', userId: 104, qtyChange: -10 },
    { base: 'JPY', userId: 104, qtyChange: 1100 },
    { base: 'USD', userId: 101, qtyChange: 10 },
    { base: 'JPY', userId: 101, qtyChange: -1100 } ]
    */
    // base+userId で数量をマージする
    let item, k, merged = {};
    for (let len = ret.length, i = 0; i < len; i++) {
      item = ret[i];
      k = item.base + " " + item.userId;
      if (merged[k]) {
        merged[k] += item.qtyChange;
      } else {
        merged[k] = item.qtyChange;
      }
    }
    ret = [];
    let mergedKeys = Object.keys(merged);
    for (let len = mergedKeys.length, i = 0; i < len; i++) {
      let k = mergedKeys[i];
      let [base, userId] = k.split(" ");
      let qtyChange = merged[k];
      ret.push({ base, userId, qtyChange });
    }
    /* この時点(マージ後)のexample: [ 
    { base: 'USD', userId: '103', qtyChange: -50 },
    { base: 'JPY', userId: '103', qtyChange: 5450 },
    { base: 'USD', userId: '101', qtyChange: 60 },
    { base: 'JPY', userId: '101', qtyChange: -6550 },
    { base: 'USD', userId: '104', qtyChange: -10 },
    { base: 'JPY', userId: '104', qtyChange: 1100 } ]
    */
    return ret;
  }


  /**
   * update specified positions
   * @param {Connection} - db connection
   * @param {Array} - relatedPositionsChange. example:
   * [ { base: 'USD', userId: '103', qtyChange: -50 },
   *   { base: 'JPY', userId: '103', qtyChange: 5450 },
   *   { base: 'USD', userId: '101', qtyChange: 90 },
   *   { base: 'JPY', userId: '101', qtyChange: -9850 },
   *   { base: 'USD', userId: '104', qtyChange: -40 },
   *   { base: 'JPY', userId: '104', qtyChange: 4400 } ]
   */
  updateRelatedPositions(con, relatedPositionsChange, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][${CLASS_NAME}] #updateRelatedPositions`);
    if (!relatedPositionsChange) return null;
    const ite = function*(_cb) {
      // ** related positions update:
      let obj, sql, sqlparam;
      for (let len = relatedPositionsChange.length, i = 0; i < len; i++) {
        obj = relatedPositionsChange[i];
        let base = obj.base;
        let userId = obj.userId;
        let qtyChange = obj.qtyChange;
        yield self.getAndUpdatePosition(con, { base, userId, qtyChange }, (err, res) => {
          if (err) return _cb && _cb(err);
          ite.next();
        });
      }
      return cb && cb(null);
    }(cb);
    ite.next();
  }

  getAndUpdatePosition(con, { base, userId, qtyChange }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getAndUpdatePosition`);

    Step(function() {
      // 検索＆行ロック
      self.getPositions(con, { base, userId, forUpdate: true }, this);
    }, function(err, res) {
      if (err) return cb && cb(err);
      let pos = (res && res.length >= 1) ? res[0] : null; // must be one record because of unique key finding
      if (!pos) {
        // ** INSERT:
        self.insertPosition(con, { base, userId, qtyChange }, this);
      } else {
        // ** UPDATE:
        self.updatePosition(con, { base, userId, qtyChange }, this);
      }
    }, function(err, res) {
      return cb && cb(err, res);
    });
  }

  getPositionById(con, { id, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`position\` WHERE id=:id`;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { id };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][${CLASS_NAME}] #getPositionById: param:`, params);
    this.dao.query({ con, sql, params }, (err, res) => {
      if (err) return cb && cb(err);
      if (!res || res.length <= 0)
        return cb && cb(new GexError(GERR.NOT_FOUND, "position not found"));
      return cb && cb(null, res[0]);
    });
  }

  getPositions(con, { base, userId, cursor = 0, limit = 100, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`position\``;
    const wheres = [];
    if (base) wheres.push("base=:base");
    if (userId) wheres.push("userId=:userId");
    if (wheres.length >= 1) sql += " WHERE " + wheres.join(" AND ");
    const orderbys = [];
    orderbys.push("base ASC");
    sql += " ORDER BY " + orderbys.join(", ");
    sql += " LIMIT " + cursor + "," + limit;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { base, userId };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getPositions: param:`, params);
    this.dao.query({ con, sql, params, userId }, cb);
  }

  getPositionByUserBase(con, { base, userId, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`position\``;
    const wheres = ["userId=:userId", "base=:base"];
    if (wheres.length >= 1) sql += " WHERE " + wheres.join(" AND ");
    if (forUpdate) sql += " FOR UPDATE";
    const params = { base, userId };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getPositionByUserBase: param:`, params);
    this.dao.query({ con, sql, params, userId }, (err, res) => {
      if (err) return cb && cb(err);
      if (!res || res.length <= 0) return cb && cb("no position record found");
      return cb && cb(null, res[0]);
    });
  }

  updatePosition(con, { base, userId, qtyChange }, cb) {
    const sql = `UPDATE \`position\` SET 
   qty = qty + (:qtyChange), 
   updatedAt = unix_timestamp()
  WHERE base=:base AND userId=:userId`;
    const params = { base, userId, qtyChange };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #updatePosition: param:`, params);
    this.dao.query({ con, sql, params, userId }, cb);
  }

  insertPosition(con, { base, userId, qtyChange }, cb) {
    const sql = `INSERT INTO \`position\` (
    userId,
    base,
    qty,
    createdAt,
    updatedAt
  ) VALUES (
    :userId,
    :base,
    :qtyChange,
    unix_timestamp(),
    unix_timestamp()
  )`;
    const params = { base, userId, qtyChange };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #insertPosition: param:`, params);
    this.dao.query({ con, sql, params, userId }, cb);
  }


};