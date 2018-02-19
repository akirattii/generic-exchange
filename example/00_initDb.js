const DbUtil = require("../lib/db-util.js");

// Recreate database!
DbUtil.initDb({
  database: "test_generic_exchange",
  host: "container-mysql",
  port: 3306,
  user: "root",
  password: "mysql",
  insertDummydata: true,
  forceRecreate: true, // Drop and create DB. default is false
  logFn: console.log,
  debug: true,
}, (err, res) => {
  console.log("callback:", err, res);
});