/**
 * Global error handling middleware.
 * Must be registered LAST in app.js after all routes.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message || err);

  // Custom thrown errors with status code
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.error || 'Error',
      message: err.message,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: messages.join('. '),
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      error: 'Duplicate Key Error',
      message: `A record with this ${field} already exists.`,
    });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: `Invalid value for ${err.path}: "${err.value}".`,
    });
  }

  // Default 500
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
};

/**
 * 404 handler for unmatched routes.
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
};

module.exports = { errorHandler, notFound };
