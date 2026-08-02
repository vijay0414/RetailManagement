const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * POST /api/auth/login
 * Body: { employeeId, password }
 * Returns: { token, role, name }
 */
const login = async (req, res, next) => {
  try {
    const { employeeId, password } = req.body;

    // Input validation
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Employee ID and password are required.',
      });
    }

    // Find user — explicitly select password since it's excluded by default
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid employee ID or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid employee ID or password.',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        role: user.role,
        name: user.username,
        employeeId: user.employeeId,
        userId: user._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's info.
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user; // populated by authMiddleware

    res.status(200).json({
      success: true,
      message: 'User profile retrieved.',
      data: {
        userId: user._id,
        username: user.username,
        employeeId: user.employeeId,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe };
