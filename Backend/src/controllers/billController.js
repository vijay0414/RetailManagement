const Bill = require('../models/Bill');
const { validateStock, deductStock } = require('../services/stockService');
const { sendCustomerBillEmail } = require('../services/emailService');
const { STORE_NAME } = require('../config/env');

/**
 * Generates an invoice number: INV-<YYYYMMDD>-<random4digits>
 */
const generateInvoiceNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}-${rand}`;
};

/**
 * POST /api/bills  (biller only)
 * Body: { items: [{ productId, qty }], customerEmail? }
 *
 * Flow: validate stock → deduct stock (may create StockAlerts + send low-stock emails)
 *       → save bill → optionally email invoice to customer
 */
const createBill = async (req, res, next) => {
  try {
    const { items, customerEmail } = req.body;

    // ── Validate items array ──────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'items array is required and must not be empty.',
      });
    }

    for (const [idx, item] of items.entries()) {
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Item at index ${idx} is missing productId.`,
        });
      }
      if (!item.qty || isNaN(item.qty) || Number(item.qty) < 1) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Item at index ${idx} must have a qty of at least 1.`,
        });
      }
    }

    const normalizedItems = items.map((i) => ({
      productId: i.productId,
      qty: Number(i.qty),
    }));

    // ── Step 1: Validate all stock (fails fast, touches nothing) ──────────────
    let resolvedItems;
    try {
      resolvedItems = await validateStock(normalizedItems);
    } catch (stockErr) {
      return res.status(stockErr.status || 400).json({
        success: false,
        error: 'Stock Error',
        message: stockErr.message,
      });
    }

    // ── Step 2: Build bill items with price + costPrice snapshots ─────────────
    const billItems = resolvedItems.map(({ product, qty }) => ({
      productId: product._id,
      name:      product.name,
      qty,
      price:     product.price,
      costPrice: product.costPrice || 0,   // snapshot for profit tracking
      subtotal:  parseFloat((product.price * qty).toFixed(2)),
    }));

    const total = parseFloat(
      billItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
    );

    // ── Step 3: Unique invoice number ─────────────────────────────────────────
    let invoiceNumber;
    let attempts = 0;
    do {
      invoiceNumber = generateInvoiceNumber();
      attempts++;
    } while ((await Bill.findOne({ invoiceNumber })) && attempts < 10);

    // ── Step 4: Deduct stock (creates StockAlerts + sends low-stock emails) ───
    await deductStock(resolvedItems);

    // ── Step 5: Save bill ─────────────────────────────────────────────────────
    const bill = await Bill.create({
      invoiceNumber,
      items:         billItems,
      total,
      billedBy:      req.user._id,
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : '',
    });

    const populatedBill = await Bill.findById(bill._id)
      .populate('billedBy', 'username employeeId role');

    // ── Step 6: Email invoice to customer (non-blocking) ─────────────────────
    let emailSent = false;
    if (customerEmail && customerEmail.trim()) {
      try {
        await sendCustomerBillEmail({
          customerEmail:  customerEmail.trim(),
          invoiceNumber,
          items:          billItems,
          total,
          createdAt:      bill.createdAt,
          storeName:      STORE_NAME,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('❌ Customer bill email failed:', emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Bill created successfully.',
      emailSent,
      data: populatedBill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bills  (both roles)
 * Manager sees all; Biller sees only their own.
 */
const getAllBills = async (req, res, next) => {
  try {
    const filter = req.user.role === 'biller' ? { billedBy: req.user._id } : {};

    const bills = await Bill.find(filter)
      .populate('billedBy', 'username employeeId role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Bills retrieved successfully.',
      data: bills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bills/:id
 */
const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('billedBy', 'username employeeId role');

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Bill not found.',
      });
    }

    if (
      req.user.role === 'biller' &&
      bill.billedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this bill.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill retrieved successfully.',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBill, getAllBills, getBillById };
