const express = require('express');
const router = express.Router();
const { getTodayRevenue, getProfitSummary } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All report routes are manager-only

// GET /api/reports/today-revenue
router.get('/today-revenue', protect, requireRole('manager'), getTodayRevenue);

// GET /api/reports/profit-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/profit-summary', protect, requireRole('manager'), getProfitSummary);

module.exports = router;
