const rateLimit = require('express-rate-limit');

/**
 * Auth rate limiter — protects /api/auth/login and /api/auth/register
 * against brute-force and credential-stuffing attacks.
 * Allows 10 attempts per IP per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 10,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many attempts from this IP. Please try again after 1 minute.',
  },
  skipSuccessfulRequests: true, // Only count failed requests against the limit
});

/**
 * General API limiter — prevents abuse on all other endpoints.
 * Allows 200 requests per IP per minute.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many requests from this IP. Please slow down.',
  },
});

module.exports = { authLimiter, apiLimiter };
