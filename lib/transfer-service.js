// a service class to mediate between frontend and dao
const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

const CLASS_NAME = "TransferService";
/** 
 * Debug Level
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
 */
const DEBUG_LEVEL = 2;

module.exports = class TransferService {
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

  getTransferById(con, { id, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`transfer\` WHERE id=:id`;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { id };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][${CLASS_NAME}] #getTransferById: params:`, params);
    this.dao.query({ con, sql, params }, (err, res) => {
      if (err) return cb && cb(err);
      if (!res || res.length <= 0) 
        return cb && cb(new GexError(GERR.NOT_FOUND, "transfer not found"));
      return cb && cb(null, res[0]);
    });
  }

  /** get transfer hist */
  getTransfers(con, { base, srcUserId, dstUserId, cursor = 0, limit = 100, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`transfer\``;
    const wheres = [];
    if (base) wheres.push("base=:base");
    if (srcUserId) wheres.push("srcUserId=:srcUserId");
    if (dstUserId) wheres.push("dstUserId=:dstUserId");
    if (wheres.length >= 1) sql += " WHERE " + wheres.join(" AND ");
    const orderbys = [];
    orderbys.push("updatedAt DESC");
    orderbys.push("id DESC");
    sql += " ORDER BY " + orderbys.join(", ");
    sql += " LIMIT " + cursor + "," + limit;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { base, srcUserId, dstUserId };
    let userId = srcUserId;
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getTransfers: params:`, params);
    this.dao.query({ con, sql, params, userId: srcUserId }, cb);
  }

  /** get user's transfer hist */
  getUserTransfers(con, { base, userId, cursor = 0, limit = 100, forUpdate = false }, cb) {
    let sql = `SELECT * FROM \`transfer\``;
    const wheres = [];
    if (base) wheres.push("base=:base");
    if (userId) wheres.push("(srcUserId=:userId OR dstUserId=:userId)");
    if (wheres.length >= 1) sql += " WHERE " + wheres.join(" AND ");
    const orderbys = [];
    orderbys.push("updatedAt DESC");
    orderbys.push("id DESC");
    sql += " ORDER BY " + orderbys.join(", ");
    sql += " LIMIT " + cursor + "," + limit;
    if (forUpdate) sql += " FOR UPDATE";
    const params = { base, userId };
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #getUserTransfers: params:`, params);
    this.dao.query({ con, sql, params, userId }, cb);
  }

  /** Insert an item of transfer history */
  insertTransfer(con, { transfer }, cb) {
    const self = this;
    const userId = transfer.srcUserId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #insertTransfer`);
    const sql = `INSERT INTO \`transfer\` (
    srcUserId,
    dstUserId,
    base,
    qty,
    feeUserId,
    feeAmount,
    memo,
    memoType,
    createdAt,
    updatedAt
  ) VALUES (
    :srcUserId,
    :dstUserId,
    :base,
    :qty,
    :feeUserId,
    :feeAmount,
    :memo,
    :memoType,
    unix_timestamp(),
    unix_timestamp()
  )`;
    if (!transfer.feeUserId) transfer.feeUserId = null;
    if (!transfer.feeAmount) transfer.feeAmount = null;
    if (!transfer.memo) transfer.memo = null;
    if (!transfer.memoType) transfer.memoType = null;
    const params = transfer;
    if (this.debugLevel >= DEBUG_LEVEL) this.logger.info(`[GEX][user:${ userId ? userId : "" }][${CLASS_NAME}] #insertTransfer: params:`, params);
    this.dao.query({ con, sql, params, userId: transfer.srcUserId }, cb);
  }


};