import { useState, useRef, useCallback } from 'react';
import { ScanLine, Plus, Trash2, Printer, ShoppingCart, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StockAlertModal from '../components/StockAlertModal';

const generateInvoiceNo = () => {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `INV-${dateStr}-${rand}`;
};

const formatDateTime = () => {
  const d = new Date();
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default function Billing() {
  const { products, getProductByBarcode, deductStock, addBill, showToast } = useApp();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanError, setScanError] = useState('');
  const [cart, setCart] = useState([]);
  const [billGenerated, setBillGenerated] = useState(null);
  const [stockAlerts, setStockAlerts] = useState([]);

  const scanRef = useRef(null);
  const printRef = useRef(null);

  // ── Barcode lookup ──────────────────────────────────────────────────────
  const handleBarcodeLookup = useCallback(() => {
    const code = barcodeInput.trim();
    if (!code) return;
    const product = getProductByBarcode(code);
    if (!product) {
      setScanError(`No product found for barcode "${code}".`);
      setScannedProduct(null);
      return;
    }
    if (product.stock === 0) {
      setScanError(`"${product.name}" is out of stock.`);
      setScannedProduct(null);
      return;
    }
    setScanError('');
    setScannedProduct(product);
  }, [barcodeInput, getProductByBarcode]);

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') handleBarcodeLookup();
  };

  // ── Add to cart ─────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!scannedProduct) return;
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty <= 0) {
      showToast('Enter a valid quantity.', 'error');
      return;
    }
    if (qty > scannedProduct.stock) {
      showToast(`Only ${scannedProduct.stock} units available.`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.barcode === scannedProduct.barcode);
      if (existing) {
        const newQty = existing.qty + qty;
        if (newQty > scannedProduct.stock) {
          showToast(`Total qty exceeds stock (${scannedProduct.stock}).`, 'error');
          return prev;
        }
        return prev.map((i) =>
          i.barcode === scannedProduct.barcode
            ? { ...i, qty: newQty, subtotal: newQty * i.price }
            : i
        );
      }
      return [
        ...prev,
        {
          barcode: scannedProduct.barcode,
          name: scannedProduct.name,
          qty,
          price: scannedProduct.price,
          subtotal: qty * scannedProduct.price,
        },
      ];
    });

    // Reset scan area
    setBarcodeInput('');
    setQtyInput('1');
    setScannedProduct(null);
    setScanError('');
    scanRef.current?.focus();
  };

  const handleRemoveItem = (barcode) => {
    setCart((prev) => prev.filter((i) => i.barcode !== barcode));
  };

  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  // ── Generate bill ───────────────────────────────────────────────────────
  const handleGenerateBill = () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add items first.', 'error');
      return;
    }

    const invoice = {
      invoiceNo: generateInvoiceNo(),
      date: formatDateTime(),
      items: cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        subtotal: i.subtotal,
      })),
      total,
    };

    // Deduct stock and collect low-stock alerts
    const newAlerts = [];
    cart.forEach((item) => {
      deductStock(item.barcode, item.qty);
      // Check updated stock (deductStock updates context; re-read from products)
      const prod = products.find((p) => p.barcode === item.barcode);
      if (prod) {
        const remainingStock = prod.stock - item.qty;
        if (remainingStock < prod.reorderThreshold) {
          newAlerts.push({ product: { ...prod, stock: Math.max(0, remainingStock) } });
        }
      }
    });

    addBill(invoice);
    setBillGenerated(invoice);
    setCart([]);
    setStockAlerts(newAlerts);
    showToast(`Bill ${invoice.invoiceNo} generated!`);
  };

  // ── Print bill ──────────────────────────────────────────────────────────
  const handlePrintBill = () => {
    if (!billGenerated) return;
    const content = printRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${billGenerated.invoiceNo}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #111; }
            h2 { color: #1d4ed8; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 13px; }
            td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #1d4ed8; }
            .meta { margin-bottom: 16px; color: #555; font-size: 13px; }
          </style>
        </head>
        <body>${content}<script>window.onload=()=>window.print()<\/script></body>
      </html>
    `);
    win.document.close();
  };

  // ── Dismiss stock alert ─────────────────────────────────────────────────
  const handleAlertClose = (barcode) => {
    setStockAlerts((prev) => prev.filter((a) => a.product.barcode !== barcode));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Billing Counter</h1>
        <p className="page-subtitle">Scan barcodes to add items, then generate an invoice.</p>
      </div>

      <div className="billing-layout">
        {/* ── Left: Scanner + Cart ───────────────────────────────────────── */}
        <div className="billing-left">
          {/* Scan panel */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ScanLine size={18} /> Scan Product
              </h2>
            </div>

            <div className="scan-row">
              <div className="scan-input-wrap">
                <input
                  ref={scanRef}
                  className={`form-input scan-input ${scanError ? 'input-error' : ''}`}
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setScanError('');
                    setScannedProduct(null);
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Enter or scan barcode (e.g. BC-100001)"
                  autoFocus
                />
                <button className="btn btn-outline" onClick={handleBarcodeLookup}>
                  Lookup
                </button>
              </div>
              {scanError && <p className="field-error">{scanError}</p>}
            </div>

            {/* Scanned product preview */}
            {scannedProduct && (
              <div className="scanned-preview">
                <CheckCircle size={18} className="color-green" />
                <div className="scanned-info">
                  <p className="scanned-name">{scannedProduct.name}</p>
                  <p className="scanned-meta">
                    ₹{scannedProduct.price} &nbsp;|&nbsp; Stock: {scannedProduct.stock}
                  </p>
                </div>
                <div className="scanned-qty">
                  <label className="form-label">Qty</label>
                  <input
                    className="form-input qty-input"
                    type="number"
                    min="1"
                    max={scannedProduct.stock}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleAddToCart}>
                  <Plus size={16} /> Add to Bill
                </button>
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShoppingCart size={18} /> Current Bill
              </h2>
              {cart.length > 0 && (
                <button
                  className="btn-text text-red"
                  onClick={() => setCart([])}
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="empty-msg">No items added yet. Scan a barcode to begin.</p>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.barcode}>
                          <td className="font-medium">{item.name}</td>
                          <td className="text-right">{item.qty}</td>
                          <td className="text-right">₹{item.price.toLocaleString()}</td>
                          <td className="text-right font-semibold">
                            ₹{item.subtotal.toLocaleString()}
                          </td>
                          <td className="text-right">
                            <button
                              className="icon-btn text-red"
                              onClick={() => handleRemoveItem(item.barcode)}
                              title="Remove"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="cart-footer">
                  <span className="total-label">Total Amount</span>
                  <span className="total-amount">₹{total.toLocaleString()}</span>
                </div>

                <button className="btn btn-success btn-block mt-3" onClick={handleGenerateBill}>
                  <Printer size={17} /> Generate Bill
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Generated Invoice ───────────────────────────────────── */}
        <div className="billing-right">
          {billGenerated ? (
            <div className="card invoice-card">
              <div className="card-header">
                <h2 className="card-title">Invoice</h2>
                <button className="btn btn-outline" onClick={handlePrintBill}>
                  <Printer size={15} /> Print
                </button>
              </div>

              {/* Printable area */}
              <div ref={printRef} className="invoice-body">
                <div className="invoice-header-block">
                  <h2 className="invoice-store-name">RetailManager Store</h2>
                  <p className="invoice-store-sub">Your trusted neighbourhood store</p>
                </div>
                <div className="invoice-meta">
                  <div>
                    <span className="invoice-meta-label">Invoice No.</span>
                    <span className="invoice-meta-value mono">{billGenerated.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="invoice-meta-label">Date &amp; Time</span>
                    <span className="invoice-meta-value">{billGenerated.date}</span>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billGenerated.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>{item.name}</td>
                        <td className="text-right">{item.qty}</td>
                        <td className="text-right">₹{item.price.toLocaleString()}</td>
                        <td className="text-right font-semibold">
                          ₹{item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4} className="text-right">
                        Total
                      </td>
                      <td className="text-right">₹{billGenerated.total.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="invoice-thank-you">Thank you for shopping with us!</p>
              </div>
            </div>
          ) : (
            <div className="card invoice-placeholder">
              <Printer size={48} className="placeholder-icon" />
              <p className="placeholder-text">Generated invoice will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stock Alert Modal ────────────────────────────────────────────── */}
      {stockAlerts.length > 0 && (
        <StockAlertModal alerts={stockAlerts} onClose={handleAlertClose} />
      )}
    </div>
  );
}
