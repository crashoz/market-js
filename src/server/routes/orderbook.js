const DB = require('../../db');
const orderBook = require('../../market/orderbook')
const express = require('express');
const router = express.Router();

router.post('/get', function (req, res) {
  if (!req.body.item) {
    res.status(400).json({error: 'bad-request'});
    return;
  }

  promises = [];
  promises.push(DB.getSellOrders(req.body.item,16,0));
  promises.push(DB.getBuyOrders(req.body.item,16,0))

  return Promise.all(promises).then((results) => {
    res.status(200).json(results);
    return;
  }).catch((error) => {
    res.status(500).json(error);
    return;
  });
});

router.post('/buy', function(req, res) {
  if (!req.session.uuid) {
    res.status(401).json({error: 'not-logged-in'});
    return;
  }
  if (!req.body.item || !req.body.quantity || !req.body.price) {
    res.status(400).json({error: 'bad-request'});
    return;
  }

  orderBook.buyOrder(req.session.uuid, req.body.item, req.body.quantity, req.body.price);

  res.status(200).json({success: 'order-placed'});
});

router.post('/sell', function(req, res) {
  if (!req.session.uuid) {
    res.status(401).json({error: 'not-logged-in'});
    return;
  }
  if (!req.body.item || !req.body.quantity || !req.body.price) {
    res.status(400).json({error: 'bad-request'});
    return;
  }

  orderBook.sellOrder(req.session.uuid, req.body.item, req.body.quantity, req.body.price);

  res.status(200).json({success: 'order-placed'});
});

module.exports = router;
