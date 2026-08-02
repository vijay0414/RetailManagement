const User = require('../models/User');

/**
 * POST /api/users/billers  (manager only)
 * Creates a new biller account.
 * Body: { username, employeeId, password }
 */
const createBiller = async (req, res, next) => {
  try {
    const { username, employeeId, password } = req.body;

    if (!username || !employeeId || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'username, employeeId, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters.',
      });
    }

    // employeeId uniqueness check with a friendly error
    const existing = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Employee ID',
        message: `Employee ID "${employeeId.toUpperCase()}" is already in use.`,
      });
    }

    const biller = await User.create({
      username:   username.trim(),
      employeeId: employeeId.trim().toUpperCase(),
      password,                 // hashed by pre-save hook in User model
      role:       'biller',
    });

    res.status(201).json({
      success: true,
      message: `Biller account created for ${biller.username} (${biller.employeeId}).`,
      data: {
        userId:     biller._id,
        username:   biller.username,
        employeeId: biller.employeeId,
        role:       biller.role,
        createdAt:  biller.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/billers  (manager only)
 * Returns all biller accounts (never returns password).
 */
const getAllBillers = async (req, res, next) => {
  try {
    const billers = await User.find({ role: 'biller' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Billers retrieved successfully.',
      data: billers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBiller, getAllBillers };
