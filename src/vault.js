const EventEmitter = require('events');
const WebSocket = require('ws');
const Promise = require('bluebird');
const crypto = require('crypto');
const mojangson = require('mojangson');
const XXH = require('xxhashjs');
const DB = require('./db');
const logger = require('./logger');
const Config = require('./config');

const logName = '[Vault]';

class Vault extends EventEmitter {
  constructor() {
    super();

    this.ws = null;
    this.activeCodes = [];
  }

  start() {
    DB.getActiveCodes().then((data) => {
      this.activeCodes = data.map((e) => e.code);
    })
    this.wss = new WebSocket.Server({
      host: '0.0.0.0',
      port: 3111
    });
    this.wss.on('connection', (ws) => {
      logger.debug(`${logName} skript connected`)
      this.ws = ws;
      ws.on('message', this.handleMessage.bind(this));
      ws.on('error', (err) => {
        logger.debug(`${logName} ${err}`);
        ws.close();
        this.ws = null;
      });
      ws.on('close', () => {
        this.ws = null;
      })
    });
  }

  stop() {
    this.wss.close();
  }

  handleMessage(message) {
    const split = message.split('|');
    const type = split[0];
    switch (type) {
      case 'ITEM_DEPOSIT':
        this.deposit(split);
        break;
      case 'MONEY_DEPOSIT':
        this.moneyDeposit(split);
        break;
      case 'AUTH_CODE':
        this.authCode(split);
        break;
    }
  }

  deposit([type, player, data, quantity]) {
    console.log(data);
    let pos = data.indexOf(',');
    const stack = data.substr(0,pos);
    let pos1 = data.indexOf(',', pos+1);
    const maxDurability = data.substr(pos+1, pos1-pos-1);
    const moj = data.substr(pos1+1);
    const item = mojangson.parse(moj);
    const hash = XXH.h32(moj, 1).toString();
    console.log(maxDurability);
    console.log(item);
    console.log(hash);
    DB.updateItem(hash, stack, maxDurability, moj, item).then(() => {
      return DB.getItemByHash(hash).then((result) => {
        if (result.length == 0) {
          this.ws.send(`DEPOSIT_ERROR|${player}|${data}|${quantity}`, (err) => {});
          return 'deposit-error';
        } else {
          return DB.deposit(player, result[0]._id, parseInt(quantity));
        }
      })

    }).then((status) => {
      if (status == 'deposit-error') {
        return;
      }
      this.emit('deposit', player, item, quantity);
    })
  }

  withdraw(player, item, quantity) {
    if (this.ws) {
      DB.withdraw(player, item, quantity);
      this.ws.send(`ITEM_WITHDRAWAL|${player}|${item}|${quantity}`, (err) => {});
      this.emit('withdraw', player, item, quantity);
      return true;
    }
    return false;
  }

  generateNewCode() {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(8, (err, code) => {
        if (err) {
          reject()
          return;
        }
        if (this.activeCodes.includes(code)) {
          return resolve(generateNewCode())
        } else {
          resolve(code);
        }
      });
    });
  }

  authCode([type, player]) {
    DB.getPlayer(player).then((result) => {
      if (result.length != 0) {
        result = result[0];

        if (result.email) {
          this.ws.send(`AUTH_CODE|ACCOUNT_EXISTS|${result.email}`, (err) => {});
          return;
        } else if (result.code && result.expires < Date.now()) {
          this.ws.send(`AUTH_CODE|ACCOUNT_CREATED|${result.code}`, (err) => {});
          return;
        }
      }

      this.generateNewCode().then((code) => {
        const expires = Date.now() + 3600000;
        DB.createPlayer(player, code.toString('hex'), expires).then(() => {
          this.ws.send(`AUTH_CODE|ACCOUNT_CREATED|${code.toString('hex')}`, (err) => {});
        });
      });
    });
  }
}

module.exports = Vault;
