const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Generates a signed JWT for the given user.
 * No expiry — token is valid until the user logs out or the secret rotates.
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
    JWT_SECRET
  );
};

module.exports = generateToken;
