require('dotenv').config();

module.exports = {
  PORT:         process.env.PORT         || 5000,
  MONGO_URI:    process.env.MONGO_URI    || 'mongodb://localhost:27017/stocksense',
  JWT_SECRET:   process.env.JWT_SECRET   || 'stocksense_fallback_secret',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  EMAIL_USER:   process.env.EMAIL_USER   || 'vijaysusilavkps@gmail.com',
  EMAIL_PASS:   process.env.EMAIL_PASS   || 'zmlv taya ixld widu',
  STORE_NAME:   process.env.STORE_NAME   || 'StockSense Store',
};
