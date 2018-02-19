const TESTNAME = "otc-trade";
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
  console.log(`* "${TESTNAME}" TEST START:`);
  console.log("***************************************************************");
  testCheckPosition(this);
}, function(err) {
  if (err) throw err;
  testCheckContract(this);
}, function(err) {
  if (err) throw err;
  testCheckOffer(this);
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
    insertOtcs(this);
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
    { userId: 1, base: "USD", qty: 1000 },
    { userId: 101, base: "USD", qty: 100 },
    { userId: 102, base: "USD", qty: 100 },
    { userId: 103, base: "USD", qty: 100 },
    // -- JPY supply:
    { userId: 1, base: "JPY", qty: 100000 },
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

function insertOtcs(cb) {
  const list = [
    // OTC Sales data:
    { userId: 1, base: "USD", counter: "JPY", buysell: -1, price: 120, qty: 1000, remaining: 1000, cancelled: 0 },
    { userId: 1, base: "USD", counter: "JPY", buysell: 1, price: 118, qty: 1000, remaining: 1000, cancelled: 0 },
  ];

  const ite = function*(_cb) {
    for (let len = list.length, i = 0; i < len; i++) {
      let p = list[i];
      yield gex.upsertOtcOffer(p, (err, res) => {
        if (!err) console.log("inserted:", p);
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}


function makeTestOffers(cb) {

  const base = "USD";
  const counter = "JPY";
  const otc = 1; // means it is OTC Sales offer

  const list = [
    // user101 buy 50 USD/JPY @100: It should be ERROR!
    { userId: 101, base, counter, buysell: 1, price: 100, qty: 50, otc },
    // user102 buy 50 USD/JPY @120: 
    { userId: 102, base, counter, buysell: 1, price: 120, qty: 50, otc },
    // user103 sell 50 USD/JPY @118: 
    { userId: 103, base, counter, buysell: -1, price: 118, qty: 50, otc },
  ];

  let count = 0;

  for (let len = list.length, i = 0; i < len; i++) {
    let offer = list[i];
    gex.makeOffer(offer, (err, res) => {
      if (err) throw err;
      count += 1;
      if (count >= list.length) return cb && cb(null);
    });
  }
}

function testCheckPosition(cb) {
  const expects = [
    { userId: 1, base: "USD", qty: 1000 - 50 + 50 },
    { userId: 101, base: "USD", qty: 100 },
    { userId: 102, base: "USD", qty: 150 },
    { userId: 103, base: "USD", qty: 50 },
    { userId: 1, base: "JPY", qty: 100000 + (120 * 50) - (118 * 50) },
    { userId: 101, base: "JPY", qty: 10000 },
    { userId: 102, base: "JPY", qty: 10000 - (120 * 50) },
    { userId: 103, base: "JPY", qty: 10000 + (118 * 50) },
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

function testCheckContract(cb) {
  const expects = [
    { userId: 102, base: "USD", counter: "JPY", buysell: 1, price: 120, qty: 50, offerPrice: 120, offerQty: 50, },
    { userId: 1, base: "USD", counter: "JPY", buysell: -1, price: 120, qty: 50, offerPrice: 120, offerQty: 1000, },
    { userId: 103, base: "USD", counter: "JPY", buysell: -1, price: 118, qty: 50, offerPrice: 118, offerQty: 50, },
    { userId: 1, base: "USD", counter: "JPY", buysell: 1, price: 118, qty: 50, offerPrice: 118, offerQty: 1000, },
  ];

  const ite = function*(_cb) {
    for (let len = expects.length, i = 0; i < len; i++) {
      let ex = expects[i];
      let userId = ex.userId;
      let base = ex.base;
      let counter = ex.counter;
      let qty = ex.qty;
      yield gex.getContracts({ userId, base, counter }, (err, res) => {
        if (err) return _cb && _cb(err);
        if (userId === 102) {
          assert.equal(res.length, 1)
          let o = res[0];
          assert.equal(o.userId, ex.userId);
          assert.equal(o.base, ex.base);
          assert.equal(o.counter, ex.counter);
          assert.equal(o.buysell, ex.buysell);
          assert.equal(o.price, ex.price);
          assert.equal(o.qty, ex.qty);
          assert.equal(o.offerPrice, ex.offerPrice);
          assert.equal(o.offerQty, ex.offerQty);
        } else if (userId === 103) {
          assert.equal(res.length, 1)
          let o = res[0];
          assert.equal(o.userId, ex.userId);
          assert.equal(o.base, ex.base);
          assert.equal(o.counter, ex.counter);
          assert.equal(o.buysell, ex.buysell);
          assert.equal(o.price, ex.price);
          assert.equal(o.qty, ex.qty);
          assert.equal(o.offerPrice, ex.offerPrice);
          assert.equal(o.offerQty, ex.offerQty);
        } else if (userId === 1) {
          assert.equal(res.length, 2)
          // let o = res[0];
          // console.log("baa:",o);
          // assert.equal(o.userId, ex.userId);
          // assert.equal(o.base, ex.base);
          // assert.equal(o.counter, ex.counter);
          // assert.equal(o.buysell, ex.buysell);
          // // assert.equal(o.price, ex.price);
          // // assert.equal(o.qty, ex.qty);
          // assert.equal(o.offerPrice, ex.offerPrice);
          // assert.equal(o.offerQty, ex.offerQty);
        } else {
          throw Error("anything wrong");
        }
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}


function testCheckOffer(cb) {
  const expects = [
    { id: 1, userId: 1, base: "USD", counter: "JPY", buysell: -1, price: 120, qty: 1000, remaining: 950, cancelled: 0 },
    { id: 2, userId: 1, base: "USD", counter: "JPY", buysell: 1, price: 118, qty: 1000, remaining: 950, cancelled: 0 },
  ];

  const ite = function*(_cb) {
    for (let len = expects.length, i = 0; i < len; i++) {
      let ex = expects[i];
      let id = ex.id;
      let userId = ex.userId;
      let base = ex.base;
      let counter = ex.counter;
      let buysell = ex.buysell;
      let price = ex.price;
      let qty = ex.qty;
      let remaining = ex.remaining;
      let cancelled = ex.cancelled;
      const otc = 1;
      yield gex.getOfferById({ id, base, counter, otc }, (err, res) => {
        if (err) return _cb && _cb(err);
        let o = res;
        assert.equal(o.userId, ex.userId);
        assert.equal(o.base, ex.base);
        assert.equal(o.counter, ex.counter);
        assert.equal(o.buysell, ex.buysell);
        assert.equal(o.price, ex.price);
        assert.equal(o.qty, ex.qty);
        assert.equal(o.remaining, ex.remaining);
        assert.equal(o.cancelled, ex.cancelled);
        ite.next();
      });
    }
    return _cb && _cb(null);
  }(cb);
  ite.next();
}