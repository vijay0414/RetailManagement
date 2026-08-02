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
 */

const transporter = require('../config/mailer');
const { EMAIL_USER, STORE_NAME } = require('../config/env');

// ─── Shared HTML shell ────────────────────────────────────────────────────────
const htmlShell = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
                ${STORE_NAME}
              </h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${title}</p>
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
                This is an automated message from ${STORE_NAME}. Please do not reply directly.
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

  const body = `
    <p style="font-size:15px;color:#1e293b;margin-top:0;">
      Dear <strong>${supplierName}</strong>,
    </p>
    <p style="font-size:14px;color:#475569;">
      This is an automated <strong>low-stock heads-up</strong> from ${STORE_NAME}.
      One of the products you supply has fallen below its reorder threshold.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:6px;
                  overflow:hidden;margin:20px 0;border-collapse:collapse;">
      ${detailRow('Product Name',      `<strong>${productName}</strong>`)}
      ${detailRow('Remaining Stock',   `<span style="color:#dc2626;font-weight:700;">${remainingStock} units</span>`)}
      ${detailRow('Reorder Threshold', `${reorderThreshold} units`)}
      ${detailRow('Your Contact',      supplierContact)}
    </table>

    <p style="font-size:14px;color:#475569;">
      Please be advised that a <strong>formal reorder request</strong> will follow shortly.
      Kindly ensure stock availability so we can serve our customers without interruption.
    </p>
    <p style="font-size:14px;color:#475569;">
      Thank you for your continued partnership.
    </p>
    <p style="font-size:14px;color:#1e293b;font-weight:600;">
      — ${STORE_NAME} Inventory Team
    </p>`;

  await transporter.sendMail({
    from: `"${STORE_NAME}" <${EMAIL_USER}>`,
    to:   supplierEmail,
    subject: `Low Stock Alert - ${productName}`,
    html: htmlShell(`Low Stock Alert — ${productName}`, body),
  });

  console.log(`📧 Low-stock alert email sent to ${supplierName} <${supplierEmail}> for "${productName}"`);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Supplier Reorder Request Email
// ─────────────────────────────────────────────────────────────────────────────
/**
 * New email format:
 *  - Greeting:  "Dear <supplierName>,"  (supplier company name, greeting only)
 *  - Intro:     "<shopName> is placing a formal reorder request…"
 *  - Table rows (exact order):
 *      Product Name       | <productName>
 *      Quantity Requested | <quantity> units  (bold, accent color)
 *      Expected Delivery  | <DD Month YYYY>
 *      Shop               | <shopName>         (store placing the order)
 *      Manager            | <managerName> (<managerContact>)
 *  - Manager's Note section (only if managerFeedback is non-empty)
 *
 * @param {Object} p
 * @param {string} p.supplierEmail
 * @param {string} p.supplierName       — used ONLY in greeting ("Dear Cadbury,")
 * @param {string} p.shopName           — store name (from STORE_NAME env)
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

  const deliveryStr = new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const managerDisplay = managerContact
    ? `${managerName} (${managerContact})`
    : managerName;

  // Manager's note — only rendered when non-empty
  const feedbackSection = managerFeedback && managerFeedback.trim()
    ? `<tr>
         <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;
                    font-weight:600;color:#475569;width:40%;font-size:14px;vertical-align:top;">
           Manager's Note
         </td>
         <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;
                    font-size:14px;color:#78350f;background:#fffbeb;">
           ${managerFeedback.trim()}
         </td>
       </tr>`
    : '';

  const body = `
    <p style="font-size:15px;color:#1e293b;margin-top:0;">
      Dear <strong>${supplierName}</strong>,
    </p>
    <p style="font-size:14px;color:#475569;margin-bottom:20px;">
      <strong>${shopName}</strong> is placing a formal reorder request for the following
      product. Please review the details below and confirm availability at your earliest
      convenience.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:6px;
                  overflow:hidden;border-collapse:collapse;margin-bottom:24px;">
      ${detailRow('Product Name',
          `<strong style="font-size:15px;color:#1e293b;">${productName}</strong>`)}
      ${detailRow('Quantity Requested',
          `<strong style="color:#1d4ed8;font-size:15px;">${quantity} units</strong>`)}
      ${detailRow('Expected Delivery',
          `<strong style="color:#1e293b;">${deliveryStr}</strong>`)}
      ${detailRow('Shop',
          `<span style="color:#1e293b;">${shopName}</span>`)}
      ${detailRow('Manager',
          `<span style="color:#1e293b;">${managerDisplay}</span>`)}
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
      — ${shopName} Procurement Team
    </p>`;

  await transporter.sendMail({
    from:    `"${shopName}" <${EMAIL_USER}>`,
    to:      supplierEmail,
    subject: `Reorder Request - ${productName}`,
    html:    htmlShell(`Reorder Request — ${productName}`, body),
  });

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

  const dateStr = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">
        ${item.name}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;
                 text-align:center;color:#475569;">
        ${item.qty}
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
    <!-- Invoice meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;font-size:13px;color:#64748b;">Invoice Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                     color:#1d4ed8;font-family:monospace;">${invoiceNumber}</p>
        </td>
        <td style="text-align:right;">
          <p style="margin:0;font-size:13px;color:#64748b;">Date &amp; Time</p>
          <p style="margin:4px 0 0;font-size:14px;color:#1e293b;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <!-- Items table -->
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
        <!-- Total row -->
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
      Thank you for shopping at <strong>${storeName}</strong>!
      We hope to see you again soon.
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      Please keep this email as your purchase receipt.
    </p>`;

  await transporter.sendMail({
    from: `"${storeName}" <${EMAIL_USER}>`,
    to:   customerEmail,
    subject: `Your Invoice #${invoiceNumber} - ${storeName}`,
    html: htmlShell(`Invoice #${invoiceNumber}`, body),
  });

  console.log(`📧 Invoice email sent to <${customerEmail}> for invoice ${invoiceNumber}`);
};

module.exports = {
  sendLowStockAlertEmail,
  sendSupplierReorderEmail,
  sendCustomerBillEmail,
};
