/*
 * Over-The-Counter Sales Offer Service
 */
// a service class to mediate between frontend and dao
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "OtcOfferService";
/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;

module.exports = class OtcOfferService {
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

  /**
   * Inserts or updates a new otc_offer
   * @param {Connection} - DB connection
   * @param {Object} - new otc_offer model to insert/update:
   * - userId {Number} - generally it's a OTC Sales provider's admin userId
   * - base {String} - base currency
   * - counter {String} - counter currency
   * - buysell {Number} - buy/sell flag. sell:-1, buy:1
   * - price {Number} - price of base ccy
   * - qty {Number} - quantity of base ccy to be provided
   * - remaining {Number} - remaining quantity of base ccy to be provided
   * - cancelled {Number} - 1:cancelled, 0:not_cancelled
   */
  upsertOtcOffer(con, otcOffer, cb) {
    const self = this;
    const userId = otcOffer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #upsertOtcOffer start`);
    if (!otcOffer) throw new GexError(GERR.INVALID_PARAM, "invalid parameter: `newOtcs` must be set");
    // query for upsert:
    const sql = `INSERT otc_offer (
    userId,
    base,
    counter,
    buysell,
    price,
    qty,
    remaining,
    cancelled,
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
    :cancelled,
    unix_timestamp(), 
    unix_timestamp() 
  ) ON DUPLICATE KEY UPDATE 
    userId=:userId,
    base=:base,
    counter=:counter,
    buysell=:buysell,
    price=:price,
    qty=:qty,
    remaining=:remaining,
    cancelled=:cancelled,
    updatedAt=unix_timestamp()`;
    let params = otcOffer;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #upsertOtcOffer: upserting:`, params);
    self.dao.query({ con, sql, params }, cb);
  }

};