const DB = require('../../db');
const express = require('express');
const router = express.Router();

router.get('/:pair/:period/:start-:stop', function (req, res) {
  const {pair, period} = req.params;
  const start = parseInt(req.params.start);
  const stop = parseInt(req.params.stop);

  DB.getCandles(period, pair, start, stop).then(data => {
    res.json({data: data});
  });
})

router.get('/:pair/:period/latest/:limit', function (req, res) {
  const {pair, period} = req.params;
  const limit = parseInt(req.params.limit);

  DB.getLatestCandles(period, pair, limit).then(data => {
    res.json(data);
  });
})

module.exports = router;
