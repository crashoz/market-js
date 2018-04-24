const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const Config = require('./config');
const logger = require('./logger');

const logName = '[Database]'

/**
 * Manages the connection to MongoDB database
 */
class Database {
  constructor() {
  }

  connect() {
    const url = Config.test ? Config.db.testurl : Config.db.url;
    return MongoClient.connect(url).then(db => {
      this.db = db;
      logger.info(`${logName} connection successful`);
      return db;
    }).catch(err => {
      logger.error(`${logName} connection failed: ${err}`);
    });
  }

  close() {
    this.db.close();
    logger.info(`${logName} connection closed`);
  }

  /**
   * Adds one candle data to a candle collection
   * @param {Object} candle  {pair, timestamp, open, high, low, close, volume}
   */
  addCandle(period, candle) {
    const candleCollection = this.db.collection(`candles-${period}`);
    return candleCollection.insertOne(candle).then(result => {
      logger.debug(`${logName} inserted a ${period}-candle with id=${result.insertedId}`);
    }).catch(err => {
      logger.debug(`${logName} error while inserting a candle: ${err}`);
    });
  }

  /**
   * Returns one candle (promise)
   * @param  {String} period    1m, 5m, ...
   * @param  {String} pair      the trading pair
   * @param  {Integer} timestamp timestamp of the beginning of the candle
   * @return {Promise<Candle>}           promise with one candle
   */
  getCandle(period, pair, timestamp) {
    const candleCollection = this.db.collection(`candles-${period}`);
    return candleCollection.findOne({pair: pair, timestamp: timestamp});
  }

  /**
   * Returns all candles between two timestamp, ordered by timestamp
   * @param  {String} period 1m, 5m, ...
   * @param  {String} pair   the trading pair
   * @param  {Integer} start  first timestamp (included)
   * @param  {Integer} stop   last timestamp (excluded)
   * @return {Promise<Array[Candle]>}        promise with an array of candles
   */
  getCandles(period, pair, start, stop) {
    const candleCollection = this.db.collection(`candles-${period}`);
    return candleCollection.find({pair: pair, timestamp: {$gte: start, $lt: stop}}).sort('timestamp', 'asc').toArray();
  }

  /**
   * Returns the latest limit candles, ordered by timestamp
   * @param  {String} period 1m, 5m, ...
   * @param  {String} pair   the trading pair
   * @param  {Integer} start  first timestamp (included)
   * @param  {Integer} stop   last timestamp (excluded)
   * @return {Promise<Array[Candle]>}        promise with an array of candles
   */
  getLatestCandles(period, pair, limit) {
    const candleCollection = this.db.collection(`candles-${period}`);
    return candleCollection.find({pair: pair}).limit(limit).sort('timestamp', 'desc').toArray().then(data => {
      return data.reverse();
    });
  }

  deposit(player, item, quantity) {
    const vaultCollection = this.db.collection('vault');
    return vaultCollection.update({
      player: player,
      item: item
    }, {
      $inc: { quantity: quantity }
    }, {
      upsert: true
    }).then(result => {
      logger.debug(`${logName} updated player ${player} vault with item=${item} quantity=${quantity}`);
    }).catch(err => {
      logger.debug(`${logName} error while updating player vault: ${err}`);
    });
  }

  withdraw(player, item, quantity) {
    const vaultCollection = this.db.collection('vault');
    return vaultCollection.update({
      player: player,
      item: item
    }, {
      $inc: { quantity: -quantity }
    }, {
      upsert: false
    }).then(result => {
      vaultCollection.remove({ quantity: { $lte: 0 } });
      logger.debug(`${logName} updated player ${player} vault with item=${item} quantity=-${quantity}`);
    }).catch(err => {
      logger.debug(`${logName} error while updating player vault: ${err}`);
    });
  }

  listItems(player) {
    const vaultCollection = this.db.collection('vault');
    return vaultCollection.aggregate([{
      $match: {
        player: player
      }
    },{
      $lookup: {
         from: "items",
         localField: "item",
         foreignField: "_id",
         as: "fromItems"
       }
    },{
      $replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$fromItems", 0 ] }, "$$ROOT" ] } }
    },{
      $project: { fromItems: 0 }
    }]).toArray();
  }

  getSellOrders(item, limit, skip) {
    const sellOrdersCollection = this.db.collection('sell-orders');
    return sellOrdersCollection.find({item: item}).limit(limit).skip(skip).sort([['price', 'asc'],['timestamp','asc']]).toArray();
  }

  newSellOrder(player, item, quantity, price) {
    const sellOrdersCollection = this.db.collection('sell-orders');
    return sellOrdersCollection.insertOne({
      player,
      item,
      quantity,
      price
    }).then(result => {
      logger.debug(`${logName} inserted a sell order with id=${result.insertedId}`);
      return result;
    }).catch(err => {
      logger.debug(`${logName} error while inserting a sell order: ${err}`);
    });
  }

  removeSellOrder(id) {
    const sellOrdersCollection = this.db.collection('sell-orders');
    return sellOrdersCollection.remove({_id: id});
  }

  updateSellOrder(id, quantity) {
    const sellOrdersCollection = this.db.collection('sell-orders');
    return sellOrdersCollection.update({
      _id: id
    }, {
      $set: { quantity: quantity }
    }, {
      upsert: false
    }).then(result => {
      logger.debug(`${logName} updated sell order ${id} with quantity=${quantity}`);
    }).catch(err => {
      logger.debug(`${logName} error while updating sell order: ${err}`);
    });
  }

  getBuyOrders(item, limit, skip) {
    const buyOrdersCollection = this.db.collection('buy-orders');
    return buyOrdersCollection.find({item: item}).limit(limit).skip(skip).sort([['price', 'desc'],['timestamp','asc']]).toArray();
  }

  newBuyOrder(player, item, quantity, price) {
    const buyOrdersCollection = this.db.collection('buy-orders');
    return buyOrdersCollection.insertOne({
      player,
      item,
      quantity,
      price
    }).then(result => {
      logger.debug(`${logName} inserted a buy order with id=${result.insertedId}`);
      return result;
    }).catch(err => {
      logger.debug(`${logName} error while inserting a buy order: ${err}`);
    });
  }

  removeBuyOrder(id) {
    const buyOrdersCollection = this.db.collection('buy-orders');
    return buyOrdersCollection.remove({_id: id});
  }

  updateBuyOrder(id, quantity) {
    const buyOrdersCollection = this.db.collection('buy-orders');
    return buyOrdersCollection.update({
      _id: id
    }, {
      $set: { quantity: quantity }
    }, {
      upsert: false
    }).then(result => {
      logger.debug(`${logName} updated buy order ${id} with quantity=${quantity}`);
    }).catch(err => {
      logger.debug(`${logName} error while updating buy order: ${err}`);
    });
  }

  getPlayer(uuid) {
    const playersCollection = this.db.collection('players');
    return playersCollection.find({uuid: uuid}).limit(1).toArray();
  }

  getPlayerByCode(code) {
    const playersCollection = this.db.collection('players');
    return playersCollection.find({code: code}).limit(1).toArray();
  }

  getPlayerByEmail(email) {
    const playersCollection = this.db.collection('players');
    return playersCollection.find({email: email}).limit(1).toArray();
  }

  createPlayer(uuid, code, expires) {
    const playersCollection = this.db.collection('players');
    return playersCollection.update({
      uuid: uuid
    }, {
      $set: {
        code: code,
        expires: expires,
      }
    }, {
      upsert: true
    });
  }

  updatePlayer(id, update) {
    const playersCollection = this.db.collection('players');
    return playersCollection.update({
      _id: id
    }, {
      $set: update
    }, {
      upsert: false
    });
  }

  getActiveCodes() {
    const playersCollection = this.db.collection('players');
    return playersCollection.find({expires: { $gt: Date.now()}}).toArray();
  }

  updateItem(hash, stack, maxDurability, moj, item) {
    let [ mc, slug ] = item.id.split(':');
    if (maxDurability == 0 && item.Damage > 0) {
      slug = slug + ':' + item.Damage;
    } else {
      slug = slug + ':0';
    }
    const itemsCollection = this.db.collection('items');
    return itemsCollection.update({
      hash: hash
    }, {
      $set: {
        stack: stack,
        moj: moj,
        slug: slug
      }
    }, {
      upsert: true
    });
  }

  getItemByHash(hash) {
    const itemsCollection = this.db.collection('items');
    return itemsCollection.find({hash: hash}).limit(1).toArray();
  }

  getItemById(id) {
    const itemsCollection = this.db.collection('items');
    return itemsCollection.find({_id: id}).limit(1).toArray();
  }

  getItemBySlug(slug, meta) {
    const itemsCollection = this.db.collection('items');
    return itemsCollection.find({slug: `${slug}:${meta}`}).limit(1).toArray();
  }

  drop() {
    return this.db.dropDatabase();
  }

}

const DB = new Database();
module.exports = DB;
