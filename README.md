# Generic Exchange

**GEX** (Generic Exchange) is an node module set for launching a generic asset exchange web service.

This module contains JSON RPC server named **GAS** (Generic Exchange API Server), which uses GEX library internally and opens API endpoints for localhost server machine to use GEX features. The users of this service can trade any symbols which are not only any fiat currencies like "USD" but also any cryptocurrencies like "BTC" and so on. In the case of an exchange system of cryptocurrencies, this system plays a role of off-chain (off-ledger) processing part. No need to prepare any special system for them such as any bank transfer system and blockchain node, because a symbol used on this system is just a string of 3 charactors ;) Of course, you can also give some real values to the symbols as long as you have the responsibility to properly redeem your user's credits on the real world.

**Goal**  
The goal of this project is that it helps for some starting-up exchange service providers which has not had its own exchange system yet to operate their service simply and quickly.


## Precautions

**At your own risk!**  

This software is currently **under BETA version**. This project is just my hobby project and may be a something like a sloppy toy for now. Therefore probably it won't be suitable for business use yet. Aside to that, please keep in mind that I use my private time to develop this software, so my reply to your demand of any improvement or bugfix will be tardy even if it is urgent. 

## Table of contents

- [Premise](#premise)
- [Installing](#installing)
- [Configuration](#configuration)
- [DB Initializing](#db-initializing)
- [Run GAS as daemon](#run-gas-as-daemon)
- [For security](#for-security)
    - [Block direct access!](#block-direct-access)
- [Test](#test)
- [Integration for your webapp](#integration-for-your-webapp)
    - [Join with your webapp](#join-with-your-webapp)
    - [Code example](#code-example)
- [Technical document](#technical-document)
    - [Examples of API Call](#examples-of-api-call)
        - [Server](#server)
        - [Position](#position)
        - [Offer](#offer)
        - [Orderbook](#orderbook)
        - [Contract](#contract)
        - [Transfer](#transfer)
    - [Objects](#objects)
        - [Transfer Object](#transfer-object)
        - [Offer Object](#offer-object)
        - [Affected Object](#affected-object)
    - [Price and Quantity](#price-and-quantity)
    - [Pagination](#pagination)
- [Authors](#authors)
- [License](#license)



## Premise

It is assuming below:

- **localhost:** GAS must run on the back of your webapp and is called its APIs from your server-side. It is forbidden for external users to access to it directly.
```
         JSON RPC                        
 [GAS] <===========> [Your Web App Server] <=======> [User's Browser etc.] 
┏┓　　　
┃┣┳┳┓
┣┻┫┃┃ GAS must run on the back of your webapp!
┃┏┻┻┫
┗┓　┏┛
```

- **NodeJS:** Assumes that GEX and GAS use NodeJS `v8.9.4 (LTS)`, however other version's may be also available. If not installed it yet, please [install it](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04).
- **MySQL:** GEX and GAS uses MySQL database server. Currently we develop it using the version `5.7.19-log`, but other version's also may be available. If not installed it yet, please [install it](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-16-04).  

- **Not have user auth feature:** User's authentication is your webapp's responsibility. Both GEX and GAS have nothing to do with your customer's login state. For instance, anyone can cancel other user's offer by `cancelOffer` API method, so you have to implement a member's login-check logic into your system so that it prevents for an user to cancel other user's offer.

## Installing

git clone this project and npm install:

```
$ git clone https://github.com/akirattii/generic-exchange.git
$ cd generic-exchange
$ npm install
```

## Configuration

Change GEX configs (`config/default.json` and `config/production.json`) depending on your environment:

```
# default settings (used for development mode):
$ nano config/default.json

  {
    "gex": {
      ...
      // DB settings:
      "dbOpts": {
        "connectionLimit": 100,
        "host": "localhost",
        "port": 3306,
        "user": "<DB_USER>",
        "password": "<DB_PASSWORD>",
        "database": "<GEX_DB_NAME>"
      },
      // API server settings:
      "apiServer": {
        "host": "127.0.0.1",
        "port": 3001
      },
      ...
  }


# production settings (used for production mode):
$ nano config/production.json

  {
    "gex": {
      ...
      // DB settings:
      "dbOpts": {
        "connectionLimit": 100,
        "host": "localhost",
        "port": 3306,
        "user": "<DB_USER>",
        "password": "<DB_PASSWORD>",
        "database": "<GEX_DB_NAME>"
      },
      // API server settings:
      "apiServer": {
        "host": "127.0.0.1",
        "port": 3001
      },
      ...
  }
```

## DB Initializing

You can initialize GEX DB by using CLI:

```
$ node cli/initDb.js --database=<GEX_DB_NAME> --host=localhost --port=3306 --user=<DB_USER> --password=<DB_PASSWORD> --force-recreate
```

**CAUTION:** `--force-recreate` option is used for DB re-creation. By setting it, the database is dropped and re-created. Unless you want, do not set this flag.

#### Tables

Below tables are created by `initDb.js` and used by GEX:

- `offer`: Offers data.
- `position`: the current position data of users.
- `contract`: the order execution's history of users. Mainly used to find the user's matched order history.
- `transfer`: the fund transfer data of users.
- `otc_offer`: OPTIONAL: the OTC offering data which structure is same as `offer`. NOTE: The OTC offering feature will help you if you provide OTC trading to your customers. 

## Run GAS as daemon

As production mode:

```
$ NODE_ENV=production nohup node api-server/server.js &
```

Or as development mode:

```
$ nohup node api-server/server.js &
```

**NOTICE:** To run GAS on background, you should use `nohup` command, which prevents to occur `write EIO` error and die GAS process when anyone calls GAS API after you close your terminal on which you run GAS.  
  
You can check whether GAS alives by using CLI like this:

```
$ node cli/ping.js 
"pong" <= It alives!
```

**TIPS:**

- GAS is a JSON RPC server, thus you can use your favorite RPC client (of course, including `curl`) to call its methods.
- GAS allows clients to access from *localhost* only by default.
- If it logs `ERROR: !!!!! errorHandler middleware caught error: Error: Cannot find module '../encodings'` and does not run, [this solution](https://github.com/ashtuchkin/iconv-lite/issues/118#issuecomment-267811928) will help you.


## For security

#### Block direct access!

**IMPORTANT:** For the security reason, DO NOT FORGET to block any direct access to GEX from external machines.
In order to do that, for example, you can block GEX port access from external machines on terminal like this (assuming that your server OS is Ubuntu):

```
# `3001` is default port for GEX:
$ iptables -A INPUT -p tcp -m tcp --dport 3001 -j DROP
$ iptables -A INPUT -p tcp -s localhost --dport 3001 -j ACCEPT
...

# OPTION: If you want to persist your iptables settings, save it:
$ iptables-save > /etc/iptables.conf

# OPTION: If you want to load the settings automatically on your server reboot:
$ nano /etc/rc.local

  ...
  ## Add below
  sudo iptables-restore /etc/iptables.conf

```

## Test

Random transfering test:

```
$ node test/test-random-transfer-bot.js
```

Random offering test:

```
$ node test/test-random-offer-bot.js
```

**TIPS:** Database settings of above test is `test/dbOpts.js`. Change the settings depending on your environment.


## Integration for your webapp

#### Join with your webapp

All GEX tables have `userId` column which can be joined with your webapp's user data and is only one thing to bridge between your webapp and GEX.

#### Code example

You can call GEX APIs via GAS by using your favorite JSON RPC client library. For example, your webapp's `server.js` may look like this:
```
const express = require('express');
const app = express();

...

// Use any JSON RPC Client library as you like
const RpcClient = require("./lib/awesome-rpc-client.js");
client = new RpcClient({ url: "http://localhost:3001" }); // RPC Client as a global instance

...

// routers:
app.use('/orderbook', require('./router/orderbook.js'));
app.use('/member/index', require('./router/member/index.js'));
app.use('/member/offer', require('./router/member/offer.js'));
app.use('/member/contract', require('./router/member/contract.js'));
app.use('/member/position', require('./router/member/position.js'));
app.use('/member/transfer', require('./router/member/transfer.js'));

...

// Check whether GAS alives
checkGasAlive((err, res) => {
  app.listen(expressPort, expressHost, function() {
    logger.info(`Server listening on port ${expressPort}`);
  });
});

function checkGasAlive(cb) {
  client.call({ method: "ping", params: [{}] }, (err, res) => {
    if (err) {
      logger.error(`!!! GAS instance: ${GAS_URL} is down! Exit.`);
      process.exit(1);
    }
    return cb && cb(null, res);
  });
}
```

## Technical Document

### Examples of API Call

#### Server

##### Ping GAS

Ping GAS to check whether it alives:
```
# using CLI:

$ node cli/ping.js

# or using curl:

$ curl -XPOST -H 'content-type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ping",
  "params": [{}]
}' http://127.0.0.1:3001/
```

#### Position

##### Supply Position

Supply 100 "USD" to userId:101:
```
# using CLI:

$ node cli/supplyPosition.js --user-id=101 --base=USD --qty=100 

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "supplyPosition",
  "params": [{
    "userId": 101,
    "base": "USD",
    "qty": 100
  }]
}' http://127.0.0.1:3001/
```

Supply 100000 "JPY" to userId:101:
```
# using CLI:

$ node cli/supplyPosition.js --user-id=101 --base=JPY --qty=100000

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "supplyPosition",
  "params": [{
    "userId": 101,
    "base": "JPY",
    "qty": 100000
  }]
}' http://127.0.0.1:3001/
```

##### Get Position

Get positions of userId:101:
```
# using CLI:

$ node cli/getPositions.js --user-id=101

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getPositions",
  "params": [{
    "userId":101
  }]
}' http://127.0.0.1:3001/
```

#### Offer

##### Make Offer

userId:101 buys 100 "USD/JPY" @120: 
```
# using CLI:

$ node cli/makeOffer.js --user-id=101 --cpair=USD/JPY --buysell=1 --price=120 --qty=100 

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "makeOffer",
  "params": [{
    "userId": 101,
    "base": "USD",
    "counter": "JPY",
    "buysell": 1,
    "price": 120,
    "qty": 100
  }]
}' http://127.0.0.1:3001/
```

userId:101 sells 100 "USD/JPY" @122: 
```
# using CLI:

$ node cli/makeOffer.js --user-id=101 --cpair=USD/JPY --buysell=-1 --price=122 --qty=100 

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "makeOffer",
  "params": [{
    "userId": 101,
    "base": "USD",
    "counter": "JPY",
    "buysell": -1,
    "price": 122,
    "qty": 100
  }]
}' http://127.0.0.1:3001/
```

userId:101 cancels an offer (offerId:1):
```
# using CLI:

$ node cli/cancelOffer.js --user-id=101 --id=1 

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "cancelOffer",
  "params": [{
    "userId": 101,
    "id": 1
  }]
}' http://127.0.0.1:3001/
```

#### Orderbook

##### Get Orderbook

Get "USD/JPY" orderbook:
```
# using CLI:

$ node cli/getOrderbook.js --cpair=USD/JPY --merge

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getOrderbook",
  "params": [{
    "base": "USD",
    "counter": "JPY",
    "merge": true
  }]
}' http://127.0.0.1:3001/
```

#### Contract

##### Get Contracts

Get "USD/JPY" contracts of userId:101:
```
# using CLI:

$ node cli/getContracts.js --user-id=101 --cpair=USD/JPY

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getContracts",
  "params": [{
    "userId": 101,
    "base": "USD",
    "counter": "JPY"
  }]
}' http://127.0.0.1:3001/
```


#### Transfer

##### Make Transfer

userId:101 sends 100 "USD" to userId:102:
```
# using CLI:

$ node cli/makeTransfer.js --src-user-id=101 --dst-user-id=102 --base=USD --qty=100

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "makeTransfer",
  "params": [{
    "srcUserId": 101,
    "dstUserId": 102,
    "base": "USD",
    "qty": 100
  }]
}' http://127.0.0.1:3001/ 
```
##### Get User Transfers

Get transfers of userId:101 who sent or received:
```
# using CLI:

$ node cli/getUserTransfers.js --user-id=101

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getUserTransfers",
  "params": [{
    "userId": 101
  }]
}' http://127.0.0.1:3001/ 
```
##### Get Transfers

Get transfers that userId:101 is a sender and userId:102 is a receiver:
```
# using CLI:

$ node cli/getTransfers.js --src-user-id=101 --dst-user-id=102

# or using curl:

$ curl -XPOST -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getUserTransfers",
  "params": [{
    "srcUserId": 101,
    "dstUserId": 102
  }]
}' http://127.0.0.1:3001/ 
```


### Objects

#### Transfer Object

 - srcUserId {Number} - source userID
 - dstUserId {Number} - desitination userID
 - base {String} - a base ccy symbol
 - qty {Number} - an amount of base currency to buy/sell
 - feeUserId {Number} - [optional] an user who receive fee
 - feeAmount {Number} - [optional] fee amount. fee currency is same as `base`. default fee is 0 (free). 

#### Offer Object

user's offer to create new:

 - userId {Number} - userID
 - base {String} - a base ccy symbol
 - counter {String} - a counter ccy symbol
 - buysell {Number} - buy/sell yype. -1:sell 1:buy
 - price {Number} - a price per 1 base currency to buy/sell
 - qty {Number} - an amount of base currency to buy/sell
 - feeUserId {Number} - [optional] an user who receive fee
 - feeCurrency {String} - [optional] fee currency. if empty, uses `base`.
 - feeAmount {Number} - [optional] fee amount 

#### Affected Object

Some APIs making transaction returns `affected` object. It represents that which items are affected by a tx.
For example, `makeOffer` API returns an `affected` object looks like this:
```
{
 "orderbook":{ "base": "USD", "counter": "JPY" },
 "offer": [101, 102],
 "contract": [102, 101],
 "position": [102, 101]
}
```

Above means that this tx affected to:

- "USD/JPY" orderbook
- user:101 and user:102's offers
- user:101 and user:102's contracts
- user:101 and user:102's positions


### Price and Quantity

On GEX world, `price` is available *the 2nd decimal place*, while `qty` (quantity) is *integer*. Thus, if your exchange wants to treat any cryptocurrency such as BTC, `qty` should treat as *satoshis* value but not *BTC*. 
  
#### Best practice of `qty` handling
If your service supports either any cryptocurrency such as BTC and any fiat, it might be simple that all of them are handled as number of 8 decimal place conforming with BTC. In that case, even if a `qty` means a quanitity of any **fiat**, they should be multiplied by 100000000 before insert it into GEX database because `qty` column is `BIGINT` type but not any decimal's.

For example, if you will save *3 USD* value into GEX DB, you have to multiple it by 100000000 before do that.

- *3 USD* is expressed on the DB like this: `300000000`

On the case that you save *0.00000003 BTC* (3 satoshis) value into the DB:

- *0.00000003 BTC* is expressed on the DB like this: `3`

And on the case that you save *0.000003 XRP* (3 drops) value into the DB:

- *0.000003 XRP* is expressed on the DB like this: `300`


### Pagination

For APIs that returns historical data, for example, such as `getContracts`, you can use pagination feature. To do it, just set parameters `cursor` and `limit`. `cursor` is starting index point to get them, and `limit` is max length of items which you get at one request.


## Authors

- **Akira Tanaka** - *Founder* - [akirattii@github](https://github.com/akirattii)

## LICENSE

This project is licensed under the MIT License - see the [LICENSE.txt](./LICENSE.txt) file for details


END
