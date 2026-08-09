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
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
  STORE_NAME: process.env.STORE_NAME || 'StockSense Store',
};
