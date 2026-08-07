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

  for (const item of items) {
    const product = await Product.findById(item.productId);

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
  for (const { product, qty } of resolvedItems) {
    const newQuantity = product.quantity - qty;
    product.quantity = newQuantity;
    await product.save();

    if (newQuantity < product.reorderThreshold) {
      // Check for an existing pending alert to avoid duplicate alerts + emails
      const existingAlert = await StockAlert.findOne({
        productId: product._id,
        status: 'pending',
      });

      if (!existingAlert) {
        // ── First time this product crosses below threshold ──
        await StockAlert.create({
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

        // Send heads-up email to supplier (non-blocking — failure must not break billing)
        if (product.supplierEmail) {
          sendLowStockAlertEmail({
            supplierEmail: product.supplierEmail,
            supplierName: product.supplierName,
            supplierContact: product.supplierContact,
            productName: product.name,
            remainingStock: newQuantity,
            reorderThreshold: product.reorderThreshold,
          }).catch((emailErr) => {
            console.error(
              `❌ Low-stock alert email failed for "${product.name}":`,
              emailErr.message
            );
          });
        } else {
          console.log(
            `ℹ️  No supplierEmail set for "${product.name}" — skipping low-stock email.`
          );
        }
      } else {
        // Already have a pending alert — just update the stock count, no new email
        existingAlert.remainingStock = newQuantity;
        await existingAlert.save();
      }
    }
  }
};

module.exports = { validateStock, deductStock };
