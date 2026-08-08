const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('./env');

/**
 * Reusable Gmail transporter.
 *
 * We try port 587 (STARTTLS) first — most reliable on cloud hosts.
 * If SMTP_PORT=465 is set in env, we switch to SSL mode instead.
 *
 * REQUIREMENTS:
 *   1. Gmail 2-Step Verification must be ON.
 *   2. EMAIL_PASS must be a 16-char App Password (NOT your Gmail login password).
 *      Generate one at: https://myaccount.google.com/apppasswords
 *      → Select "Mail" + "Other (Custom name)" → copy the 16-char code.
 *   3. Spaces in the App Password are cosmetic — stripped automatically.
 */
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const useSSL    = SMTP_PORT === 465;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: SMTP_PORT,
  secure: useSSL,          // true for 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS ? EMAIL_PASS.replace(/\s/g, '') : '',
  },
  connectionTimeout: 10000,   // fail fast if the port is blocked (10 s)
  greetingTimeout:   10000,
  socketTimeout:     20000,
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Verify transporter on startup.
 * Non-fatal — the app still runs even if email is broken.
 */
if (EMAIL_USER) {
  transporter.verify((err) => {
    if (err) {
      console.warn(`⚠️  Email transporter FAILED (port ${SMTP_PORT}): ${err.message}`);
      if (err.code === 'EAUTH' || (err.message || '').toLowerCase().includes('invalid login')) {
        console.warn('    → EAUTH: App Password is wrong or expired.');
        console.warn('      Regenerate at: https://myaccount.google.com/apppasswords');
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
        console.warn(`    → Port ${SMTP_PORT} seems blocked. Try setting SMTP_PORT=465 in Render env vars.`);
      }
      console.warn('    Emails will NOT be sent until this is resolved.');
    } else {
      console.log(`✅ Email transporter ready — port ${SMTP_PORT}, sending as ${EMAIL_USER}`);
    }
  });
}

module.exports = transporter;
