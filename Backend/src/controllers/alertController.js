const StockAlert = require('../models/StockAlert');
const { notifySupplier } = require('../services/notifyService');

/**
 * GET /api/alerts/pending  (manager only)
 * Returns all StockAlerts with status "pending".
 * Frontend polls this endpoint every few seconds for real-time low-stock popups.
 */
const getPendingAlerts = async (req, res, next) => {
  try {
    const alerts = await StockAlert.find({ status: 'pending' })
      .populate('productId', 'name barcode category reorderThreshold')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Pending alerts retrieved.',
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/alerts  (manager only)
 * Returns all alerts (all statuses). Supports ?status= filter.
 */
const getAllAlerts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status && ['pending', 'informed', 'dismissed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const alerts = await StockAlert.find(filter)
      .populate('productId', 'name barcode category reorderThreshold')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Alerts retrieved.',
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/alerts/:id/inform  (manager only)
 * Calls notifyService to simulate supplier notification, then sets status to "informed".
 */
const informAlert = async (req, res, next) => {
  try {
    const alert = await StockAlert.findById(req.params.id).populate('productId', 'name');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Stock alert not found.',
      });
    }

    if (alert.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Alert is already "${alert.status}". Only pending alerts can be informed.`,
      });
    }

    // Simulate supplier notification
    const notifyResult = notifySupplier({
      supplierName: alert.supplierName,
      supplierContact: alert.supplierContact,
      productName: alert.productId?.name || 'Unknown Product',
      remainingStock: alert.remainingStock,
    });

    alert.status = 'informed';
    await alert.save();

    res.status(200).json({
      success: true,
      message: notifyResult.message,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/alerts/:id/dismiss  (manager only)
 * Sets alert status to "dismissed".
 */
const dismissAlert = async (req, res, next) => {
  try {
    const alert = await StockAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Stock alert not found.',
      });
    }

    if (alert.status === 'dismissed') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Alert is already dismissed.',
      });
    }

    alert.status = 'dismissed';
    await alert.save();

    res.status(200).json({
      success: true,
      message: 'Alert dismissed.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPendingAlerts, getAllAlerts, informAlert, dismissAlert };
