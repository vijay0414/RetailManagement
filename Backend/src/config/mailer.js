const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('./env');

/**
 * Reusable Gmail transporter using explicit SMTP settings.
 *
 * Using explicit host/port/secure instead of service:'gmail' because the
 * shorthand sometimes fails on hosted environments (Render, Railway, etc.)
 * that block port 465. Port 587 with STARTTLS is more reliable in production.
 *
 * Generate an App Password at: https://myaccount.google.com/apppasswords
 * (Gmail 2-Step Verification must be ON; use the App Password, not your account password)
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,      // STARTTLS — upgrades the connection after handshake
  auth: {
    user: EMAIL_USER,
    // Strip any spaces from the App Password (Google sometimes includes them in the UI display)
    pass: EMAIL_PASS ? EMAIL_PASS.replace(/\s/g, '') : '',
  },
  tls: {
    // Do not fail on invalid self-signed certs
    rejectUnauthorized: false,
  },
});

/**
 * Verify transporter config on startup (non-fatal — just logs a warning).
 * Only runs when EMAIL_USER is configured so the app still starts without email creds.
 */
if (EMAIL_USER) {
  transporter.verify((err) => {
    if (err) {
      console.warn('⚠️  Email transporter verification failed:', err.message);
      console.warn('    → Emails will not be sent until EMAIL_USER / EMAIL_PASS are valid.');
      console.warn('    → Ensure you are using a Gmail App Password (not your account password).');
      console.warn('    → Generate one at: https://myaccount.google.com/apppasswords');
    } else {
      console.log(`✅ Email transporter ready (${EMAIL_USER})`);
    }
  });
}

module.exports = transporter;
