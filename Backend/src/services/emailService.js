/**
 * emailService.js
 *
 * Migrated to EmailJS for reliable outbound emails without restrictive domain rules.
 */

const emailjs = require('@emailjs/nodejs');
const {
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY,
  STORE_NAME,
} = require('../config/env');

emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  privateKey: EMAILJS_PRIVATE_KEY,
});

/**
 * sendEmail — Reusable wrapper for EmailJS API
 */
async function sendEmail(templateParams, label) {
  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );
    console.log(`📧 [${label}] Successfully dispatched via EmailJS (status: ${response.status})`);
    return { success: true, data: response };
  } catch (err) {
    console.error(`❌ [${label}] EmailJS send error:`, err.message || err.text || err);
    return { success: false, error: err.message || err };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Low-Stock Alert Email
// ─────────────────────────────────────────────────────────────────────────────
const sendLowStockAlertEmail = async ({
  supplierEmail,
  supplierName,
  supplierContact,
  productName,
  remainingStock,
  reorderThreshold,
}) => {
  if (!supplierEmail) throw new Error('supplierEmail is required for low-stock alert email');

  const result = await sendEmail(
    {
      to_email: supplierEmail,
      supplier_name: supplierName,
      supplier_contact: supplierContact,
      product_name: productName,
      remaining_stock: remainingStock,
      threshold: reorderThreshold,
      shop_name: STORE_NAME,
      type: 'Low Stock Alert',
    },
    `LowStock:${productName}`
  );

  if (!result.success) throw new Error(result.error);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Supplier Reorder Request Email
// ─────────────────────────────────────────────────────────────────────────────
const sendSupplierReorderEmail = async ({
  supplierEmail,
  supplierName,
  shopName,
  productName,
  quantity,
  expectedDeliveryDate,
  managerName,
  managerEmail,
  managerContact,
  managerFeedback,
}) => {
  if (!supplierEmail) throw new Error('supplierEmail is required for reorder email');

  const deliveryStr = new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const result = await sendEmail(
    {
      to_email: supplierEmail,
      reply_to: managerEmail || 'stocksense@example.com',
      supplier_name: supplierName,
      product_name: productName,
      quantity: quantity,
      expected_delivery: deliveryStr,
      shop_name: STORE_NAME,
      manager_name: managerName,
      manager_contact: managerContact,
      manager_note: managerFeedback || '—',
    },
    `Reorder:${productName}`
  );

  if (!result.success) throw new Error(result.error);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Customer Bill / Invoice Email
// ─────────────────────────────────────────────────────────────────────────────
const sendCustomerBillEmail = async ({
  customerEmail,
  invoiceNumber,
  items,
  total,
  createdAt,
  storeName,
}) => {
  if (!customerEmail) throw new Error('customerEmail is required for bill email');

  // Format a simple text list for EmailJS
  const itemsText = items.map(item => `${item.name} x${item.qty} (₹${item.subtotal})`).join(', ');

  const result = await sendEmail(
    {
      to_email: customerEmail,
      invoice_number: invoiceNumber,
      total_amount: `₹${total}`,
      items_list: itemsText,
      shop_name: STORE_NAME,
      type: 'Invoice Receipt',
    },
    `Invoice:${invoiceNumber}`
  );

  if (!result.success) throw new Error(result.error);
};

module.exports = {
  sendLowStockAlertEmail,
  sendSupplierReorderEmail,
  sendCustomerBillEmail,
};
