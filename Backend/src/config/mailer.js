const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('./env');

/**
 * Reusable Gmail SMTP transporter.
 *
 * Problem: Render's DNS resolves smtp.gmail.com to an IPv6 address
 * (2404:6800:...) which is unreachable (ENETUNREACH) on Render's network.
 *
 * Fix: Use the stable IPv4 address for Gmail SMTP directly so DNS is
 * bypassed entirely. 74.125.133.108 is one of Google's stable SMTP IPs.
 * We also set the `tls.servername` so TLS certificate validation still
 * matches smtp.gmail.com even though we're connecting by IP.
 */
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const useSSL = SMTP_PORT === 465;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',   // Use standard hostname instead of hardcoded IP
  port: SMTP_PORT,
  secure: useSSL,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS ? EMAIL_PASS.replace(/\s/g, '') : '',
  },
  family: 4, // force IPv4 to prevent ENETUNREACH on IPv6-restricted hosts
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

if (EMAIL_USER) {
  transporter.verify((err) => {
    if (err) {
      console.warn(`⚠️  Email transporter FAILED (port ${SMTP_PORT}): ${err.message}`);
      if (err.code === 'EAUTH' || (err.message || '').toLowerCase().includes('invalid login')) {
        console.warn('    → Wrong App Password. Regenerate at: https://myaccount.google.com/apppasswords');
      } else if (['ETIMEDOUT', 'ECONNREFUSED', 'ESOCKET', 'ENETUNREACH'].includes(err.code)) {
        console.warn(`    → Network blocked or timeout on port ${SMTP_PORT}.`);
      }
    } else {
      console.log(`✅ Email transporter ready — port ${SMTP_PORT}, sending as ${EMAIL_USER}`);
    }
  });
}

module.exports = transporter;
