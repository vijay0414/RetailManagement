/**
 * Role-based access control middleware.
 * Must be used AFTER the protect middleware so req.user is populated.
 *
 * Usage: router.post('/route', protect, requireRole('manager'), controller)
 *
 * @param {...string} roles - Allowed roles (e.g. 'manager', 'biller')
 * @returns Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

module.exports = { requireRole };
