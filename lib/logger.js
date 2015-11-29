var conf = require('../config'),
    winston = require('winston'),
    path = require('path'),
    fs = require('fs-extra-promise');

fs.ensureDirSync(conf.logsDir);

winston.addColors({
  debug: 'green',
  info: 'cyan',
  silly: 'purple',
  trace: 'magenta',
  verbose: 'magenta',
  warn: 'yellow',
  warning: 'yellow',
  error: 'red'
});

var logger = new winston.Logger({
  transports: [
    new(winston.transports.Console)({
      level: 'silly',
      handleExceptions: true,
      prettyPrint: true,
      silent: false,
      timestamp: true,
      colorize: true,
      json: false
    }),
    new(winston.transports.File)({
      name: 'file#info',
      level: 'info',
      json: true,
      prettyPrint: true,
      timestamp: true,
      colorize: false,
      filename: path.join(conf.logsDir, '/info.log'),
      maxsize: 1000000,
      maxFiles: 10
    }),
    new(winston.transports.File)({
      name: 'file#error',
      level: 'error',
      json: true,
      handleExceptions: true,
      prettyPrint: true,
      timestamp: true,
      colorize: false,
      filename: path.join(conf.logsDir, '/error.log'),
      maxsize: 1000000,
      maxFiles: 20
    })
  ]
});

module.exports = logger;
