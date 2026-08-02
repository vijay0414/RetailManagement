require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/stocksense',
  JWT_SECRET: process.env.JWT_SECRET || 'stocksense_default_secret',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
