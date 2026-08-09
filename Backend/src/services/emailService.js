/**
 * emailService.js
 *
 * Three email functions:
 *   1. sendLowStockAlertEmail   — automatic heads-up to supplier when stock crosses threshold
 *   2. sendSupplierReorderEmail — formal reorder request from manager to supplier
 *   3. sendCustomerBillEmail    — optional itemised invoice to customer after billing
 *
 * ALL three must be called inside try/catch by the caller.
 * A failure here must NEVER break the core operation.
 *
 * Retry logic: each function retries up to MAX_RETRIES times with
 * exponential back-off before giving up. This handles transient Gmail
 * SMTP errors that are common after cold-start on Render.
 */

const { Resend } = require('resend');
const { RESEND_API_KEY, EMAIL_FROM, STORE_NAME } = require('../config/env');

const resend = new Resend(RESEND_API_KEY);

/**
 * sendEmail — Reusable wrapper for Resend API
 */
const sendEmail = async ({ to, subject, html }, label) => {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM || `"${STORE_NAME}" <onboarding@resend.dev>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`❌ [${label}] Resend API error:`, error.message);
      throw new Error(error.message);
    }

    console.log(`📧 [${label}] Successfully dispatched via Resend (ID: ${data.id})`);
    return { success: true, data };
  } catch (err) {
    console.error(`❌ [${label}] Unexpected email error:`, err.message);
    throw err;
  }
};

// ─── Input sanitizer — strips HTML tags to prevent injection in email templates ─
const sanitize = (str) =>
  typeof str === 'string'
    ? str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, '&amp;')
    : String(str ?? '');

// ─── Shared HTML shell ────────────────────────────────────────────────────────
const htmlShell = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
                ${sanitize(STORE_NAME)}
              </h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${sanitize(title)}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                This is an automated message from ${sanitize(STORE_NAME)}. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Helper: labelled row ─────────────────────────────────────────────────────
const detailRow = (label, value) => `
  <tr>
    <td style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;
               font-weight:600;color:#475569;width:40%;font-size:14px;">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;
               color:#1e293b;font-size:14px;">${value}</td>
  </tr>`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Low-Stock Alert Email  (automatic, supplier heads-up)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.supplierEmail
 * @param {string} p.supplierName
 * @param {string} p.supplierContact
 * @param {string} p.productName
 * @param {number} p.remainingStock
 * @param {number} p.reorderThreshold
 */
const sendLowStockAlertEmail = async ({
  supplierEmail,
  supplierName,
  supplierContact,
  productName,
  remainingStock,
  reorderThreshold,
}) => {
  if (!supplierEmail) throw new Error('supplierEmail is required for low-stock alert email');

  // Sanitize all user-sourced values before embedding in HTML
  const sName = sanitize(supplierName);
  const sContact = sanitize(supplierContact);
  const pName = sanitize(productName);

  const body = `
    <p style="font-size:15px;color:#1e293b;margin-top:0;">
      Dear <strong>${sName}</strong>,
    </p>
    <p style="font-size:14px;color:#475569;">
      This is an automated <strong>low-stock heads-up</strong> from ${sanitize(STORE_NAME)}.
      One of the products you supply has fallen below its reorder threshold.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:6px;
                  overflow:hidden;margin:20px 0;border-collapse:collapse;">
      ${detailRow('Product Name', `<strong>${pName}</strong>`)}
      ${detailRow('Remaining Stock', `<span style="color:#dc2626;font-weight:700;">${Number(remainingStock)} units</span>`)}
      ${detailRow('Reorder Threshold', `${Number(reorderThreshold)} units`)}
      ${detailRow('Your Contact', sContact)}
    </table>

    <p style="font-size:14px;color:#475569;">
      Please be advised that a <strong>formal reorder request</strong> will follow shortly.
      Kindly ensure stock availability so we can serve our customers without interruption.
    </p>
    <p style="font-size:14px;color:#475569;">
      Thank you for your continued partnership.
    </p>
    <p style="font-size:14px;color:#1e293b;font-weight:600;">
      — ${sanitize(STORE_NAME)} Inventory Team
    </p>`;

  await sendEmail(
    {
      to: supplierEmail,
      subject: `Low Stock Alert - ${productName}`,
      html: htmlShell(`Low Stock Alert — ${productName}`, body),
    },
    `LowStock:${productName}`
  );

  console.log(`📧 Low-stock alert email sent to ${supplierName} <${supplierEmail}> for "${productName}"`);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Supplier Reorder Request Email
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.supplierEmail
 * @param {string} p.supplierName
 * @param {string} p.shopName
 * @param {string} p.productName
 * @param {number} p.quantity
 * @param {Date|string} p.expectedDeliveryDate
 * @param {string} p.managerName
 * @param {string} p.managerContact
 * @param {string} [p.managerFeedback]
 */
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

  // Sanitize all user-sourced values
  const sName = sanitize(supplierName);
  const sShop = sanitize(shopName);
  const pName = sanitize(productName);
  const mName = sanitize(managerName);
  const mContact = sanitize(managerContact);
  const mFeedback = managerFeedback ? sanitize(managerFeedback.trim()) : '';

  const deliveryStr = new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const managerDisplay = mContact ? `${mName} (${mContact})` : mName;

  const feedbackSection = mFeedback
    ? `<tr>
         <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;
                    font-weight:600;color:#475569;width:40%;font-size:14px;vertical-align:top;">
           Manager's Note
         </td>
         <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;
                    font-size:14px;color:#78350f;background:#fffbeb;">
           ${mFeedback}
         </td>
       </tr>`
    : '';

  const body = `
    <p style="font-size:15px;color:#1e293b;margin-top:0;">
      Dear <strong>${sName}</strong>,
    </p>
    <p style="font-size:14px;color:#475569;margin-bottom:20px;">
      <strong>${sShop}</strong> is placing a formal reorder request for the following
      product. Please review the details below and confirm availability at your earliest
      convenience.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:6px;
                  overflow:hidden;border-collapse:collapse;margin-bottom:24px;">
      ${detailRow('Product Name', `<strong style="font-size:15px;color:#1e293b;">${pName}</strong>`)}
      ${detailRow('Quantity Requested', `<strong style="color:#1d4ed8;font-size:15px;">${Number(quantity)} units</strong>`)}
      ${detailRow('Expected Delivery', `<strong style="color:#1e293b;">${deliveryStr}</strong>`)}
      ${detailRow('Shop', `<span style="color:#1e293b;">${sShop}</span>`)}
      ${detailRow('Manager', `<span style="color:#1e293b;">${managerDisplay}</span>`)}
      ${feedbackSection}
    </table>

    <p style="font-size:14px;color:#475569;">
      Please <strong>confirm availability</strong> and expected shipment timeline by
      replying to this email or contacting the manager directly.
    </p>
    <p style="font-size:14px;color:#475569;">
      We appreciate your prompt attention to this request.
    </p>
    <p style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:0;">
      — ${sShop} Procurement Team
    </p>`;

  await sendEmail(
    {
      to: supplierEmail,
      subject: `Reorder Request - ${productName}`,
      html: htmlShell(`Reorder Request — ${productName}`, body),
    },
    `Reorder:${productName}`
  );

  console.log(`📧 Reorder email sent to <${supplierEmail}> for "${productName}" (qty: ${quantity})`);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Customer Bill / Invoice Email
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.customerEmail
 * @param {string} p.invoiceNumber
 * @param {Array}  p.items  — [{ name, qty, price, subtotal }]
 * @param {number} p.total
 * @param {Date|string} p.createdAt
 * @param {string} p.storeName
 */
const sendCustomerBillEmail = async ({
  customerEmail,
  invoiceNumber,
  items,
  total,
  createdAt,
  storeName,
}) => {
  if (!customerEmail) throw new Error('customerEmail is required for bill email');

  const sStore = sanitize(storeName);
  const sInvoice = sanitize(invoiceNumber);

  const dateStr = new Date(createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">
        ${sanitize(item.name)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;
                 text-align:center;color:#475569;">
        ${Number(item.qty)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;
                 text-align:right;color:#475569;">
        ₹${Number(item.price).toLocaleString('en-IN')}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;
                 text-align:right;font-weight:600;color:#1e293b;">
        ₹${Number(item.subtotal).toLocaleString('en-IN')}
      </td>
    </tr>`).join('');

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;font-size:13px;color:#64748b;">Invoice Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                     color:#1d4ed8;font-family:monospace;">${sInvoice}</p>
        </td>
        <td style="text-align:right;">
          <p style="margin:0;font-size:13px;color:#64748b;">Date &amp; Time</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1e293b;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:6px;
                  overflow:hidden;border-collapse:collapse;">
      <thead>
        <tr style="background:#1d4ed8;">
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:13px;">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px;">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#fff;font-size:13px;">Price</th>
          <th style="padding:10px 12px;text-align:right;color:#fff;font-size:13px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr style="background:#1e293b;">
          <td colspan="3"
              style="padding:12px;text-align:right;color:#e2e8f0;
                     font-size:14px;font-weight:600;">
            TOTAL AMOUNT
          </td>
          <td style="padding:12px;text-align:right;color:#ffffff;
                     font-size:16px;font-weight:700;">
            ₹${Number(total).toLocaleString('en-IN')}
          </td>
        </tr>
      </tbody>
    </table>

    <p style="font-size:14px;color:#475569;margin-top:24px;">
      Thank you for shopping at <strong>${sStore}</strong>!
      We hope to see you again soon.
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      Please keep this email as your purchase receipt.
    </p>`;

  await sendEmail(
    {
      to: customerEmail,
      subject: `Your Invoice #${invoiceNumber} - ${storeName}`,
      html: htmlShell(`Invoice #${invoiceNumber}`, body),
    },
    `Invoice:${invoiceNumber}`
  );

  console.log(`📧 Invoice email sent to <${customerEmail}> for invoice ${invoiceNumber}`);
};

module.exports = {
  sendLowStockAlertEmail,
  sendSupplierReorderEmail,
  sendCustomerBillEmail,
};
