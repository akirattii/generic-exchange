const TESTNAME = "random-offer-bot";

// const test = require('tape');
const assert = require("assert");
const Step = require('step');
const DbUtil = require("../lib/db-util.js");
const dbOpts = require("./dbOpts.js");
const GenericExchange = require("../lib");
const gex = new GenericExchange({
  dbOpts,
  debugLevel: 1
});

const executingCount = 100;
let executedCount = 0;
let successCount = 0;

const users = [101, 102, 103];
const buysells = [1, -1];
const prices = [97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const qtys = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const base = "USD";
const counter = "JPY";
const feeUserId = 1;
const feeCurrency = "JPY";
const feeAmount = 0; // 手数料は無料

// for memory
// initial positions: it will change depending on the contracts creation:  
const positionsShouldBe = {
  101: { "USD": 100, "JPY": 10000 },
  102: { "USD": 100, "JPY": 10000 },
  103: { "USD": 100, "JPY": 10000 },
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
  testCheckContract(this);
}, function(err) {
  if (err) throw err;
  testCheckPosition(this); // check positions
}, function(err) {
  if (err) {
    console.log("\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    console.log(" TEST ERROR:");
    console.error(err);
    console.log(" TEST FAILED :(");
    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    process.exit(1);
  } else {
    console.log("\n***************************************************************");
    console.log(" ALL TEST PASSED :)");
    console.log("***************************************************************");
    process.exit(0);
  }
});

function prepareTestData(cb) {
  Step(function() {
    supplyTestPositions(this);
  }, function(err) {
    if (err) throw err;
    makeTestOffers(this);
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


function makeTestOffers(cb) {
  for (let len = executingCount, i = 0; i < len; i++) {
    _makeTestOffer((err, res) => {
      if (err){
        console.log("\n[TEST] makeTestOffers Error:", err);
        console.log("");
      }
      else{
        successCount += 1;
      }
      executedCount += 1;
      if (executedCount >= executingCount) return cb && cb(null);
    });
  }
}

function _makeTestOffer(cb) {
  const userId = getRandomUser();
  Step(function() {
    getRandomPosition(userId, this);
  }, function(err, res) {
    if (err) throw err;
    const pos = res;
    const buysell = getRandomBuysell();
    const price = getRandomPrice();
    const qty = getRandomQty(pos);
    // user's offer
    const param = {
      userId, // userID
      base, // base ccy
      counter, // counter ccy
      buysell, // -1:sell 1:buy
      price, // Price of a base ccy
      qty, // Quantity of getting base ccy
    };
    // ** a fee to make an order (注文手数料)
    if (feeUserId !== undefined && feeAmount !== undefined && feeCurrency !== undefined) {
      param.feeUserId = feeUserId;
      param.feeAmount = feeAmount;
      param.feeCurrency = feeCurrency;
    }
    console.log("Offering:", param);
    gex.makeOffer(param, this);
  }, function(err, res) {
    return cb && cb(err);
    // return cb && cb(null); // always treat as success
  });
}

function testCheckContract(cb) {
  console.log("\n*** Assert: Checking integrity of the contracts\n");
  // 売り買い約定のトータルがゼロサムであることを確認
  gex.getContracts({ limit: 10000 }, (err, res) => {
    if (err) return cb && cb(err);
    const actSum = sumContracts(res);
    assert.equal(0, actSum["USD/JPY"]);
    return cb && cb(null);
  });

  function sumContracts(contracts) {
    let ret = {
      "USD/JPY": 0,
    };
    for (let len = contracts.length, i = 0; i < len; i++) {
      let cont = contracts[i];
      ret[cont.base + "/" + cont.counter] += (cont.buysell === 1) ? cont.qty : -cont.qty;
      // ついでにポジ変化をメモリに保存しておく / memory the position change
      if (cont.base == "USD" && cont.counter == "JPY") {
        if (cont.buysell === 1) {
          positionsShouldBe[cont.userId]["USD"] += cont.qty;
          positionsShouldBe[cont.userId]["JPY"] -= cont.price * cont.qty;
        } else if (cont.buysell === -1) {
          positionsShouldBe[cont.userId]["USD"] -= cont.qty;
          positionsShouldBe[cont.userId]["JPY"] += cont.price * cont.qty;
        } else throw Error("Anything wrong...");
      }
    }
    console.log("positionsShouldBe:", positionsShouldBe);
    return ret;
  }
}

function testCheckPosition(cb) {
  console.log("\n## Assert: positions are consistents with the expects which calculated from contracts\n");
  // ポジションのゼロサムをチェック
  gex.getPositions({ limit: 10000 }, (err, res) => {
    if (err) return cb && cb(err);
    const actSum = sumPositions(res);
    console.log(`300 USD should be ${actSum["USD"]} USD...`);
    assert.equal(300, actSum["USD"]);
    console.log(`30000 JPY should be ${actSum["JPY"]} JPY...`);
    assert.equal(30000, actSum["JPY"]);
    return cb && cb(null);
  });

  function sumPositions(positions) {
    let ret = {
      "USD": 0,
      "JPY": 0,
    };
    for (let len = positions.length, i = 0; i < len; i++) {
      let pos = positions[i];
      ret[pos.base] += pos.qty;
      // ついでに、約定から計算されたポジション positionsShouldBe と実際のポジションの整合性をチェック
      let userId = pos.userId;
      let base = pos.base;
      console.log(`${positionsShouldBe[userId][base]} should be ${pos.qty}...`);
      assert.equal(positionsShouldBe[userId][base], pos.qty);
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

function getRandomBuysell() {
  const candidates = buysells;
  return getRandomFromArray(candidates);
}

function getRandomPrice() {
  const candidates = prices;
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

function getRandomQty(pos) {
  const candidates = qtys;
  return getRandomFromArray(candidates);
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