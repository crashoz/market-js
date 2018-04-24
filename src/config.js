const config = {
  "db": {
    "url": "mongodb://localhost:27017/market-js",
    "testurl": "mongodb://localhost:27017/market-js-test"
  },
  "periods": {
    "1m": 60000,
    "5m": 300000,
    "15m": 900000,
    "30m": 1800000,
    "1h": 3600000
  },
  "test": process.env.NODE_ENV == "test",
  "dev": process.env.NODE_ENV == "development",
  "prod": process.env.NODE_ENV == "production"
};

module.exports = config;
