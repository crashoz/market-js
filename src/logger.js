const winston = require('winston');
const Config = require('./config');

if (Config.prod) {
  require('winston-log2gelf');
  const graylog = new winston.transports.Log2gelf({
    level: 'debug',
    handleExceptions: true,
    exceptionLevel: 'error',
    host: '127.0.0.1',
    port: 12201
  });
}

const prodConsole = new winston.transports.Console({
  level: 'info',
  handleExceptions: true,
  json: false,
  colorize: true
})

const devConsole = new winston.transports.Console({
  level: 'debug',
  json: false,
  colorize: true
})

const transports = [];
if (Config.prod) {
  transports.push(graylog);
  transports.push(prodConsole);
} else if (Config.dev) {
  transports.push(devConsole);
}
if (Config.test) {
  //transports.push(devConsole);
}

const logger = new winston.Logger({
  transports: transports,
  exitOnError: false
});

module.exports = logger;
