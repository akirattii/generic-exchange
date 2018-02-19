const TESTNAME = "random-transfer-bot";

// const test = require('tape');
const assert = require("assert");
const Step = require('step');
const DbUtil = require("../lib/db-util.js");
const dbOpts = require("./dbOpts.js");
const GenericExchange = require("../lib");
const gex = new GenericExchange({
  dbOpts,
  debugLevel: 3
});

const executingCount = 30;
let executedCount = 0;
let successCount = 0;

const users = [101, 102, 103];
const buysells = [1, -1];
const feeUserId = 1;
const feeAmounts = {
  "JPY": 100,
  "USD": 1,
};


Step(function() {
  DbUtil.initDb(dbOpts, this);
}, function(err) {
  if (err) throw err;
  prepareTestData(this);
}, function(err) {
  if (err) throw err;
  console.log("\n***************************************************************");
  console.log("* Test Data Preparation:");
  console.log("*  Executed Count:", executedCount);
  console.log("*  Success Count:", successCount);
  console.log("***************************************************************");
  console.log(`* "${TESTNAME}" TEST START:`);
  console.log("***************************************************************");
  testCheckPosition(this); // check positions
}, function(err) {
  if (err) throw err;
  testCheckTransfer(this); // check transfers
}, function(err) {

  if (err) {
    console.log("\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    console.log(" TEST ERROR:");
    console.error(err);
    console.log(" NG: TEST FAILED :(");
    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    process.exit(1);
  } else {
    console.log("\n***************************************************************");
    console.log(" OK: ALL TEST PASSED :)");
    console.log("***************************************************************");
    process.exit(0);
  }
});

function prepareTestData(cb) {
  Step(function() {
    supplyTestPositions(this);
  }, function(err) {
    if (err) throw err;
    makeTestTransfers(this);
  }, function(err) {
    return cb && cb(err);
  });
}


function supplyTestPositions(cb) {
  const list = [
    // -- USD supply:
    { userId: 101, base: "USD", qty: 100 },
    { userId: 102, base: "USD", qty: 100 },
    { userId: 103, base: "USD", qty: 100 },
    // -- JPY supply:
    { userId: 101, base: "JPY", qty: 10000 },
    { userId: 102, base: "JPY", qty: 10000 },
    { userId: 103, base: "JPY", qty: 10000 },
  ];

  const ite = function*(_cb) {
    for (let len = list.length, i = 0; i < len; i++) {
      let p = list[i];
      yield gex.supplyPosition(p, (err, res) => {
        if (!err) console.log("supplied:", p);
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}


function makeTestTransfers(cb) {
  for (let len = executingCount, i = 0; i < len; i++) {
    _makeTestTransfer((err, res) => {
      if (err) {
        console.log("\n[TEST] _makeTestTransfer Error:", err);
        console.log("");
      } else {
        successCount += 1;
      }
      executedCount += 1;
      if (executedCount >= executingCount) return cb && cb(null);
    });
  }
}

function _makeTestTransfer(cb) {
  const obj = getRandomSrcDstUsers();
  const srcUserId = obj.srcUserId;
  const dstUserId = obj.dstUserId;

  Step(function() {
    getRandomQty
    getRandomPosition(srcUserId, this);
  }, function(err, res) {
    if (err) throw err;
    const pos = res;
    const base = pos.base;
    const feeAmount = feeAmounts[base];
    const qty = getRandomQty(pos, feeAmount);
    // user's transfer
    const transfer = {
      srcUserId, // sender's userID
      dstUserId, // receiver's userID
      base, // sending currency
      qty, // sending amount
      feeUserId, // user who receives fee
      feeAmount, // fee amount
    };
    console.log("Transfering:", transfer);
    gex.makeTransfer(transfer, this);
  }, function(err, res) {
    return cb && cb(err);
    // return cb && cb(null); // always treat as success
  });
}

function testCheckPosition(cb) {
  console.log("\n## Assert: 'USD' position total must be 300 && 'JPY' position total must be 30000\n");
  // 全体で USD=300 ＆ JPY=30000 であることを確認
  gex.getPositions({ limit: 10000 }, (err, res) => {
    if (err) return cb && cb(err);
    const actSum = sumPositions(res);
    assert.equal(300, actSum["USD"]);
    assert.equal(30000, actSum["JPY"]);
    return cb && cb(null);
  });

  function sumPositions(positions) {
    let ret = {
      "USD": 0,
      "JPY": 0
    };
    for (let len = positions.length, i = 0; i < len; i++) {
      let pos = positions[i];
      ret[pos.base] += pos.qty;
    }
    return ret;
  }
}

function testCheckTransfer(cb) {
  console.log("\n## Assert: successCount must be same as inserted row count of `transfer` table\n");
  gex.getTransfers({ limit: 10000 }, (err, res) => {
    if (err) return cb && cb(err);
    assert.equal(successCount, res.length);
    return cb && cb(null);
  });
}


function getRandomUser() {
  const candidates = users;
  return getRandomFromArray(candidates);
}

function getRandomSrcDstUsers() {
  const candidates = users;
  let srcUserId, dstUserId;
  while (true) {
    srcUserId = getRandomFromArray(candidates);
    dstUserId = getRandomFromArray(candidates);
    if (srcUserId != dstUserId) return { srcUserId, dstUserId };
  }
}

// function getRandomBuysell() {
//   const candidates = buysells;
//   return getRandomFromArray(candidates);
// }

function getRandomQty(pos, feeAmount) {
  const min = 1;
  const max = Math.round(pos.qty - feeAmount);
  return getRandomInt(min, max);
}

function getRandomPosition(userId, cb) {
  const p = { userId };
  gex.getPositions(p, (err, res) => {
    if (err) return cb && cb(err);
    const ret = getRandomFromArray(res);
    return cb && cb(null, ret);
  });
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromArray(arr) {
  const randIdx = getRandomInt(0, arr.length - 1);
  return arr[randIdx];
}