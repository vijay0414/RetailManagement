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
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'StockSense <onboarding@resend.dev>',
  STORE_NAME: process.env.STORE_NAME || 'StockSense Store',
};
