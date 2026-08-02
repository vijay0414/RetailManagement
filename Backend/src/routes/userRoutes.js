const express = require('express');
const router = express.Router();
const { createBiller, getAllBillers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All user-management routes are manager-only

// POST /api/users/billers  — create a new biller account
router.post('/billers', protect, requireRole('manager'), createBiller);

// GET  /api/users/billers  — list all biller accounts
router.get('/billers', protect, requireRole('manager'), getAllBillers);

module.exports = router;
