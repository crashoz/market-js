const WebSocket = require('ws');
const logger = require('./logger');
const DB = require('./db');
const Vault = require('./vault');
const orderBook = require('./market/orderbook');
const Account = require('./account');
const WebApp = require('./server/app');



const vault = new Vault();
const webapp = new WebApp();

process.on('SIGINT', () => {
  vault.stop();
  webapp.stop();
  DB.close();
});

DB.connect().then(() => {
}).then(() => {
  vault.start();
  webapp.start(2500);
});
