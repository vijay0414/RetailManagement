const Product = require('../models/Product');
const StockAlert = require('../models/StockAlert');

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
 * Automatically creates a StockAlert if stock falls below reorderThreshold.
 * @param {Array} resolvedItems - Array of { product, qty } from validateStock
 * @returns {Promise<void>}
 */
const deductStock = async (resolvedItems) => {
  for (const { product, qty } of resolvedItems) {
    const newQuantity = product.quantity - qty;
    product.quantity = newQuantity;
    await product.save();

    // Auto-create a StockAlert if stock dropped below threshold
    if (newQuantity < product.reorderThreshold) {
      // Only create one pending alert per product to avoid duplicates
      const existingAlert = await StockAlert.findOne({
        productId: product._id,
        status: 'pending',
      });

      if (!existingAlert) {
        await StockAlert.create({
          productId: product._id,
          remainingStock: newQuantity,
          supplierName: product.supplierName,
          supplierContact: product.supplierContact,
          status: 'pending',
        });

        console.log(
          `⚠️  Stock Alert created for "${product.name}" — remaining: ${newQuantity} (threshold: ${product.reorderThreshold})`
        );
      } else {
        // Update the existing pending alert's remaining stock count
        existingAlert.remainingStock = newQuantity;
        await existingAlert.save();
      }
    }
  }
};

module.exports = { validateStock, deductStock };
