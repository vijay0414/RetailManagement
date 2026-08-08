const express = require('express');
const cors = require('cors');
const { FRONTEND_URL } = require('./config/env');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes    = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const billRoutes    = require('./routes/billRoutes');
const reorderRoutes = require('./routes/reorderRoutes');
const alertRoutes   = require('./routes/alertRoutes');
const userRoutes    = require('./routes/userRoutes');
const reportRoutes  = require('./routes/reportRoutes');

// Middleware imports
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();


const allowedOrigins = FRONTEND_URL
  ? FRONTEND_URL.split(',').map((u) => u.trim())
  : [];

app.use(
  cors({
    origin: allowedOrigins.length
      ? (incomingOrigin, callback) => {
          // Allow requests with no Origin header (e.g. curl, Postman, server-to-server)
          if (!incomingOrigin) return callback(null, true);
          if (allowedOrigins.includes(incomingOrigin)) return callback(null, true);
          callback(new Error(`CORS: origin ${incomingOrigin} not allowed`));
        }
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Root & Health Check ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StockSense API is running.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StockSense API is running.',
    timestamp: new Date().toISOString(),
  });
});

// ─── Email Diagnostics (remove after confirming email works in production) ────
// Hit GET /test-email?to=your@email.com to verify SMTP is working on Render.
app.get('/test-email', async (req, res) => {
  const transporter = require('./config/mailer');
  const { EMAIL_USER } = require('./config/env');
  const to = req.query.to || EMAIL_USER;

  try {
    await transporter.sendMail({
      from: `"StockSense Test" <${EMAIL_USER}>`,
      to,
      subject: 'StockSense — SMTP Test',
      text: `SMTP is working. Sent at ${new Date().toISOString()} from Render.`,
    });
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.code || err.name,
      message: err.message,
      detail: 'Check Render logs for full stack trace.',
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/bills',   apiLimiter, billRoutes);
app.use('/api/reorders', apiLimiter, reorderRoutes);
app.use('/api/alerts',  apiLimiter, alertRoutes);
app.use('/api/users',   apiLimiter, userRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
