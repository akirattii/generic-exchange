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

Step(function() {
  DbUtil.initDb(dbOpts, this);
}, function(err) {
  if (err) throw err;
  prepareTestData(this);
}, function(err) {
  if (err) throw err;
  console.log("***************************************************************");
  console.log("* transfer TEST START:");
  console.log("***************************************************************");
  testCheckPosition(this);
}, function(err) {
  if (err) throw err;
  testCheckTransfer(this);
  return null;
}, function(err) {
  if (err) {
    console.log("***************************************************************");
    console.log("* TEST ERROR:");
    console.error(err);
    console.log("*********** TEST FAILED :(");
    process.exit(1);
  } else {
    console.log("***************************************************************");
    console.log("* ALL TEST PASSED :)");
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

  const base = "USD";
  const feeUserId = 1;
  const feeAmount = 5;

  const list = [
    // send 95 USD (+fee 5 USD) from 101 to 102: 
    { srcUserId: 101, dstUserId: 102, base, qty: 95, feeUserId, feeAmount },
    // send 190 USD (+fee 5 USD) from 102 to 103: 
    { srcUserId: 102, dstUserId: 103, base, qty: 190, feeUserId, feeAmount },
  ];

  let count = 0;

  for (let len = list.length, i = 0; i < len; i++) {
    let transfer = list[i];
    gex.makeTransfer(transfer, (err, res) => {
      if (err) throw err;
      count += 1;
      if (count >= list.length) return cb && cb(null);
    });
  }
}

function testCheckPosition(cb) {
  const expects = [
    { userId: 101, base: "USD", qty: 0 },
    { userId: 102, base: "USD", qty: 0 },
    { userId: 103, base: "USD", qty: 290 },
  ];

  const ite = function*(_cb) {
    for (let len = expects.length, i = 0; i < len; i++) {
      let ex = expects[i];
      let userId = ex.userId;
      let base = ex.base;
      let qty = ex.qty;
      yield gex.getPositions({ userId, base }, (err, res) => {
        if (err) return _cb && _cb(err);
        assert.equal(res.length, 1);
        let o = res[0];
        assert.equal(o.userId, ex.userId);
        assert.equal(o.base, ex.base);
        assert.equal(o.qty, ex.qty);
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}

function testCheckTransfer(cb) {
  /*
  | id | srcUserId | dstUserId | base | qty | feeUserId | feeAmount | createdAt  | updatedAt  |
+----+-----------+-----------+------+-----+-----------+-----------+------------+------------+
|  1 |       101 |       102 | USD  |  95 |         1 |      5.00 | 1515033817 | 1515033817 |
|  2 |       102 |       103 | USD  | 190 |         1 |      5.00 | 1515033817 | 1515033817 |
*/
  const expects = [
    { id: 1, srcUserId: 101, dstUserId: 102, base: "USD", qty: 95, feeUserId: 1, feeAmount: 5 },
    { id: 2, srcUserId: 102, dstUserId: 103, base: "USD", qty: 190, feeUserId: 1, feeAmount: 5 },
  ];

  const ite = function*(_cb) {
    for (let len = expects.length, i = 0; i < len; i++) {
      let ex = expects[i];
      let id = ex.id;
      let srcUserId = ex.srcUserId;
      let dstUserId = ex.dstUserId;
      let base = ex.base;
      let qty = ex.qty;
      let feeUserId = ex.feeUserId;
      let feeAmount = ex.feeAmount;
      yield gex.getTransferById(id, (err, res) => {
        if (err) return _cb && _cb(err);
        assert.equal(res.length, 1);
        let o = res;
        assert.equal(o.srcUserId, ex.srcUserId);
        assert.equal(o.dstUserId, ex.dstUserId);
        assert.equal(o.base, ex.base);
        assert.equal(o.qty, ex.qty);
        assert.equal(o.feeUserId, ex.feeUserId);
        assert.equal(o.feeAmount, ex.feeAmount);
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}