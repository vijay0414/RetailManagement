require('dotenv').config();

const requireEnv = (name, fallback) => {
  if (process.env[name]) return process.env[name];
  if (fallback !== undefined) return fallback;

  console.error(`❌ CRITICAL: Missing required environment variable: ${name}`);
  process.exit(1);
};

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: requireEnv('MONGO_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  FRONTEND_URL: requireEnv('FRONTEND_URL'),
  EMAIL_USER: requireEnv('EMAIL_USER'),
  EMAIL_PASS: requireEnv('EMAIL_PASS'),
  STORE_NAME: process.env.STORE_NAME || 'StockSense Store',
};
