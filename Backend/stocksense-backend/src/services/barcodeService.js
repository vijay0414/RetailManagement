const Product = require('../models/Product');

/**
 * Generates a unique barcode string in the format PRD-<timestamp>-<random3digits>.
 * Verifies uniqueness against the database before returning.
 * @returns {Promise<string>} A unique barcode string
 */
const generateUniqueBarcode = async () => {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const timestamp = Date.now();
    const random = Math.floor(100 + Math.random() * 900); // 3-digit random: 100–999
    const barcode = `PRD-${timestamp}-${random}`;

    // Verify uniqueness
    const existing = await Product.findOne({ barcode });
    if (!existing) {
      return barcode;
    }

    // Small delay before retry to avoid same timestamp collision
    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  throw new Error('Failed to generate a unique barcode after multiple attempts');
};

/**
 * Validates that a given barcode exists in the database.
 * @param {string} barcode
 * @returns {Promise<Object|null>} Product document or null
 */
const findProductByBarcode = async (barcode) => {
  return Product.findOne({ barcode });
};

module.exports = { generateUniqueBarcode, findProductByBarcode };
