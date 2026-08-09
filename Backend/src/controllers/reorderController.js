const ReorderRequest = require('../models/ReorderRequest');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendSupplierReorderEmail } = require('../services/emailService');
const { STORE_NAME } = require('../config/env');

/**
 * POST /api/reorders  (manager only)
 * Body: { productId, quantity, expectedDeliveryDate, managerFeedback? }
 *
 * - Snapshots supplierName, supplierEmail from product
 * - Fetches manager name + contactNumber from User model
 * - Sends formatted reorder email to supplier
 * - Response: { success, data, emailSent }
 */
const placeReorder = async (req, res, next) => {
  try {
    const { productId, quantity, expectedDeliveryDate, managerFeedback } = req.body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!productId || !quantity || !expectedDeliveryDate) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'productId, quantity, and expectedDeliveryDate are required.',
      });
    }

    if (isNaN(quantity) || Number(quantity) < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Quantity must be a positive number.',
      });
    }

    const deliveryDate = new Date(expectedDeliveryDate);
    if (isNaN(deliveryDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'expectedDeliveryDate must be a valid date (ISO 8601 or YYYY-MM-DD).',
      });
    }

    // ── Fetch product ─────────────────────────────────────────────────────
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found.',
      });
    }

    // ── Fetch manager details (name + contact) ────────────────────────────
    // req.user is populated by authMiddleware but doesn't include contactNumber,
    // so we do a fresh DB lookup to get the latest contactNumber.
    const manager = await User.findById(req.user._id);
    const managerName = manager?.username || req.user.username || 'Manager';
    const managerContact = manager?.contactNumber || '';
    const managerEmail = manager?.email || req.user.email || 'noreply@stocksense.com';

    // ── Create ReorderRequest ─────────────────────────────────────────────
    const reorder = await ReorderRequest.create({
      productId,
      quantity: Number(quantity),
      supplierName: product.supplierName,
      supplierEmail: product.supplierEmail || '',
      expectedDeliveryDate: deliveryDate,
      managerFeedback: managerFeedback ? managerFeedback.trim() : '',
      managerName,
      managerContact,
      status: 'placed',
      requestedBy: req.user._id,
    });

    const populated = await ReorderRequest.findById(reorder._id)
      .populate('productId', 'name barcode category supplierName supplierEmail')
      .populate('requestedBy', 'username employeeId contactNumber');

    // ── Send reorder email to supplier ─────────────────────
    let emailSent = false;
    if (product.supplierEmail) {
      try {
        await sendSupplierReorderEmail({
          supplierEmail: product.supplierEmail,
          supplierName: product.supplierName,
          shopName: STORE_NAME,
          productName: product.name,
          quantity: Number(quantity),
          expectedDeliveryDate: deliveryDate,
          managerName,
          managerEmail,
          managerContact,
          managerFeedback: managerFeedback || '',
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('❌ Reorder email failed:', emailErr.message);
      }
    } else {
      console.log(`ℹ️  No supplierEmail for "${product.name}" — reorder email skipped.`);
    }

    res.status(201).json({
      success: true,
      message: 'Reorder placed successfully.',
      emailSent,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reorders  (manager only)
 * Optional ?status=placed|received
 */
const getReorders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && ['placed', 'received'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const reorders = await ReorderRequest.find(filter)
      .populate('productId', 'name barcode category supplierName supplierEmail')
      .populate('requestedBy', 'username employeeId contactNumber')
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
