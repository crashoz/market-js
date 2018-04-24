const DB = require('../../db');
const express = require('express');
const router = express.Router();

router.get('/get', function (req, res) {
  if (!req.session.uuid) {
    res.status(401).json('not-logged-in');
    return;
  }

  DB.listItems(req.session.uuid).then((data) => {
    res.status(200).json(data);
    return;
  }).catch((error) => {
    res.status(500).json(error);
    return;
  })
});

module.exports = router;
