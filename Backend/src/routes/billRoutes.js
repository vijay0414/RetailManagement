const express = require('express');
const router = express.Router();
const { createBill, getAllBills, getBillById } = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// POST /api/bills  — biller only
router.post('/', protect, requireRole('biller'), createBill);

// GET /api/bills  — both roles (manager sees all, biller sees own)
router.get('/', protect, getAllBills);

// GET /api/bills/:id  — both roles with ownership check inside controller
router.get('/:id', protect, getBillById);

module.exports = router;
