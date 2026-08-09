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
async function sendEmail({ to, subject, message, templateParams = {} }, label) {
  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: to,
        subject: subject,
        message: message,
        store_name: STORE_NAME,
        ...templateParams,
      }
    );
    console.log(`📧 [${label}] Successfully dispatched via EmailJS (status: ${response.status})`);
    return { success: true, data: response };
  } catch (err) {
    console.error(`❌ [${label}] EmailJS send error:`, err.message || err.text || err);
    throw new Error(err.message || 'EmailJS failure');
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

  await sendEmail(
    {
      to: supplierEmail,
      subject: `Low Stock Alert - ${productName}`,
      message: `Heads-up! The product "${productName}" has dropped to ${remainingStock} units (Threshold: ${reorderThreshold}). A formal reorder request will follow.`,
      templateParams: {
        product_name: productName,
        remaining_stock: remainingStock,
        threshold: reorderThreshold,
        supplier_name: supplierName,
        supplier_contact: supplierContact,
        type: 'Low Stock Alert',
      },
    },
    `LowStock:${productName}`
  );
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
  managerContact,
  managerFeedback,
}) => {
  if (!supplierEmail) throw new Error('supplierEmail is required for reorder email');

  const deliveryStr = new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const msg = `${shopName} is placing a formal reorder request for ${quantity} units of "${productName}". Expected delivery: ${deliveryStr}.`;

  await sendEmail(
    {
      to: supplierEmail,
      subject: `Reorder Request - ${productName}`,
      message: msg,
      templateParams: {
        product_name: productName,
        quantity: quantity,
        expected_delivery: deliveryStr,
        supplier_name: supplierName,
        manager_name: managerName,
        manager_contact: managerContact,
        manager_feedback: managerFeedback || 'None',
        type: 'Reorder Request',
      },
    },
    `Reorder:${productName}`
  );
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

  await sendEmail(
    {
      to: customerEmail,
      subject: `Your Invoice #${invoiceNumber} - ${storeName}`,
      message: `Thank you for your purchase! Invoice #${invoiceNumber}. Items: ${itemsText}. Total: ₹${total}.`,
      templateParams: {
        invoice_number: invoiceNumber,
        total_amount: `₹${total}`,
        items_list: itemsText,
        type: 'Invoice Receipt',
      },
    },
    `Invoice:${invoiceNumber}`
  );
};

module.exports = {
  sendLowStockAlertEmail,
  sendSupplierReorderEmail,
  sendCustomerBillEmail,
};
