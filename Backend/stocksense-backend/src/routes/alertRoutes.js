const express = require('express');
const router = express.Router();
const { getPendingAlerts, getAllAlerts, informAlert, dismissAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All alert routes are manager-only

// GET /api/alerts/pending  — polled by manager frontend for real-time popup
router.get('/pending', protect, requireRole('manager'), getPendingAlerts);

// GET /api/alerts  — all alerts with optional ?status= filter
router.get('/', protect, requireRole('manager'), getAllAlerts);

// PATCH /api/alerts/:id/inform  — notify supplier + mark informed
router.patch('/:id/inform', protect, requireRole('manager'), informAlert);

// PATCH /api/alerts/:id/dismiss  — dismiss alert
router.patch('/:id/dismiss', protect, requireRole('manager'), dismissAlert);

module.exports = router;
