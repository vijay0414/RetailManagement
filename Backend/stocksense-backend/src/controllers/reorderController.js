const ReorderRequest = require('../models/ReorderRequest');
const Product = require('../models/Product');

/**
 * POST /api/reorders  (manager only)
 * Places a reorder for a given product.
 * Body: { productId, quantity, supplierName }
 */
const placeReorder = async (req, res, next) => {
  try {
    const { productId, quantity, supplierName } = req.body;

    if (!productId || !quantity || !supplierName) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'productId, quantity, and supplierName are required.',
      });
    }

    if (isNaN(quantity) || Number(quantity) < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Quantity must be a positive number.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found.',
      });
    }

    const reorder = await ReorderRequest.create({
      productId,
      quantity: Number(quantity),
      supplierName: supplierName.trim(),
      status: 'placed',
      requestedBy: req.user._id,
    });

    const populated = await ReorderRequest.findById(reorder._id)
      .populate('productId', 'name barcode category')
      .populate('requestedBy', 'username employeeId');

    res.status(201).json({
      success: true,
      message: 'Reorder placed successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reorders  (manager only)
 * Returns full reorder history, newest first.
 */
const getReorders = async (req, res, next) => {
  try {
    const filter = {};

    // Optional status filter: ?status=placed or ?status=received
    if (req.query.status && ['placed', 'received'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const reorders = await ReorderRequest.find(filter)
      .populate('productId', 'name barcode category supplierName')
      .populate('requestedBy', 'username employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Reorder history retrieved.',
      data: reorders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reorders/:id/receive  (manager only)
 * Marks a reorder as received and increments product stock.
 */
const markReorderReceived = async (req, res, next) => {
  try {
    const reorder = await ReorderRequest.findById(req.params.id);

    if (!reorder) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Reorder request not found.',
      });
    }

    if (reorder.status === 'received') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'This reorder has already been marked as received.',
      });
    }

    reorder.status = 'received';
    await reorder.save();

    // Increment product quantity
    await Product.findByIdAndUpdate(reorder.productId, {
      $inc: { quantity: reorder.quantity },
    });

    const populated = await ReorderRequest.findById(reorder._id)
      .populate('productId', 'name barcode category quantity')
      .populate('requestedBy', 'username employeeId');

    res.status(200).json({
      success: true,
      message: 'Reorder marked as received and stock updated.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { placeReorder, getReorders, markReorderReceived };
