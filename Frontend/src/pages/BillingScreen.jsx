/**
 * BillingScreen — Biller role
 * Includes optional Customer Email field for emailing the invoice.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import {
  ScanLine, Camera, CameraOff, Plus, Trash2,
  Printer, ShoppingCart, CheckCircle, Search, Mail,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const fmtDateTime = () =>
  new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

export default function BillingScreen() {
  const { currentUser, getProductByBarcode, createBill, showToast } = useApp();

  /* ── Camera ─────────────────────────────────────────────────────────── */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState('');
  const [scanning,     setScanning]     = useState(false);
  const videoRef  = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);

  /* ── Scan / lookup ──────────────────────────────────────────────────── */
  const [barcodeInput,   setBarcodeInput]   = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanError,      setScanError]      = useState('');
  const [lookupLoading,  setLookupLoading]  = useState(false);
  const [qtyInput,       setQtyInput]       = useState('1');

  /* ── Cart / bill ────────────────────────────────────────────────────── */
  const [cart,          setCart]          = useState([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [billLoading,   setBillLoading]   = useState(false);
  const [billGenerated, setBillGenerated] = useState(null);
  const printRef = useRef(null);

  // ── Camera helpers ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    try { readerRef.current?.reset(); } catch (_) {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        readerRef.current = new BrowserMultiFormatReader();
        try {
          await readerRef.current.decodeFromStream(stream, videoRef.current, (result, err) => {
            if (result) handleBarcodeDetected(result.getText());
            if (err && !(err instanceof NotFoundException)) console.warn('ZXing:', err);
          });
        } catch (e) { console.warn('ZXing stream error:', e); }
        setScanning(false);
      }, 150);
    } catch (err) {
      setScanning(false);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'denied' : 'unavailable'
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Barcode lookup ──────────────────────────────────────────────────
  const handleBarcodeDetected = useCallback(async (code) => {
    if (!code) return;
    const trimmed = code.trim();
    setScanError('');
    setLookupLoading(true);
    try {
      const product = await getProductByBarcode(trimmed);
      if (!product) { setScanError(`No product found for barcode "${trimmed}".`); setScannedProduct(null); return; }
      if (product.stock === 0) { setScanError(`"${product.name}" is out of stock.`); setScannedProduct(null); return; }
      stopCamera();
      setScannedProduct(product);
      setBarcodeInput(trimmed);
      setQtyInput('1');
    } catch {
      setScanError(`Could not look up barcode "${trimmed}". Try again.`);
      setScannedProduct(null);
    } finally {
      setLookupLoading(false);
    }
  }, [getProductByBarcode, stopCamera]);

  const handleManualLookup = () => handleBarcodeDetected(barcodeInput);

  // ── Cart ────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!scannedProduct) return;
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty <= 0) { showToast('Enter a valid quantity.', 'error'); return; }
    if (qty > scannedProduct.stock) { showToast(`Only ${scannedProduct.stock} units available.`, 'error'); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === scannedProduct.productId);
      if (existing) {
        const newQty = existing.qty + qty;
        if (newQty > scannedProduct.stock) { showToast(`Total qty exceeds available stock (${scannedProduct.stock}).`, 'error'); return prev; }
        return prev.map((i) => i.productId === scannedProduct.productId
          ? { ...i, qty: newQty, subtotal: newQty * i.price } : i);
      }
      return [...prev, {
        productId: scannedProduct.productId,
        barcode:   scannedProduct.barcode,
        name:      scannedProduct.name,
        qty, price: scannedProduct.price,
        subtotal:  qty * scannedProduct.price,
      }];
    });
    setBarcodeInput(''); setQtyInput('1'); setScannedProduct(null); setScanError('');
  };

  const handleRemove = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));
  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  // ── Generate bill ───────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    if (!cart.length) { showToast('Cart is empty.', 'error'); return; }
    setBillLoading(true);
    try {
      const { bill, emailSent } = await createBill(cart, customerEmail.trim());
      setBillGenerated({
        invoiceNo:  bill.invoiceNo,
        date:       bill.date || fmtDateTime(),
        billerName: currentUser.name,
        items:      bill.items,
        total:      bill.total,
      });
      setCart([]);
      setCustomerEmail('');

      let msg = `Bill ${bill.invoiceNo} generated!`;
      if (customerEmail.trim()) {
        msg += emailSent ? ' Invoice emailed to customer.' : '';
        // silent if emailSent is false — don't alarm biller
      }
      showToast(msg);
    } catch (err) {
      showToast(err.message || 'Failed to generate bill.', 'error');
    } finally {
      setBillLoading(false);
    }
  };

  // ── Print ───────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!billGenerated || !printRef.current) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${billGenerated.invoiceNo}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:40px;color:#111}
        h2{color:#1d4ed8;margin-bottom:4px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:13px}
        td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
        .meta{color:#555;font-size:13px;margin-bottom:16px}
      </style></head>
      <body>${printRef.current.innerHTML}
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><ShoppingCart size={20}/> Billing Counter</h1>
        <p className="page-subtitle">Scan a barcode with the camera or enter it manually.</p>
      </div>

      <div className="billing-layout">
        {/* ── Left ──────────────────────────────────────────────────── */}
        <div className="billing-left">

          {/* Scanner */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title"><ScanLine size={16}/> Scan / Enter Barcode</h2>
            </div>

            {cameraActive && (
              <div className="camera-wrap">
                <video ref={videoRef} className="camera-video" playsInline muted />
                <div className="camera-overlay">
                  <div className="scan-frame" />
                  <p className="scan-hint">Point at a barcode</p>
                </div>
                <button className="btn btn-ghost camera-stop-btn" onClick={stopCamera}>
                  <CameraOff size={15}/> Stop Camera
                </button>
              </div>
            )}

            {cameraError === 'denied' && (
              <div className="camera-error-msg">
                <CameraOff size={18}/>
                <div><strong>Camera access denied.</strong><p>Use manual entry below.</p></div>
              </div>
            )}
            {cameraError === 'unavailable' && (
              <div className="camera-error-msg">
                <CameraOff size={18}/>
                <div><strong>No camera detected.</strong><p>Use manual entry below.</p></div>
              </div>
            )}

            {!cameraActive && (
              <button className="btn btn-outline camera-start-btn" onClick={startCamera} disabled={scanning}>
                {scanning ? <><span className="spinner-sm"/> Starting camera…</> : <><Camera size={15}/> Start Camera Scanner</>}
              </button>
            )}

            <div className="manual-entry-section">
              <p className="manual-entry-label"><Search size={13}/> Manual barcode entry</p>
              <div className="scan-input-wrap">
                <input
                  className={`form-input scan-input ${scanError ? 'input-error' : ''}`}
                  value={barcodeInput}
                  onChange={(e) => { setBarcodeInput(e.target.value); setScanError(''); setScannedProduct(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  placeholder="Type barcode and press Enter"
                  disabled={lookupLoading}
                />
                <button className="btn btn-outline" onClick={handleManualLookup} disabled={lookupLoading}>
                  {lookupLoading ? <span className="spinner-sm"/> : 'Lookup'}
                </button>
              </div>
              {scanError && <p className="field-error">{scanError}</p>}
            </div>

            {scannedProduct && (
              <div className="scanned-preview">
                <CheckCircle size={18} className="color-green"/>
                <div className="scanned-info">
                  <p className="scanned-name">{scannedProduct.name}</p>
                  <p className="scanned-meta">₹{scannedProduct.price} &nbsp;|&nbsp; Stock: {scannedProduct.stock}</p>
                </div>
                <div className="scanned-qty">
                  <label className="form-label">Qty</label>
                  <input className="form-input qty-input" type="number" min="1" max={scannedProduct.stock}
                    value={qtyInput} onChange={(e) => setQtyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()} />
                </div>
                <button className="btn btn-primary" onClick={handleAddToCart}>
                  <Plus size={15}/> Add to Bill
                </button>
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title"><ShoppingCart size={15}/> Current Bill ({cart.length} items)</h2>
              {cart.length > 0 && <button className="btn-text text-red" onClick={() => setCart([])}>Clear All</button>}
            </div>

            {cart.length === 0 ? (
              <p className="empty-msg">No items added. Scan a barcode above to begin.</p>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Subtotal</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.productId}>
                          <td className="font-medium">{item.name}</td>
                          <td className="text-right">{item.qty}</td>
                          <td className="text-right">₹{item.price.toLocaleString()}</td>
                          <td className="text-right font-semibold">₹{item.subtotal.toLocaleString()}</td>
                          <td>
                            <button className="icon-btn text-red" onClick={() => handleRemove(item.productId)} title="Remove">
                              <Trash2 size={14}/>
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

                {/* Optional customer email */}
                <div className="form-group mt-3">
                  <label className="form-label">
                    <Mail size={13}/> Customer Email <span className="text-muted">(optional — sends invoice copy)</span>
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>

                <button className="btn btn-success btn-block mt-3" onClick={handleGenerateBill} disabled={billLoading}>
                  {billLoading
                    ? <><span className="spinner-sm"/> Processing…</>
                    : <><Printer size={16}/> Generate Bill</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Invoice ─────────────────────────────────────────── */}
        <div className="billing-right">
          {billGenerated ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Invoice</h2>
                <button className="btn btn-outline" onClick={handlePrint}><Printer size={14}/> Print</button>
              </div>
              <div ref={printRef} className="invoice-body">
                <div className="invoice-header-block">
                  <h2 className="invoice-store-name">StockSense Store</h2>
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
                  <div>
                    <span className="invoice-meta-label">Biller</span>
                    <span className="invoice-meta-value">{billGenerated.billerName}</span>
                  </div>
                </div>
                <table className="data-table">
                  <thead><tr>
                    <th>#</th><th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {billGenerated.items.map((item, i) => (
                      <tr key={i}>
                        <td className="text-muted">{i + 1}</td>
                        <td>{item.name}</td>
                        <td className="text-right">{item.qty}</td>
                        <td className="text-right">₹{item.price.toLocaleString()}</td>
                        <td className="text-right font-semibold">₹{item.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4} className="text-right">Total</td>
                      <td className="text-right">₹{billGenerated.total.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="invoice-thank-you">Thank you for shopping with us!</p>
              </div>
            </div>
          ) : (
            <div className="card invoice-placeholder">
              <Printer size={44} className="placeholder-icon"/>
              <p className="placeholder-text">Generated invoice will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
