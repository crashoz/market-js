const logger = require('../logger');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser')
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');

const candlesRoute = require('./routes/candles');
const authRoute = require('./routes/auth');
const vaultRoute = require('./routes/vault');
const orderbookRoute = require('./routes/orderbook');

const logName = '[Server]';

class App {
  constructor() {
    this.app = express();
  }

  start(port) {
    this.app.use(function requestLog (req, res, next) {
      logger.debug(`${logName} ${req.method} ${req.originalUrl}`);
      next()
    });

    this.app.use(cors({
      origin: 'http://localhost:3000',
      optionsSuccessStatus: 200,
      credentials: true
    }));
    this.app.options('*', cors());

    this.app.use(session({
      secret: 'chameau46',
      store: new MongoStore({url: 'mongodb://localhost/market-js'}),
      resave: true,
      saveUninitialized: false,
      cookie: {
        httpOnly: false,
        secure: false,
      }
    }));

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));

    this.app.use('/auth', authRoute);
    this.app.use('/vault', vaultRoute);
    this.app.use('/orderbook', orderbookRoute);
    this.app.use('/api/candles', candlesRoute);

    this.server = this.app.listen(port, () => logger.info(`${logName} listening on port ${port}`));
  }

  stop() {
    this.server.close();
  }
}

module.exports = App;
