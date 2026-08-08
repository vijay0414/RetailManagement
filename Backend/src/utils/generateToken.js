const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Generates a signed JWT for the given user.
 * Expires in 7 days — users must re-login after expiry.
 * @param {Object} user - Mongoose User document
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId:     user._id,
      role:       user.role,
      employeeId: user.employeeId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = generateToken;
