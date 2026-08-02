const express = require('express');
const router = express.Router();
const { placeReorder, getReorders, markReorderReceived } = require('../controllers/reorderController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All reorder routes are manager-only

// POST /api/reorders  — place a new reorder
router.post('/', protect, requireRole('manager'), placeReorder);

// GET /api/reorders  — reorder history
router.get('/', protect, requireRole('manager'), getReorders);

// PATCH /api/reorders/:id/receive  — mark a reorder as received
router.patch('/:id/receive', protect, requireRole('manager'), markReorderReceived);

module.exports = router;
