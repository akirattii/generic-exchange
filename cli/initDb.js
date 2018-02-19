#!/usr/bin/env node

const description = `
  Initialize a database for GEX.
  
  ## Example:
  $ node cli/initDb.js --database=generic_exchange --host=localhost --user=root --password=1234
`;
const program = require('commander');
const config = require("config");
const common = require('./common.js');
const DbUtil = require("../lib/db-util.js");

program
  .version('0.0.1')
  .description(description)
  .option("--database <v>", "DB name")
  .option("--host <v>", "DB host")
  .option("--port <v>", "DB port", parseInt)
  .option("--user <v>", "DB user")
  .option("--password <v>", "DB password")
  .option("--insert-dummydata", "Insert dummydata")
  .option("--force-recreate", "Force to recreate DB. If you set, at first DB will be dropped then created new!")
  .option("--debug", "Output debug log")
  .parse(process.argv);

const database = program.database;
const host = program.host;
const port = program.port;
const user = program.user;
const password = program.password;
const insertDummydata = program.insertDummydata;
const forceRecreate = program.forceRecreate;
const debug = program.debug;

const p = {
  database,
  host,
  port,
  user,
  password,
  logFn: console.log,
};
if (insertDummydata) p.insertDummydata = insertDummydata;
if (forceRecreate) p.forceRecreate = forceRecreate;
if (debug) p.debug = debug;

console.log("Passing parameters:", p);

// Create database!
DbUtil.initDb(p, (err, res) => {
  if (err) {
    console.error("[Error]", err);
  } else {
    console.log("GEX database initialized!");
  }
});

// "USD/JPY,EUR/JPY" => ["USD/JPY","EUR/JPY"]
function list(s) {
  return s.split("/");
}

function getBoolean(v) {
  if (v) return true;
  return false;
}