const apis = {};
const apiJsDirPath = "../lib/api/";
const apiMap = [
  { method: "getOrderbook", js: apiJsDirPath + "orderbook.js" },
  { method: "getOffers", js: apiJsDirPath + "offer.js" },
  { method: "makeOffer", js: apiJsDirPath + "offer.js" },
  { method: "cancelOffer", js: apiJsDirPath + "offer.js" },
  { method: "upsertOtcOffer", js: apiJsDirPath + "offer.js" },
  { method: "getContracts", js: apiJsDirPath + "contract.js" },
  { method: "getUserTransfers", js: apiJsDirPath + "transfer.js" },
  { method: "getTransfers", js: apiJsDirPath + "transfer.js" },
  { method: "makeTransfer", js: apiJsDirPath + "transfer.js" },
  { method: "getPositions", js: apiJsDirPath + "position.js" },
  { method: "supplyPosition", js: apiJsDirPath + "position.js" },
  { method: "ping", js: apiJsDirPath + "ping.js" },
];

/** returns available api methods */
module.exports.create = function() {
  for (let len = apiMap.length, i = 0; i < len; i++) {
    let api = apiMap[i];
    apis[api.method] = require(api.js)[api.method];
  }
  return apis;
};

/** returns available method list */
module.exports.getApiMap = function() {
  return apiMap;
};


