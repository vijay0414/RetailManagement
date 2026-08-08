const Product = require('../models/Product');
const StockAlert = require('../models/StockAlert');
const { sendLowStockAlertEmail } = require('./emailService');

/**
 * validateStock
 *
 * Checks that all items have sufficient stock WITHOUT touching the DB.
 * This is a pre-flight check only — actual deduction uses atomic operations.
 *
 * @param {Array} items - Array of { productId, qty }
 * @returns {Promise<Array>} Resolved product documents for each item
 */
const validateStock = async (items) => {
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  const productMap = new Map();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const resolvedItems = [];
  for (const item of items) {
    const product = productMap.get(item.productId.toString());

    if (!product) {
      throw { status: 404, message: `Product with ID ${item.productId} not found` };
    }

    if (product.quantity < item.qty) {
      throw {
        status: 400,
        message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.qty}`,
      };
    }

    resolvedItems.push({ product, qty: item.qty });
  }

  return resolvedItems;
};

/**
 * deductStock
 *
 * Atomically deducts stock for each item using findOneAndUpdate with a
 * conditional filter ({ quantity: { $gte: qty } }). This prevents overselling
 * in concurrent billing requests — if two requests race for the last unit,
 * only one will succeed; the other gets null back and we throw a 409.
 *
 * After deduction:
 *   - If new quantity < reorderThreshold AND no pending alert exists: create alert + send email.
 *   - If a pending alert already exists: update its remainingStock count only (no duplicate email).
 *
 * @param {Array} resolvedItems - Array of { product, qty } from validateStock
 * @returns {Promise<void>}
 */
const deductStock = async (resolvedItems) => {
  const updatedProducts = [];

  // ── Atomic per-product deductions ────────────────────────────────────────
  for (const { product, qty } of resolvedItems) {
    // The filter ensures quantity won't go negative AND prevents concurrent oversell.
    // If another request already consumed this stock, findOneAndUpdate returns null.
    const updated = await Product.findOneAndUpdate(
      { _id: product._id, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }              // return the updated document
    );

    if (!updated) {
      // Race condition: stock was consumed between validateStock and deductStock
      throw {
        status: 409,
        message: `Insufficient stock for "${product.name}" — it may have just been sold. Please try again.`,
      };
    }

    updatedProducts.push(updated);
  }

  // ── Threshold alerts ──────────────────────────────────────────────────────
  const itemsBelowThreshold = updatedProducts.filter(
    (p) => p.quantity < p.reorderThreshold
  );

  if (itemsBelowThreshold.length === 0) return;

  const thresholdProductIds = itemsBelowThreshold.map((p) => p._id);

  // Single DB call to get all existing pending alerts for these products
  const existingAlerts = await StockAlert.find({
    productId: { $in: thresholdProductIds },
    status: 'pending',
  });

  const existingAlertsMap = new Map();
  for (const alert of existingAlerts) {
    existingAlertsMap.set(alert.productId.toString(), alert);
  }

  const newAlerts = [];
  const updateAlertOps = [];
  const emailsToSend = [];

  for (const product of itemsBelowThreshold) {
    const existingAlert = existingAlertsMap.get(product._id.toString());

    if (!existingAlert) {
      // First time this product crosses below threshold
      newAlerts.push({
        productId: product._id,
        remainingStock: product.quantity,
        supplierName: product.supplierName,
        supplierContact: product.supplierContact,
        supplierEmail: product.supplierEmail || '',
        status: 'pending',
      });

      console.log(
        `⚠️  Stock Alert created for "${product.name}" — remaining: ${product.quantity}` +
        ` (threshold: ${product.reorderThreshold})`
      );

      if (product.supplierEmail) {
        emailsToSend.push(product);
      } else {
        console.log(`ℹ️  No supplierEmail set for "${product.name}" — skipping low-stock email.`);
      }
    } else {
      // Already have a pending alert — just update the stock count, no duplicate email
      updateAlertOps.push({
        updateOne: {
          filter: { _id: existingAlert._id },
          update: { $set: { remainingStock: product.quantity } },
        },
      });
    }
  }

  if (newAlerts.length > 0)      await StockAlert.insertMany(newAlerts);
  if (updateAlertOps.length > 0) await StockAlert.bulkWrite(updateAlertOps);

  // Send emails non-blocking — email failure must never break billing
  for (const product of emailsToSend) {
    sendLowStockAlertEmail({
      supplierEmail:    product.supplierEmail,
      supplierName:     product.supplierName,
      supplierContact:  product.supplierContact,
      productName:      product.name,
      remainingStock:   product.quantity,
      reorderThreshold: product.reorderThreshold,
    }).catch((emailErr) => {
      console.error(
        `❌ Low-stock alert email failed for "${product.name}":`,
        emailErr.message
      );
    });
  }
};

module.exports = { validateStock, deductStock };
