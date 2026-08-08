const Product = require('../models/Product');
const StockAlert = require('../models/StockAlert');
const { sendLowStockAlertEmail } = require('./emailService');

/**
 * Validates stock availability for all items in a bill.
 * Throws an error if any product has insufficient stock.
 * @param {Array} items - Array of { productId, qty }
 * @returns {Promise<Array>} Resolved product documents for each item
 */
const validateStock = async (items) => {
  const resolvedItems = [];
  const productIds = items.map(item => item.productId);

  // Single DB call to fetch all products
  const products = await Product.find({ _id: { $in: productIds } });

  // Map for fast lookups
  const productMap = new Map();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

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
 * Deducts stock for each item after a bill is validated.
 *
 * For each product:
 *   1. Decrement quantity.
 *   2. If new quantity < reorderThreshold AND no pending alert exists yet:
 *      a. Create a StockAlert document.
 *      b. Send a low-stock heads-up email to the supplier (non-blocking).
 *   3. If a pending alert already exists, just update its remainingStock count
 *      (no duplicate email).
 *
 * @param {Array} resolvedItems - Array of { product, qty } from validateStock
 * @returns {Promise<void>}
 */
const deductStock = async (resolvedItems) => {
  const bulkOps = [];
  const itemsBelowThreshold = [];

  for (const { product, qty } of resolvedItems) {
    const newQuantity = product.quantity - qty;

    // Add to bulk update operations
    bulkOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { quantity: newQuantity } }
      }
    });

    if (newQuantity < product.reorderThreshold) {
      itemsBelowThreshold.push({ product, newQuantity });
    }
  }

  // Execute all stock deductions in one batch
  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  // Process threshold alerts if needed
  if (itemsBelowThreshold.length > 0) {
    const thresholdProductIds = itemsBelowThreshold.map(i => i.product._id);

    // Single DB call to get all existing pending alerts
    const existingAlerts = await StockAlert.find({
      productId: { $in: thresholdProductIds },
      status: 'pending'
    });

    const existingAlertsMap = new Map();
    for (const alert of existingAlerts) {
      existingAlertsMap.set(alert.productId.toString(), alert);
    }

    const newAlerts = [];
    const updateAlerts = [];
    const emailsToSend = [];

    for (const { product, newQuantity } of itemsBelowThreshold) {
      const existingAlert = existingAlertsMap.get(product._id.toString());

      if (!existingAlert) {
        // ── First time this product crosses below threshold ──
        newAlerts.push({
          productId: product._id,
          remainingStock: newQuantity,
          supplierName: product.supplierName,
          supplierContact: product.supplierContact,
          supplierEmail: product.supplierEmail || '',
          status: 'pending',
        });

        console.log(
          `⚠️  Stock Alert created for "${product.name}" — remaining: ${newQuantity}` +
          ` (threshold: ${product.reorderThreshold})`
        );

        if (product.supplierEmail) {
          emailsToSend.push({ product, newQuantity });
        } else {
          console.log(
            `ℹ️  No supplierEmail set for "${product.name}" — skipping low-stock email.`
          );
        }
      } else {
        // Already have a pending alert — just update the stock count, no new email
        updateAlerts.push({
          updateOne: {
            filter: { _id: existingAlert._id },
            update: { $set: { remainingStock: newQuantity } }
          }
        });
      }
    }

    // Execute Alert DB operations
    if (newAlerts.length > 0) await StockAlert.insertMany(newAlerts);
    if (updateAlerts.length > 0) await StockAlert.bulkWrite(updateAlerts);

    // Send emails (non-blocking for billing, but inside try/catch)
    for (const { product, newQuantity } of emailsToSend) {
      try {
        await sendLowStockAlertEmail({
          supplierEmail: product.supplierEmail,
          supplierName: product.supplierName,
          supplierContact: product.supplierContact,
          productName: product.name,
          remainingStock: newQuantity,
          reorderThreshold: product.reorderThreshold,
        });
      } catch (emailErr) {
        console.error(
          `❌ Low-stock alert email failed for "${product.name}":`,
          emailErr.message
        );
      }
    }
  }
};

module.exports = { validateStock, deductStock };
