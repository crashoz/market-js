const Promise = require('bluebird');
const crypto = require('crypto');
const logger = require('./logger');
const DB = require('./db');

const createAccount = function(email, password, code) {
  return DB.getPlayerByCode(code).then((result) => {
    if (result.length == 0) {
      return {err: 'unknown-code'};
    } else {
      const player = result[0];
      if (Date.now() < player.expires) {
        return DB.getPlayerByEmail(email).then((result) => {
          if (result.length != 0) {
            return {err: 'email-used'};
          } else {
            const hash = crypto.createHash('sha256');
            hash.update(password);

            return DB.updatePlayer(player._id, {email: email, hpwd: hash.digest('hex')}).then(() => {
              return {success: player.uuid};
            });
          }
        });
      } else {
        return {err: 'code-expired'};
      }
    }
  });
}

const login = function(email, password) {
  return DB.getPlayerByEmail(email).then((result) => {
    if (result.length == 0) {
      return {err: 'unknown-user'};
    } else {
      const player = result[0];
      const hash = crypto.createHash('sha256');
      hash.update(password);
      const hpwd = hash.digest('hex');

      if (player.hpwd == hpwd) {
        return {success: player.uuid};
      } else {
        return {err: 'wrong-password'};
      }
    }
  });
}

const getVault = function(uuid) {
  return DB.getPlayer(uuid).then((result) => {
    if (result.length == 0) {
      return {err: 'unknown-user'};
    } else {
      return DB.listItems(uuid)
    }
  })
}

module.exports = {
  createAccount,
  login,
  getVault,
};
