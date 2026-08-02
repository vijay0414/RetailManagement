/**
 * notifyService.js
 *
 * Simulates supplier notification.
 * No real SMS/email integration — logs to console and returns a success response.
 * Replace the console.log lines with a real email/SMS client in production.
 */

/**
 * Simulates notifying a supplier about a low-stock alert.
 * @param {Object} params
 * @param {string} params.supplierName
 * @param {string} params.supplierContact
 * @param {string} params.productName
 * @param {number} params.remainingStock
 * @returns {{ success: boolean, message: string }}
 */
const notifySupplier = ({ supplierName, supplierContact, productName, remainingStock }) => {
  const timestamp = new Date().toISOString();

  console.log('─────────────────────────────────────────────');
  console.log(`📦 SUPPLIER NOTIFICATION [${timestamp}]`);
  console.log(`   Supplier : ${supplierName}`);
  console.log(`   Contact  : ${supplierContact}`);
  console.log(`   Product  : ${productName}`);
  console.log(`   Stock    : ${remainingStock} units remaining`);
  console.log(`   Message  : "Please restock ${productName} urgently."`);
  console.log('─────────────────────────────────────────────');

  return {
    success: true,
    message: `Notification sent to ${supplierName} (${supplierContact})`,
  };
};

module.exports = { notifySupplier };
