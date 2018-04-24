const EventEmitter = require('events');
const DB = require('../db');
const logger = require('../logger');
const Config = require('../config');

const logName = '[OrderBook]';

class OrderBook extends EventEmitter {
  constructor() {
    super();
  }

  buyOrder(player, item, quantity, price) {
    DB.getSellOrders(item, 10, 0).then((orders) => {
      for (let i=0; i<orders.length && quantity > 0; i++) {
        let order = orders[i];
        if (order.price <= price) {
          if (order.quantity <= quantity) {
            quantity -= order.quantity;
            DB.removeSellOrder(order._id).then(() => {
              this.emit('sell-order-removed', order.item, order._id);
              this.emit('transaction', {
                from: player,
                to: order.player,
                price: price,
                quantity: order.quantity,
                for: item
              });
            });
          } else {
            const q = quantity;
            DB.updateSellOrder(order._id, order.quantity - quantity).then(() => {
              this.emit('sell-order-updated', order.item, order._id, order.quantity - quantity);
              this.emit('transaction', {
                from: player,
                to: order.player,
                price: price,
                quantity: q,
                for: item
              });
            });
            quantity = 0;
          }
        } else {
          DB.newBuyOrder(player, item, quantity, price).then((result) => {
            this.emit('buy-order-new', item, result.insertedId, player, quantity, price);
          });
          return;
        }
      }
      if (quantity > 0) {
        if (orders.length > 0) {
          this.buyOrder(player, item, quantity, price);
        } else {
          DB.newBuyOrder(player, item, quantity, price).then((result) => {
            this.emit('buy-order-new', item, result.insertedId, player, quantity, price);
          });
        }
      }
    });
  }

  sellOrder(player, item, quantity, price) {
    DB.getBuyOrders(item, 10, 0).then((orders) => {
      for (let i=0; i<orders.length && quantity > 0; i++) {
        let order = orders[i];
        if (order.price >= price) {
          if (order.quantity <= quantity) {
            quantity -= order.quantity;
            DB.removeBuyOrder(order._id).then(() => {
              this.emit('buy-order-removed', order.item, order._id);
              this.emit('transaction', {
                from: order.player,
                to: player,
                price: price,
                quantity: order.quantity,
                for: item
              });
            });
          } else {
            DB.updateBuyOrder(order._id, order.quantity - quantity).then(() => {
              this.emit('buy-order-updated', order.item, order._id, order.quantity - quantity);
              this.emit('transaction', {
                from: order.player,
                to: player,
                price: price,
                quantity: quantity,
                for: item
              });
            });
            quantity = 0;
          }
        } else {
          DB.newSellOrder(player, item, quantity, price).then((result) => {
            this.emit('sell-order-new', item, result.insertedId, player, quantity, price);
          });
          return;
        }
      }
      if (quantity > 0) {
        if (orders.length > 0) {
          this.sellOrder(player, item, quantity, price);
        } else {
          DB.newSellOrder(player, item, quantity, price).then((result) => {
            this.emit('sell-order-new', item, result.insertedId, player, quantity, price);
          });
        }
      }
    });
  }
}

const orderBook = new OrderBook()
module.exports = orderBook;
