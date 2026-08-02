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

    // Find user by employeeId OR username (case-insensitive for both)
    // This lets users log in with either "EMP001" or "manager" style input
    const user = await User.findOne({
      $or: [
        { employeeId: employeeId.toUpperCase() },
        { username: { $regex: `^${employeeId.trim()}$`, $options: 'i' } },
      ],
    }).select('+password');

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

const register = async (req, res, next) => {
  try {
    const { username, employeeId, password, role, contactNumber } = req.body;

    // Input validation
    if (!username || !employeeId || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Username, Employee ID, password, and role are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters.',
      });
    }

    if (role !== 'manager' && role !== 'biller') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Role must be either manager or biller.',
      });
    }

    // Check for duplicate employee ID
    const existing = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Employee ID',
        message: `Employee ID "${employeeId.toUpperCase()}" is already in use.`,
      });
    }

    // Create user
    const user = await User.create({
      username: username.trim(),
      employeeId: employeeId.trim().toUpperCase(),
      password, // hashed by User model pre-save hook
      role,
      contactNumber: role === 'manager' ? (contactNumber || '').trim() : '',
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
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

module.exports = { login, register, getMe };
