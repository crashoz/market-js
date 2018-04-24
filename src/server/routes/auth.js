const DB = require('../../db');
const express = require('express');
const Account = require('../../account');
const router = express.Router();

router.post('/register', function (req, res) {
  const {email, password, code} = req.body;

  Account.createAccount(email, password, code).then((status) => {
      if (status.success) {
        req.session.uuid = status.success;
        res.status(200).json(status);
      } else {
        res.status(401).json(status);
      }
  }).catch((error) => {
    res.status(500).json({error: error})
  });
});

router.post('/login', function(req, res) {
  const {email, password} = req.body;

  Account.login(email, password).then((status) => {
    if (status.success) {
      req.session.uuid = status.success;
      res.status(200).json(status);
    } else {
      res.status(401).json(status);
    }
  }).catch((error) => {
    res.status(500).json({error: error});
  });
});

router.post('/logout', function (req, res) {
  if (req.session) {
    req.session.destroy();
  }
  res.status(200).json('logged-out');
});

router.post('/check', function (req, res) {
  if (req.session.uuid) {
    res.status(200).json({uuid: req.session.uuid});
    return;
  }
  res.status(401).json('logged-out');
});

module.exports = router;
