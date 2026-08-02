const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('./env');

/**
 * Reusable Gmail transporter.
 * Uses an App Password (not the account password).
 * Generate one at: https://myaccount.google.com/apppasswords
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    // Gmail App Passwords must have spaces stripped
    pass: EMAIL_PASS ? EMAIL_PASS.replace(/\s/g, '') : '',
  },
});

/**
 * Verify transporter config on startup (non-fatal — just logs a warning).
 * Only runs when EMAIL_USER is configured, so the app still starts without email creds.
 */
if (EMAIL_USER) {
  transporter.verify((err) => {
    if (err) {
      console.warn('  Email transporter verification failed:', err.message);
      console.warn('   → Emails will not be sent until EMAIL_USER / EMAIL_PASS are valid.');
    } else {
      console.log(` Email transporter ready  (${EMAIL_USER})`);
    }
  });
}

module.exports = transporter;
