const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductByBarcode,
  getLowStockProducts,
  updateProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// IMPORTANT: specific path routes must come before :id / :param routes

// GET /api/products/low-stock  — manager only
router.get('/low-stock', protect, requireRole('manager'), getLowStockProducts);

// GET /api/products/barcode/:code  — both roles (biller uses this on scan)
router.get('/barcode/:code', protect, getProductByBarcode);

// GET /api/products  — both roles
router.get('/', protect, getAllProducts);

// POST /api/products  — manager only
router.post('/', protect, requireRole('manager'), createProduct);

// PUT /api/products/:id  — manager only
router.put('/:id', protect, requireRole('manager'), updateProduct);

module.exports = router;
