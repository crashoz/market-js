const WebSocket = require('ws');
const EventEmitter = require('events');
const Promise = require('bluebird');
const logger = require('../logger');

const logName = '[Bitfinex]';

/**
 * Bitfinex API
 * @extends EventEmitter
 */
class Bitfinex extends EventEmitter {
  constructor(url, version) {
    super();
    this.url = url;
    this.version = version;
    this.subscriptions = {};
    this.commandQueue = [];
    this.isRunning = false;
  }

  /**
   * Parse incoming websocket message
   * @param  {Object} raw message
   * @return {}
   */
  parseMessage(message) {
    if (message.event) {
      switch (message.event) {
        case 'info':
          this.infoMessage(message);
          break;
        case 'error':
          this.errorMessage(message);
          break;
        case 'subscribed':
          this.subscribedMessage(message);
          break;
        default:
          logger.warn(`${logName} unknown message: ${message}`);
      }
    } else {
      let chanId = message[0];
      let sub = this.subscriptions[chanId];
      if (sub !== undefined) {
        if (Array.isArray(message[1])) {
          this.snapshotMessage(sub, message[1]);
        } else if (message[1] != "hb") {
          this.updateMessage(sub, message[2]);
        }
      } else {
        logger.warn(`${logName} unknown message: ${message}`);
      }
    }
  }

  /**
   * Parse a snapshot message
   * @param  {Object} sub     Subscription
   * @param  {Array} arrData Array of updates
   * @return {}
   */
  snapshotMessage(sub, arrData) {
    let length = arrData.length;
    for (let i=0; i<length; i++) {
      this.updateMessage(sub, arrData[i]);
    }
  }

  /**
   * Update message with price data
   * @param  {Object} sub  Subscription
   * @param  {Array} data  Array of data [id, time, volume, price]
   * @return {}
   */
  updateMessage(sub, data) {
    this.emit(sub.channel, sub.pair, data[1], Math.abs(data[2]), data[3]);
  }

  /**
   * Subscribed message, store subscription details
   * @param  {Object} message Raw message
   * @return {}
   */
  subscribedMessage(message) {
    switch (message.channel) {
      case 'trades':
        this.subscriptions[message.chanId] = {
          channel: message.channel,
          symbol: message.symbol,
          pair: message.pair
        }
        logger.info(`${logName} subscribed to ${message.channel} on ${message.symbol} as channel #${message.chanId}`);
        break;
      default:
        logger.warn(`${logName} unknown subscription ${message}`);
    }
  }

  errorMessage(message) {
    logger.error(`${logName} error ${message.code}: ${message.msg}`);
    this.stop();
  }

  infoMessage(message) {
    if (message.version !== undefined) {
      logger.info(`${logName} version ${message.version}`);
      if (message.version != this.version) {
        logger.error(`${logName} expected api v${this.version}, got ${message.version}`);
        this.stop();
      }
    } else if (message.code) {
      logger.warn(`${logName} info message ${message.code}: ${message.msg}`);
      switch (message.code) {
        case 20051:
          this.stop(true);
          break;
        case 20060:
          logger.warn(`${logName} entering maintenance mode`);
          this.maintenanceMode = true;
          break;
        case 20061:
          logger.warn(`${logName} exiting maintenance mode with ${this.commandQueue.length} commands to process`);
          this.maintenanceMode = false;
          const length = this.commandQueue.length;
          for (let i=0; i < length; i++) {
            let command = this.commandQueue.shift();
            this.ws.send(JSON.stringify(command));
          }
          break;
        default:
          logger.warn(`${logName} unknown info code: ${message}`);
      }
    }
  }

  sendCommand(command) {
    if (this.maintenanceMode) {
      this.commandQueue.push(command);
    } else {
      this.ws.send(JSON.stringify(command), err => {
        if (err) {
          logger.error(`${logName} send error: ${err}`);
        }
      });
    }
  }

  subscribe(channel, symbol) {
    logger.info(`${logName} subscribing to ${channel} on ${symbol}`);
    this.sendCommand({
      event: "subscribe",
      channel: channel,
      symbol: symbol
    });
  }

  start() {
    return new Promise((resolve, reject) => {

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.isRunning = true;
        logger.info(`${logName} websocket connected`);
        resolve();
      });

      this.ws.on('close', () => {
        logger.info(`${logName} websocket closed`);
      });

      this.ws.on('message', message => {
        this.parseMessage(JSON.parse(message));
      });

    });
  }

  stop(restart) {
    if (!this.isRunning) {
      return;
    }
    logger.info(`${logName} stopping websocket`);
    this.ws.terminate();
    this.isRunning = false;
    if (restart) {
      logger.info(`${logName} restarting websocket`)
      this.start();
    }
  }
}

module.exports = Bitfinex;
