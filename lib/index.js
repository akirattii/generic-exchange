const mysql = require('mysql');
const Step = require("step");
const BigNumber = require("bignumber.js");
const fs = require("fs");
// const sleep = require('sleep-async')();
const DbUtil = require("../lib/db-util.js");
const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

/** 
 * Debug Level of this Class
 * 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc),
 */
const DEBUG_LEVEL = 1;

const Dao = require("../lib/dao.js");
const PingService = require("../lib/ping-service.js");
const ContractService = require("../lib/contract-service.js");
const OfferService = require("../lib/offer-service.js");
const PositionService = require("../lib/position-service.js");
const TransferService = require("../lib/transfer-service.js");
const OtcOfferService = require("../lib/otc-offer-service.js");

/* process retry settings */
const PROCESS_WAIT_TIME = 5; // waiting time of ms until next retry when it is busy.
const PROCESS_TIMEOUT = 30000; // transaction timeout of ms
const PROCESS_MAX_RETRY = PROCESS_TIMEOUT / PROCESS_WAIT_TIME; // max retry count

module.exports = class GenericExchange {
  constructor({
    dbOpts, // an option of node-mysql module @see: https://github.com/mysqljs/mysql
    debugLevel = 0, // Debug Level 0:nothing, 1:Layer1 (Direct public IF), 2:Layer2 (Service), 3:Layer3 (DAO etc)
    logger = console,
  }, cb) {
    const self = this;
    this.debugLevel = debugLevel;
    this.logger = logger;
    this.dbOpts = dbOpts;
    if (this.debugLevel >= 1) {
      this.logger.info(`[GEX] #constructor: logger:${logger}, debugLevel:${debugLevel}`);
    }
    // create dao instance
    const dao = new Dao({ dbOpts, debugLevel, logger });
    this.dao = dao;

    /* 現在トランザクション処理中かどうかを判断するフラグ */
    this.isTxBusy = false;

    // create service instances
    this.initSerivceInstances({ dao, debugLevel, logger });

    /**
     * Prepare DB Connections for Transaction process
     */
    // eg: {"offer":<connection>, "transfer":<connection>}
    self.createTxConnections((err, _cons) => {
      if (err) throw new GexError(GERR.DB_ERR, "createTxConnections failed");
      self.txConnections = _cons;
      return cb && cb(null);
    });
  }

  /**
   * Initialize service instances such as offerService and positionService
   */
  initSerivceInstances({ dao, debugLevel, logger }) {
    this.pingService = new PingService({ dao, debugLevel, logger });
    this.contractService = new ContractService({ dao, debugLevel, logger });
    this.offerService = new OfferService({ dao, debugLevel, logger });
    this.positionService = new PositionService({ dao, debugLevel, logger });
    this.transferService = new TransferService({ dao, debugLevel, logger });
    this.otcOfferService = new OtcOfferService({ dao, debugLevel, logger });
  }

  //*************************************************************************
  // DB Connections
  //*************************************************************************

  /** 
   * Create db connections reserved for transaction use such as makeOffer and transter etc.
   * It returns object which has below keys:
   * - `generic`: used for generic transaction
   */
  createTxConnections(cb) {
    const self = this;
    // names of transaction
    const conNames = ["generic"];
    const cons = {};
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #createTxConnections`);
    const ite = function*(_cb) {
      for (let len = conNames.length, i = 0; i < len; i++) {
        // ** create a db connection for each transaction:
        const conName = conNames[i];
        yield self.dao.getConnection((err, con) => {
          if (err) return _cb && _cb(err);
          cons[conName] = con;
          if (self.debugLevel >= DEBUG_LEVEL)
            self.logger.info(`[GEX] #createTxConnections: a connection for "${conName}" created`);
          ite.next();
        });
      }
      return _cb && _cb(null, cons);
    }(cb);
    ite.next();
  }
  /** Get a tx connection reserved for specified process */
  getTxConnection(conName, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #getTxConnection: Get a connection named: "${conName}"`);
    const con = self.txConnections[conName];
    // Check whether the connection is alive
    const flag = self.dao.getPool()._freeConnections.indexOf(con); // -1 is alive, but 0 is dead.
    if (flag === 0) {
      // flag=`0` means that the connection is dead, so re-connect!
      self.dao.getConnection((err, newcon) => {
        if (err) return _cb && _cb(err);
        self.txConnections[conName] = newcon;
        if (self.debugLevel >= DEBUG_LEVEL)
          self.logger.info(`[GEX] #createTxConnections: a connection for "${conName}" re-created`);
        return cb && cb(null, newcon);
      });
    } else {
      // flag=`-1` means that the connection is alive, so returns current connection.
      return cb && cb(null, con);
    }
  }

  //*************************************************************************
  // Server status
  //*************************************************************************

  ping({}, cb) {
    const self = this;
    const serviceName = "pingService";
    const serviceMethod = "ping";
    const serviceParam = {};
    self._callService({ serviceName, serviceMethod, serviceParam }, cb);
  }

  //*************************************************************************
  // Orderbook
  //*************************************************************************

  /**
   * Get an orderbook of specific currency pair
   * @param {Object} - params:
   *  - userId {Number} - [optional]
   *  - base {String} - base currency. eg."USD"
   *  - counter {String} - counter currency. eg."JPY"
   *  - otc {Number} - [optional] OTC offer flag. 0:NON_OTC(default), 1:OTC
   *  - limit {Number} - [optional] max count of one-side offers (buy/sell) of the orderbook
   *  - merge {Boolean} - [optional] a flag to merge same price items. defaults to false (not merge).
   *     if set true, it returns specialized data for orderbook readonly / 1に設定することで板表示専用のレスポンスを返します
   */
  getOrderbook({ userId, base, counter, otc = false, limit = 10, merge = false }, cb) {
    const self = this;
    const serviceName = "offerService";
    const serviceMethod = "getOrderbook";
    const serviceParam = { userId, base, counter, otc, limit, merge };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  //*************************************************************************
  // Contract
  //*************************************************************************

  /** get a contract by ID */
  getContractById(id, cb) {
    const self = this;
    const serviceName = "contractService";
    const serviceMethod = "getContractById";
    const serviceParam = { id };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /** get user's positions */
  getContracts({ userId, base, counter, otc = 0, cursor = 0, limit = 100 }, cb) {
    const self = this;
    const serviceName = "contractService";
    const serviceMethod = "getContracts";
    const serviceParam = { userId, base, counter, otc, cursor, limit };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }



  //*************************************************************************
  // Position
  //*************************************************************************

  /**
   * supply some asset to an user
   * @param {Transfer} - user's transfer request:
   *   - userId {Number} - source userID
   *   - base {String} - a base ccy symbol
   *   - qty {Number} - an amount of base currency to buy/sell
   * @param {Function} - callback
   */
  supplyPosition(param, cb) {
    const self = this;
    const methodName = "supplyPosition";
    const processName = "_" + methodName;
    const userId = param.userId;
    let retryCount = 0;

    const p = {
      methodName,
      processName,
      param,
      userId,
      retryCount,
      callback: cb,
    };
    self._tryProcess(p);
  }

  _supplyPosition({ userId, base, qty }, cb) {
    const self = this;

    // FIXME: Make Error Occured on purpose
    const hoge="";const hoge="";

    const methodName = "_supplyPosition";
    // NOTE: トランザクション専用の connection を使う
    const conName = "generic"; // db connection name
    let con; // db connection
    let affected; // affected object as return of this method / この処理で影響を受けたアイテムの情報（このメソッドの戻り値）

    Step(function() {
      //  Use the specified connection reserved for tx:
      self.getTxConnection(conName, this);
    }, function(err, _con) {
      if (err) throw err;
      con = _con;
      if (!con) throw new GexError(GERR.DB_ERR, `connection reserved for '${conName}' not found`);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB got a connection for transfer tx`);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: DB beginTransaction`);
      con.beginTransaction(this); // Start db transaction
    }, function(err) {
      if (err) throw err;
      const p = { userId, base, qty };
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: param:`, p);
      self.positionService.supplyPosition(con, p, this);
    }, function(err, res) {
      // ** End DB Transaction (commit or rollback) 
      self._commitOrRollback(con, { userId, err, res, release: false }, this);
    }, function(err, res) {
      // Get affected object. / この処理で影響を受けるユーザ情報などを取得 
      if (!err) {
        affected = _getAffected({ userId });
      }
      return cb && cb(err, affected);
    });

    /**
     * returns affected data looks like this: { position:[102,103] }
     */
    function _getAffected({ userId }) {
      const ret = {
        position: [userId], // affected userId's array about transfer
      };
      return ret;
    }
  }

  /** get a position by ID */
  getPositionById(id, cb) {
    const self = this;
    const serviceName = "positionService";
    const serviceMethod = "getPositionById";
    const serviceParam = { id };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /** get user's positions by base */
  getPositionByUserBase({ userId, base }, cb) {
    const self = this;
    const serviceName = "positionService";
    const serviceMethod = "getPositionByUserBase";
    const serviceParam = { userId, base };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /** get positions */
  getPositions({ userId, base, cursor = 0, limit = 100 }, cb) {
    const self = this;
    const serviceName = "positionService";
    const serviceMethod = "getPositions";
    const serviceParam = { userId, base, cursor, limit };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  //*************************************************************************
  // Offer
  //*************************************************************************


  /** get an offer by ID */
  getOfferById({ id, otc = 0, forUpdate = false }, cb) {
    const self = this;
    const serviceName = "offerService";
    const serviceMethod = "getOfferById";
    const serviceParam = { id, otc, forUpdate };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  getOffers({
    userId,
    base,
    counter,
    cursor = 0,
    limit = 50,
  }, cb) {
    const self = this;
    const serviceName = "offerService";
    const serviceMethod = "getOffers";
    const serviceParam = { userId, base, counter, cursor, limit };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /**
   * Process an new offer from user
   * @param {Offer} - user's offer to create new:
   *   - userId {Number} - userID
   *   - base {String} - a base ccy symbol
   *   - counter {String} - a counter ccy symbol
   *   - buysell {Number} - buy/sell yype. -1:sell 1:buy
   *   - price {Number} - a price per 1 base currency to buy/sell
   *   - qty {Number} - an amount of base currency to buy/sell
   *   - otc {Number} - 1:OTC_offer, 0:normal_offer
   *   - feeUserId {Number} - // [optional] an user who receive fee
   *   - feeCurrency {String} - [optional] fee currency. if empty, uses `base`.
   *   - feeAmount {Number} - [optional] fee amount 
   * @param {Function} - callback
   */
  makeOffer(param, cb) {
    const self = this;
    const methodName = "makeOffer";
    const processName = "_" + methodName;
    const userId = param.userId;
    let retryCount = 0;

    const p = {
      methodName,
      processName,
      param,
      userId,
      retryCount,
      callback: cb,
    };
    self._tryProcess(p);
  }

  /** process an making offer */
  _makeOffer(offer, cb) {
    const self = this;
    const methodName = "_makeOffer";
    const userId = offer.userId;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: start. offer:`, offer);

    // この処理で影響を受けたユーザと注文板などの情報
    let affected; // eg: { base: "USD", counter: "JPY", users: [101, 102], type:"offer" }

    // NOTE: トランザクション専用の connection を使う
    const conName = "generic"; // db connection name
    let con; // db connection
    let matchedOffers; // マッチする相対注文
    let newContracts; // 新規発生の約定情報
    let relatedOffersChange; // マッチした後の関連注文の変化
    let relatedPositionsChange; // マッチした後の関連ポジの変化
    let shouldFeeChage = true; // 手数料を取るかどうか
    const forUpdate = true; // whether "SELECT FOR UPDATE" or not

    Step(function() {
      //  Use the specified connection reserved for offer tx:
      self.getTxConnection(conName, this);
    }, function(err, _con) {
      if (err) throw err;
      con = _con;
      if (!con) throw new GexError(GERR.DB_ERR, "connection reserved for 'offer' not found")
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB got a connection for makeOffer`);
      con.beginTransaction(this); // Start db transaction
    }, function(err) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB began transaction`);

      //
      // ** Check whether the user has sufficient funds for making offer
      //
      self.checkSufficientFundsForOffer(con, { offer, forUpdate }, this);
    }, function(err) {
      if (err) throw err;
      //
      // ** Get matching offers candidates:
      //
      self.offerService.getMatchingOffers(con, { offer, forUpdate }, this);
    }, function(err, rows) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: Candidates of matched offers:`, err, rows);

      // ** pick up matched offers only:
      matchedOffers = self.offerService.pickupMatchedOffers(offer, rows);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: Matched offers:`, matchedOffers);

      // ** Get new contracts of related offers:
      /* example:
       [ { userId: 101,
          counterUserId: 103,
          base: 'USD',
          counter: 'JPY',
          buysell: 1,
          price: 109,
          qty: 50 },
        { userId: 103,
          counterUserId: 101,
          base: 'USD',
          counter: 'JPY',
          buysell: -1,
          price: 109,
          qty: 50 }]
      */
      newContracts = self.contractService.getNewContracts(offer, matchedOffers);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: New contracts:`, newContracts);
      // ** Get the changing of related offers:
      /* example:
      { offersChanged: 
       [ { offerId: 3,
           base: 'USD',
           counter: 'JPY',
           userId: 103,
           remainingBefore: 3000,
           remainingAfter: 0,
           qtyChange: -3000,
           positionId: 1,
           buysell: -1,
           price: 109 }],
      offerCreated: 
       { userId: 101,
         base: 'USD',
         counter: 'JPY',
         buysell: 1,
         price: 110,
         qty: 3000,
         remaining: 3000 } }
      */
      relatedOffersChange = self.offerService.getRelatedOffersChange(offer, matchedOffers);
      if (offer.otc === 1 && relatedOffersChange) {
        relatedOffersChange.offerCreated = null; // 店頭の時は新規残注文は保存しない
      }
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: Related offers to be changed:`, relatedOffersChange);
      // ** Get the changing of related positions:
      /* example:[
      { base: 'USD', userId: '103', qtyChange: -50 },
      { base: 'JPY', userId: '103', qtyChange: 5450 },
      { base: 'USD', userId: '101', qtyChange: 60 },
      { base: 'JPY', userId: '101', qtyChange: -6550 },
      { base: 'USD', userId: '104', qtyChange: -10 },
      { base: 'JPY', userId: '104', qtyChange: 1100 } ]
      */
      relatedPositionsChange = self.positionService.getRelatedPositionsChange(offer, relatedOffersChange);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: Related positions to be changed:`, relatedPositionsChange);

      //
      // ** DB更新: insert new contracts: newContracsを元にcontractテーブル更新 
      //
      self.contractService.insertNewContracts(con, newContracts, this);
    }, function(err, res) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB New contracts inserted`);
      //
      // ** DB更新: update offers: relatedOffersChangeを元にofferテーブル更新
      //
      self.offerService.updateRelatedOffers(con, relatedOffersChange, this);
    }, function(err, res) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB Related offers updated`);
      //
      // ** DB更新: update positions: relatedOffersChangeを元にpositionテーブルも更新
      //
      self.positionService.updateRelatedPositions(con, relatedPositionsChange, this);
    }, function(err, res) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB Related positions updated`);
      //
      // ** DB更新: 手数料徴収 (Fee charging) FIXME:
      //
      if (relatedOffersChange.offersChanged.length <= 0 && relatedOffersChange.offerCreated === null) {
        shouldFeeChage = false; // エラーなどで発注がなければ手数料は課さず
        return null;
      }
      const transfer = {
        srcUserId: offer.userId,
        feeUserId: offer.feeUserId,
        feeCurrency: offer.feeCurrency,
        feeAmount: offer.feeAmount,
      };
      self.positionService.chargeFee(con, { transfer }, this);
    }, function(err, res) {
      if (!err && shouldFeeChage) {
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: fee charged`);
      }
      // ** End DB Transaction (commit or rollback) 
      self._commitOrRollback(con, { userId, err, res, release: false }, this);
    }, function(err, res) {
      // Get affected users and offers' cpair from relatedOffersChange and newContracts. / relatedOffersChange と newContracts から影響を受けるユーザと注文板を取得 
      if (!err) {
        affected = _getAffected({ offer, relatedOffersChange, newContracts });
      }
      return cb && cb(err, affected);
    });

    /**
     * returns affected data looks like this:
     * { orderbook:{base,counter}, offer:[<userId>], otc_offer:[<userId>], contract:[<userId>], position:[<userId>] }
     */
    function _getAffected({ offer, relatedOffersChange, newContracts }) {
      const base = offer.base;
      const counter = offer.counter;
      const otc = offer.otc;

      // the affected object:
      const ret = {
        // orderbook: null, // affected orderbook object
        // offer: null, // affected userId's array about offer
        // otc_offer: null, // affected userId's array about otc_offer
        // contract: null, // affected userId's array about contract
        // position: null, // affected userId's array about position
      };

      // 注文板への影響
      ret.orderbook = { base, counter };

      // 既存注文への影響
      for (let len = relatedOffersChange.offersChanged.length, i = 0; i < len; i++) {
        let item = relatedOffersChange.offersChanged[i];
        let userId = item.userId;
        if (otc === 1) {
          // ** OTC offer
          _push2arr("otc_offer", userId, ret);
        } else {
          // ** NORMAL offer
          _push2arr("offer", userId, ret);
        }
      }
      // 新規注文としての板乗りの影響
      if (relatedOffersChange.offerCreated) {
        let userId = relatedOffersChange.offerCreated.userId;
        _push2arr("offer", userId, ret);
      }
      // 約定と残高への影響
      for (let len = newContracts.length, i = 0; i < len; i++) {
        let item = newContracts[i];
        let userId = item.userId;
        _push2arr("contract", userId, ret);
        _push2arr("position", userId, ret);
      }
      return ret;

      function _push2arr(prop, v, target) {
        if (!target[prop]) target[prop] = [];
        if (v && target[prop].indexOf(v) < 0) target[prop].push(v);
        return;
      }
    }
  }

  /**
   * Check whether an user has sufficient funds for making offer
   */
  checkSufficientFundsForOffer(con, { offer, forUpdate = false }, cb) {
    const self = this;
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info("[GEX] #checkSufficientFundsForOffer");
    const userId = offer.userId;
    const base = offer.base;
    const counter = offer.counter;
    const buysell = offer.buysell;
    const price = offer.price;
    // 注文base通貨数量
    const qty = offer.qty;
    // 注文counter通貨数量
    const counterQty = new BigNumber(qty).times(price).toNumber();
    // 手数料関係
    const feeUserId = offer.feeUserId;
    const feeAmount = offer.feeAmount;
    const feeCurrency = offer.feeCurrency;

    // base通貨保有数
    let baseQtyHold;
    // counter通貨保有数
    let counterQtyHold;
    // fee通貨保有数
    let feeQtyHold;
    // ユーザのポジション
    let positions;
    // ユーザの既存注文
    let offers;

    Step(function() {
      // ** 発注者のポジションを取得
      self.positionService.getPositions(con, { userId, forUpdate }, this);
    }, function(err, rows) {
      if (err) throw err;
      positions = (rows) ? rows : [];
      // ** Get baseQtyHold, counterQtyHold and feeQtyHold:
      baseQtyHold = _getQty(base, positions);
      counterQtyHold = _getQty(counter, positions);
      if (feeCurrency) {
        feeQtyHold = _getQty(feeCurrency, positions);
      }
      // ** 発注者の既存注文を取得
      self.offerService.getOrderbook(con, { userId, base, counter, forUpdate, limit: 99999 }, this);
    }, function(err, rows) {
      if (err) throw err;
      offers = (rows) ? rows : [];
      let amtSum, qtySum;
      if (buysell === 1) {
        //
        // ** 買注文のときは十分なカウンター通貨を保有しているかチェック
        //
        /*
          例：[買い注文]のチェック
          OK → 現注文(買い注文数 * 価格) + 既存注文(買い注文数 * 価格) <= カウンター通貨保有数
        */
        // 注文中のcounter通貨金額トータル
        let amtSumOb = _calcAmountSum(counter, offers);
        amtSum = amtSumOb + counterQty; // 既存注文 + 現注文
        if (amtSum > counterQtyHold) {
          let errmsg = "insufficient funds for buying: " +
            `user:${userId} must hold at least ${amtSum} ${counter} but only ${counterQtyHold} ${counter}`;
          throw new GexError(GERR.INSUFFICIENT_FUNDS, errmsg);
        }
      } else if (buysell === -1) {
        //
        // ** 売注文のときは十分なベース通貨を保有しているかチェック
        //
        /*
          例：[売り注文]のチェック
          保有 100 USD
          OK → 現注文(売り注文数) + 既存注文(売り注文数) <= ベース通貨保有数
        */
        // 注文中のベース通貨数量
        let qtySumOb = _calcQtySum(base, offers);
        qtySum = qtySumOb + qty;
        if (qtySum > baseQtyHold) {
          let errmsg = "insufficient funds for selling: " +
            `user:${userId} must hold at least ${qtySum} ${base} but only ${baseQtyHold} ${base}`;
          throw new GexError(GERR.INSUFFICIENT_FUNDS, errmsg);
        }
      } else {
        throw new GexError(GERR.INVALID_PARAM, `invalid parameter: 'buysell'=${buysell}`);
      }
      //
      // ** 十分な手数料用通貨を保有しているかチェック
      //
      return _checkSufficientFundsForFee({ offer, amtSum, feeQtyHold });
    }, function(err) {
      return cb && cb(err);
    });

    /** 手数料支払に十分なポジションを保有しているかどうかチェック */
    function _checkSufficientFundsForFee({
      offer,
      amtSum,
      feeQtyHold,
    }, cb) {
      // 手数料を含めた必要支払額トータル
      let requiredTotal;
      if (offer.buysell === 1) {
        // buy の場合、必要総額は:
        //  - カウンター通貨と手数料通貨が同じなら: 購入金額 + fee金額
        //  - カウンター通貨と手数料通貨が異なるなら: fee金額のみ
        requiredTotal = (offer.feeCurrency === offer.counter) ? amtSum + offer.feeAmount : offer.feeAmount;
      } else if (offer.buysell === -1) {
        // sell の場合、必要総額は: fee金額のみ
        requiredTotal = offer.feeAmount;
      } else throw new GexError(GERR.INVALID_PARAM, "Invalid buysell type");

      if (requiredTotal > feeQtyHold) {
        let errmsg = "insufficient funds: " +
          `at least ${requiredTotal} ${feeCurrency} balance including fees required`;
        throw new GexError(GERR.INSUFFICIENT_FUNDS, errmsg);
      }

      return null; // required
    }

    function _getQty(currency, positions) {
      const m = positions.find(x => x.base == currency);
      return (m) ? m.qty : 0;
    }

    /** 買注文用: 既存注文一覧からcounterで指定された買注文のamout (remaining * price) を合計 */
    function _calcAmountSum(counter, offers) {
      if (!offers) throw new GexError(GERR.INVALID_PARAM, "calcAmountSum: invalid offers");
      let buyOffers = offers.buy;
      let ret = new BigNumber(0);
      for (let len = buyOffers.length, i = 0; i < len; i++) {
        let o = buyOffers[i];
        if (o.counter != counter) continue;
        let amt = new BigNumber(o.price).times(o.remaining);
        ret = amt.add(ret);
      }
      return ret.toNumber();
    }
    /** 売注文用: 既存注文一覧からbaseで指定された注文のremainingを合計 */
    function _calcQtySum(base, offers) {
      if (!offers) throw new GexError(GERR.INVALID_PARAM, "calcQtySum: invalid offers");
      let sellOffers = offers.sell;
      let ret = new BigNumber(0);
      for (let len = sellOffers.length, i = 0; i < len; i++) {
        let o = sellOffers[i];
        if (o.base != base) continue;
        ret = new BigNumber(o.remaining).add(ret);
      }
      return ret.toNumber();
    }
  }

  /**
   * Process cancel an offer
   * @param {Transfer} - user's transfer request:
   *   - id {Number} - an offer's ID
   *   - userId {Number} - userId of an user who owns it offer
   * @param {Function} - callback
   */
  cancelOffer(param, cb) {
    const self = this;
    const methodName = "cancelOffer";
    const processName = "_" + methodName;
    const userId = param.userId;
    let retryCount = 0;

    const p = {
      methodName,
      processName,
      param,
      userId,
      retryCount,
      callback: cb,
    };
    self._tryProcess(p);
  }

  /**
   * Cancel an offer
   * @param {Object} - params:
   *  - id {Number} - an offer ID
   *  - userId {Number} - userId of an user by whom its offer was made. 
   */
  _cancelOffer({ id, userId }, cb) {
    const self = this;
    const methodName = "_cancelOffer";
    if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: start. offerId:`, id);

    // NOTE: トランザクション専用の connection を使う
    const conName = "generic"; // db connection name
    let con, offer;

    // この処理で影響を受けたユーザと注文板などの情報
    let affected; // eg: { base: "USD", counter: "JPY", users: [101, 102], type:"offer" }

    Step(function() {
      //  Use the specified connection reserved for offer tx:
      self.getTxConnection(conName, this);
    }, function(err, _con) {
      if (err) throw err;
      con = _con;
      if (!con) throw new GexError(GERR.DB_ERR, "connection reserved for 'offer' not found")
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB got a connection for makeOffer`);
      con.beginTransaction(this); // Start db transaction
    }, function(err) {
      if (err) throw err;
      //
      // ** Get an offer by id
      //
      self.offerService.getOfferById(con, { id }, this);
    }, function(err, row) {
      if (err) throw err;
      if (!row) throw new GexError(GERR.NOT_FOUND, `no such offer:${id}`);
      offer = row;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: got an offer:`, offer);
      //
      // ** Check if the offer is the user's possession 
      //
      if (offer.userId !== userId) throw new GexError(GERR.PERMISSION_ERR, `user:${userId} has no permission to control offer:${id}`);
      //
      // ** Check if the offer has not been `cancelled` yet
      //
      if (offer.cancelled === 1) throw new GexError(GERR.INVALID_OFFER, `offer:${id} has already been cancelled`);
      //
      // ** Check if the offer has some `remaining`
      //
      if (offer.remaining <= 0) throw new GexError(GERR.INVALID_OFFER, `offer:${id} has no remaining`);
      //
      // ** DB更新: cancel the offer
      //
      self.offerService.cancelOffer(con, { id }, this);
    }, function(err, res) {
      // ** End DB Transaction (commit or rollback) 
      self._commitOrRollback(con, { userId, err, res, release: false }, this);
    }, function(err, res) {
      // Get affected users and offers' cpair from relatedOffersChange and newContracts. / relatedOffersChange と newContracts から影響を受けるユーザと注文板を取得 
      if (!err) {
        affected = _getAffected({ offer });
      }
      return cb && cb(err, affected);
    });

    /**
     * returns affected data looks like this:
     * { orderbook:{base,counter}, offer:[<userId>], otc_offer:[<userId>] }
     */
    function _getAffected({ offer }) {
      const base = offer.base;
      const counter = offer.counter;
      const otc = offer.otc;
      const userId = offer.userId;
      // the affected object:
      const ret = {
        // orderbook: null, // affected orderbook object
        // offer: null, // affected userId's array about offer
        // otc_offer: null, // affected userId's array about otc_offer
      };

      // 注文板への影響
      ret.orderbook = { base, counter };

      // 既存注文への影響
      if (otc === 1) {
        // ** OTC offer
        _push2arr("otc_offer", userId, ret);
      } else {
        // ** NORMAL offer
        _push2arr("offer", userId, ret);
      }
      return ret;

      function _push2arr(prop, v, target) {
        if (!target[prop]) target[prop] = [];
        if (v && target[prop].indexOf(v) < 0) target[prop].push(v);
        return;
      }
    }
  }

  //*************************************************************************
  // Transfer
  //*************************************************************************

  /**
   * Process a transfer request from user
   * @param {Transfer} - user's transfer request:
   *   - srcUserId {Number} - source userID
   *   - dstUserId {Number} - destination userID
   *   - base {String} - a base ccy symbol
   *   - qty {Number} - an amount of base currency to buy/sell
   *   - feeUserId {Number} - [optional] an user who receive fee
   *   - feeAmount {Number} - [optional] fee amount (fee used currency is same as `base`) 
   *   - memo {String} - [optional] memo
   *   - memoType {String} - [optional] memo type such as MIME Type
   * @param {Function} - callback
   */
  makeTransfer(param, cb) {
    const self = this;
    const methodName = "makeTransfer";
    const processName = "_" + methodName;
    const userId = param.srcUserId; // param.userId;
    let retryCount = 0;

    const p = {
      methodName,
      processName,
      param,
      userId,
      retryCount,
      callback: cb,
    };
    self._tryProcess(p);
  }

  /** transfer specified funds from srcUserId to dstUserId */
  _makeTransfer(transfer, cb) {
    const self = this;
    const methodName = "_makeTransfer";
    const srcUserId = transfer.srcUserId;
    const dstUserId = transfer.dstUserId;
    const base = transfer.base;
    const qty = transfer.qty;
    const feeUserId = transfer.feeUserId;
    const feeAmount = (transfer.feeAmount) ? transfer.feeAmount : 0;

    // この処理で影響を受けたユーザなどの情報
    let affected; // eg: { base: "USD", users: [101, 102], type:"transfer" }

    if (!base)
      throw new GexError(GERR.INVALID_PARAM, `invalid parameter: 'base'=${base}: must be a string format`);
    if (!qty || qty < 0)
      throw new GexError(GERR.INVALID_PARAM, `invalid parameter: 'qty'=${qty}: must be a positive number format`);
    if (srcUserId == dstUserId)
      throw new GexError(GERR.INVALID_PARAM, `invalid parameter: 'srcUserId'=${srcUserId} must differ from 'dstUserId'=${dstUserId}`);

    // NOTE: トランザクション専用の connection を使う
    const conName = "generic"; // db connection name
    let con; // db connection

    Step(function() {
      //  Use the specified connection reserved for only transfer tx
      self.getTxConnection(conName, this);
    }, function(err, _con) {
      if (err) throw err;
      con = _con;
      if (!con) throw new GexError(GERR.DB_ERR, "connection reserved for '${conName}' not found")
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: DB got a connection for '${conName}'`);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: DB beginTransaction`);
      con.beginTransaction(this); // Start db transaction
    }, function(err) {
      if (err) throw err;
      const p = { base, userId: srcUserId };
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: check if srcUserId has enough fund:`, p);
      self.positionService.getPositions(con, p, this);
    }, function(err, res) {
      if (err) throw err;
      if (!res || res.length <= 0)
        throw new GexError(GERR.NOT_FOUND, `no such position: base:${base}, userId:${srcUserId}`);
      const srcPos = res[0];
      const srcHavingQty = srcPos.qty;
      let qtyPlusFee = new BigNumber(qty).add(feeAmount).toNumber();
      if (srcHavingQty < qtyPlusFee)
        throw new GexError(GERR.INSUFFICIENT_FUNDS, `insufficient funds: userId:${srcUserId} sending ${qty} ${base} (+fee ${feeAmount} ${base}), but ${qtyPlusFee - srcHavingQty} ${base} short.`);
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: positionService.makeTransfer: param:`, transfer);
      self.positionService.makeTransfer(con, { transfer }, this);
    }, function(err, res) {
      if (err) throw err;
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX] #${methodName}: transferService.insertTransfer: param:`, transfer);
      self.transferService.insertTransfer(con, { transfer }, this);
    }, function(err, res) {
      // ** End DB Transaction (commit or rollback) 
      self._commitOrRollback(con, { userId: srcUserId, err, res, release: false }, this);
    }, function(err, res) {
      // Get affected users and etc. / この処理で影響を受けたユーザの情報を取得
      if (!err) {
        affected = _getAffected({ transfer });
      }
      return cb && cb(err, affected);
    });

    /**
     * returns affected data looks like this: { base:"USD", transfer:[102,103] }
     */
    function _getAffected({ transfer }) {
      const ret = {
        base: transfer.base, // affected currency
        transfer: [ // affected userId's array about transfer
          transfer.srcUserId,
          transfer.dstUserId,
        ],
        position: [ // affected userId's array about position
          transfer.srcUserId,
          transfer.dstUserId,
        ],
      };
      return ret;
    }
  }

  /** get a transfer by ID */
  getTransferById(id, cb) {
    const self = this;
    const serviceName = "transferService";
    const serviceMethod = "getTransferById";
    const serviceParam = { id, forUpdate: false };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /** get user's transfers */
  getTransfers({ srcUserId, dstUserId, base, cursor = 0, limit = 100, forUpdate = false }, cb) {
    const self = this;
    const serviceName = "transferService";
    const serviceMethod = "getTransfers";
    const serviceParam = { srcUserId, dstUserId, base, cursor, limit, forUpdate };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  /** get user's transfers */
  getUserTransfers({ userId, base, cursor = 0, limit = 100, forUpdate = false }, cb) {
    const self = this;
    const serviceName = "transferService";
    const serviceMethod = "getUserTransfers";
    const serviceParam = { userId, base, cursor, limit, forUpdate };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  //*************************************************************************
  // OTC Sales
  //*************************************************************************

  /** Upsert an OTC Sales model */
  upsertOtcOffer({
    userId,
    base,
    counter,
    buysell,
    price,
    qty,
    remaining,
    cancelled,
  }, cb) {
    const self = this;
    const serviceName = "otcOfferService";
    const serviceMethod = "upsertOtcOffer";
    const serviceParam = { userId, base, counter, buysell, price, qty, remaining, cancelled };
    self._callService({ serviceName, serviceMethod, serviceParam, }, cb);
  }

  // //*************************************************************************
  // // Fee
  // //*************************************************************************

  // /** Take a fee from a source user */
  // chargeFee({ srcUserId, feeUserId, feeCurrency, feeAmount }, cb) {
  //   const self = this;
  //   const p = {
  //     srcUserId,
  //     base: feeCurrency,
  //     dstUserId: feeUserId,
  //     qty: feeAmount,
  //   };
  //   self.transfer()
  // }

  //*************************************************************************
  // Generic methods for internal use
  //*************************************************************************

  _callService({
    serviceName,
    serviceMethod,
    serviceParam,
  }, cb) {
    const self = this;
    let userId; // userId for log display
    if (serviceParam.userId)
      userId = serviceParam.userId;
    else if (serviceParam.srcUserId)
      userId = serviceParam.srcUserId;
    else
      userId = "";

    let con;
    Step(function() {
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] ${serviceName}#${serviceMethod}: DB getConnection`);
      self.dao.getConnection(this); // Get db connection
    }, function(err, _con) {
      if (err) throw err;
      con = _con;
      if (!con) throw new GexError(GERR.DB_ERR, "DB connection not found");
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] ${serviceName}#${serviceMethod}: param:`, serviceParam);
      self[serviceName][serviceMethod](con, serviceParam, this);
    }, function(err, res) {
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] ${serviceName}#${serviceMethod}: DB release`);
      if (con) con.release();
      return cb && cb(err, res);
    });
  }

  /** 
   * run a process which needs to execute in tx.
   * If processing is busy, will repeat to retry until it is completed or max retry count arrived 
   */
  _tryProcess({
    methodName,
    processName,
    param,
    userId,
    retryCount,
    callback,
  }) {
    const self = this;
    let startTime, endTime; // for calculate processed time on debug
    _run();

    function _run() {
      if (self.isTxBusy) {
        if (self.debugLevel >= DEBUG_LEVEL)
          self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: now busy, retrying after ${PROCESS_WAIT_TIME} ms... retryCount=${retryCount}`);
        retryCount += 1;
        if (retryCount > PROCESS_MAX_RETRY)
          return _timeoutCallback && _timeoutCallback(new GexError(GERR.TIMEOUT, `TIMEOUT: user:${userId} '${methodName}' timed out!`));
        setTimeout(() => {
          _run();
        }, PROCESS_WAIT_TIME); // try again a few second later...
      } else {
        self.isTxBusy = true; // lock tx
        if (self.debugLevel >= DEBUG_LEVEL) {
          startTime = Date.now();
          self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: set isTxBusy: true`);
          self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: START >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
          self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: processing param:`, param);
        }
        self[processName](param, _callback);
      }
    }

    function _callback(err, res) {
      if (self.debugLevel >= DEBUG_LEVEL) {
        endTime = Date.now();
        if (err) self.logger.error(`[GEX][user:${ userId ? userId : "" }] #${methodName}: callback: error:`, err);
        self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: callback: affected:`, res);
        self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: END <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< (${endTime - startTime} ms)`);
      }
      self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: set isTxBusy: false`);
      self.isTxBusy = false; // release tx
      return callback && callback(err, res);
    }

    function _timeoutCallback(err) {
      if (self.debugLevel >= DEBUG_LEVEL) {
        if (err) self.logger.error(`[GEX][user:${ userId ? userId : "" }] #${methodName}: callback: error:`, err);
      }
      /** DO NOT release the busy flag on timeout! */
      // self.isTxBusy = false; // release tx
      return callback && callback(err);
    }
  }

  _commitOrRollback(con, { userId, err, res, release = true }, cb) {
    const self = this;
    const methodName = "_commitOrRollback";
    if (!con) return cb && cb(new GexError(GERR.DB_ERR, "DB connection `con` must be set"));
    if (err) {
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB ROLLBACKING!!! error:`, err.message);
      con.rollback(_finish(con, { err, res, release }, cb));
    } else {
      if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB committing`);
      con.commit(_finish(con, { err, res, release }, cb));
    }

    function _finish(con, { err, res, release }, cb) {
      if (release) {
        if (self.debugLevel >= DEBUG_LEVEL) self.logger.info(`[GEX][user:${ userId ? userId : "" }] #${methodName}: DB releasing`);
        con.release();
      }
      return cb && cb(err, res);
    }
  }


};