const express = require('express');
const cors = require('cors');
const { FRONTEND_URL } = require('./config/env');

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

// ─── CORS ─────────────────────────────────────────────────────────────────────
// FRONTEND_URL may be a comma-separated list of allowed origins (e.g. Vercel
// preview URLs + production URL). Falls back to allowing all origins only if
// the env var is missing — avoids "Failed to fetch" after first deploy.
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

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills',   billRoutes);
app.use('/api/reorders', reorderRoutes);
app.use('/api/alerts',  alertRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/reports', reportRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
