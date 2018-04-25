const config = require("config");
const cfgRoot = config["gex"];
// const path = require("path");
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const DEFAULT_CATEGORY = "default";

const logger = {
  default: null, // category: `default` logger
};

const COLOR_CODES = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};

// winston.setLevels(winston.cfgRoot.npm.levels);
// winston.setLevels(winston.cfgRoot.npm.levels);

const formatter = function(options) {
  // Return string will be passed to logger.
  return _format(options);
};

const coloredFormatter = function(options) {
  // Return string will be passed to logger.
  let logmsg = _format(options);

  let colorCode = COLOR_CODES.FgGreen;
  if (options.level === "error") {
    colorCode = COLOR_CODES.FgRed;
  } else if (options.level === "warn") {
    colorCode = COLOR_CODES.FgYellow;
  } else if (options.level === "debug") {
    colorCode = COLOR_CODES.FgCyan;
  } else if (options.level === "info") {
    colorCode = COLOR_CODES.FgGreen;
  }
  return colorCode + logmsg + COLOR_CODES.Reset;
};

function _format(options) {
  // Return string will be passed to logger.
  return options.timestamp() + ' ' + options.level.toUpperCase() + ': ' +
    // " [" + category + "] " +
    (undefined !== options.message ? options.message : '') +
    (options.meta && Object.keys(options.meta).length ? ' ' + JSON.stringify(options.meta) : '');
}

/** get a logger instance */
module.exports.getLogger = function(category) {
  if (!category) category = DEFAULT_CATEGORY;
  if (logger[category]) return logger[category];

  const logdir = (cfgRoot.logging.file.category[category]) ?
    cfgRoot.logging.file.category[category].dir :
    cfgRoot.logging.file.category[DEFAULT_CATEGORY].dir;

  const transports = [];

  //
  // -- log to File daily rotated
  //
  transports.push(
    new DailyRotateFile({
      level: cfgRoot.logging.file.level,
      filename: logdir + cfgRoot.logging.file.filename,
      datePattern: cfgRoot.logging.file.dailyDatePattern,
      prepend: true,
      json: false,
      timestamp: function() {
        return new Date().toLocaleString();
      },
      formatter: formatter,
    }));

  if (process.env.NODE_ENV !== "production") {
    //
    // -- log to Console
    //
    transports.push(
      // new winston.transports.Console({
      new winston.transports.Console({
        level: cfgRoot.logging.console.level,
        colorize: true,
        timestamp: function() {
          return new Date().toLocaleString();
        },
        formatter: coloredFormatter,
      }));
  }

  logger[category] = new(winston.Logger)({
    transports
  });

  return logger[category];
};