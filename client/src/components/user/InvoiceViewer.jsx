import React from 'react';
import { X, Printer, MapPin, Mail, Phone, User, FileText, CheckCircle2, ShoppingBag } from 'lucide-react';

const InvoiceViewer = ({ order, user, onClose }) => {
  if (!order) return null;

  // Formatting helpers
  const formatCurrency = (amount) => "₹" + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const firstItem = order.items?.[0] || {};

  // Store Config Fallback (Using Vendor details)
  const store = {
    name: firstItem.vendor_name || "Antigravity Store",
    logo: "",
    address: firstItem.vendor_address || "147, Erode - Nasiyanur Road, Sampath Nagar,",
    city: "Erode",
    state: "Tamil Nadu",
    pincode: "638011",
    country: "India",
    email: firstItem.vendor_email || "info@ibc.in",
    phone: firstItem.vendor_phone || "1234567890"
  };

  const customer = {
    name: order.shipping_name || user?.name || "Customer",
    address: order.shipping_street || "Erode - Nasiyanur Road Sampath Nagar Erode",
    city: order.shipping_city || "Erode",
    state: order.shipping_state || "Tamil Nadu",
    pincode: order.shipping_zip || "638011",
    country: order.shipping_country || "India",
    email: user?.email || "user@com",
    phone: order.shipping_phone || user?.phone || "1234567890"
  };

  const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${String(order.id).padStart(6, '0')}`;
  const orderDate = formatDate(order.created_at);
  const invoiceDate = orderDate; // Same as order date for simplicity

  let totalGstAmount = 0;
  let subtotal = 0;

  // Pre-process items for the invoice
  const processedItems = order.items?.map((item, idx) => {
    const gstRate = Number(item.category_gst || item.gst_rate || 18);
    const marginRate = Number(item.category_margin || 0);
    const basePrice = Number(item.price);
    const unitPrice = basePrice * (1 + marginRate / 100);
    const quantity = Number(item.quantity);
    const priceBeforeGst = unitPrice * quantity;
    const gstAmount = priceBeforeGst * (gstRate / 100);
    const lineTotalBase = priceBeforeGst + gstAmount;

    subtotal += priceBeforeGst;
    totalGstAmount += gstAmount;

    return {
      ...item,
      displayId: (idx + 1).toString().padStart(2, '0'),
      gstRate,
      singleUnitPriceBeforeGst: unitPrice,
      gstAmount,
      lineTotal: lineTotalBase,
      isReturned: ['RETURNED', 'REFUNDED', 'RETURN_COMPLETED', 'REFUND_COMPLETED'].includes(item.item_status),
      isCancelled: item.item_status === 'CANCELLED'
    };
  }) || [];

  const grandTotal = subtotal + totalGstAmount;

  const refundedItems = processedItems.filter(item =>
    item.isReturned ||
    item.item_status === 'REFUNDED' ||
    item.item_status === 'REFUND_COMPLETED' ||
    item.return_request?.status === 'REFUND_COMPLETED' ||
    item.return_request?.status === 'RETURN_COMPLETED'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-500/75 flex items-start justify-center overflow-y-auto p-4 md:p-8 backdrop-blur-sm print:p-0 print:bg-white print:block">

      {/* Controls - Hidden when printing */}
      <div className="fixed top-4 right-4 flex gap-3 z-[110] print:hidden">
        <button
          onClick={handlePrint}
          className="bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          title="Print Invoice"
        >
          <Printer size={20} /> <span className="hidden md:inline font-bold pr-2">Print</span>
        </button>
        <button
          onClick={onClose}
          className="bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="w-full max-w-[850px] bg-white shadow-2xl relative print:shadow-none print:max-w-none print:m-0 mx-auto rounded-xl overflow-hidden border border-gray-100">
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
          
          .invoice-box {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            padding: 32px 24px;
            box-sizing: border-box;
            background: #ffffff;
          }
          
          .inv-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          
          .inv-store-info {
            border-left: 4px solid #d32f2f;
            padding-left: 18px;
          }
          
          .inv-store-name {
            font-size: 28px;
            font-weight: 800;
            color: #d32f2f;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
          }

          .inv-store-contact-row {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 12px;
            line-height: 1.5;
            color: #4b5563;
            margin-bottom: 6px;
          }

          .inv-store-contact-icon {
            color: #d32f2f;
            margin-top: 3px;
            flex-shrink: 0;
          }
          
          .inv-heading h1 {
            margin: 0;
            font-size: 42px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #111111;
            text-align: right;
            line-height: 1;
          }

          .inv-title-underline {
            width: 120px;
            height: 3px;
            background-color: #d32f2f;
            margin-left: auto;
            margin-top: 10px;
            margin-bottom: 20px;
          }
          
          .inv-pill {
            background: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 700;
            color: #d32f2f;
            text-align: center;
            margin-bottom: 10px;
            min-width: 180px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }

          .inv-pill-gray {
            color: #1f2937;
          }
          
          .inv-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 12px;
          }
          
          .inv-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px 20px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }

          .inv-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #f3f4f6;
          }

          .inv-card-icon-wrapper {
            background: #d32f2f;
            color: #ffffff;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .inv-section-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #d32f2f;
            letter-spacing: 0.5px;
          }
          
          .inv-text-sm {
            font-size: 13px;
            line-height: 1.5;
            color: #374151;
          }

          .inv-detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
          }

          .inv-detail-label {
            font-weight: 700;
            color: #1f2937;
          }

          .inv-detail-value {
            color: #4b5563;
          }

          .inv-status-pill {
            background: #fee2e2;
            color: #d32f2f;
            padding: 2px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          
          .inv-table-wrapper {
             border: 1px solid #e5e7eb;
             border-radius: 12px;
             overflow: hidden;
             margin-bottom: 12px;
             box-shadow: 0 1px 3px rgba(0,0,0,0.02);
           }

          .inv-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .inv-table th {
            background: #eef0f2;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            text-align: left;
            color: #1f2937;
            letter-spacing: 0.5px;
          }
          
          .inv-table td {
            padding: 10px 12px;
            font-size: 13px;
            border-bottom: 1px solid #f3f4f6;
            vertical-align: top;
            color: #374151;
          }

          .inv-table tr:last-child td {
            border-bottom: none;
          }

          .sku-label {
            display: inline-block;
            margin-top: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #d32f2f;
          }

          .inv-bottom {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-top: 0px;
          }

          .inv-summary-horizontal {
            display: flex;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }

          .inv-summary-item {
            flex: 1;
            padding: 9px 15px;
            border-right: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .inv-summary-item:last-child {
            border-right: none;
          }

          .inv-summary-label {
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }

          .inv-summary-value {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
          }

          .inv-summary-grand-total {
            background: #fef2f2;
          }

          .inv-summary-grand-total .inv-summary-label {
            color: #d32f2f;
          }

          .inv-summary-grand-total .inv-summary-value {
            color: #d32f2f;
            font-size: 16px;
            font-weight: 800;
          }

          .inv-notes-section {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            width: 100%;
            box-sizing: border-box;
          }

          .inv-notes-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 800;
            color: #1f2937;
            margin-bottom: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .inv-note-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 12px;
            color: #4b5563;
            line-height: 1.5;
            margin-bottom: 10px;
          }

          .inv-note-icon {
            color: #d32f2f;
            margin-top: 2px;
            flex-shrink: 0;
          }

          .inv-footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #4b5563;
            font-size: 12px;
          }

          .inv-footer-icon-wrapper {
            background: #d32f2f;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px auto;
          }

          .store-highlight {
            color: #d32f2f;
            font-weight: 700;
          }

          @media print {
            body { background: #fff; }
            .invoice-box { padding: 0; box-shadow: none; }
            .inv-table tr { page-break-inside: avoid; }
            @page { size: A4; margin: 10mm; }
          }
          
          @media (max-width: 650px) {
            .invoice-box { padding: 20px; }
            .inv-header { flex-direction: column; gap: 20px; }
            .inv-heading h1, .inv-title-underline { margin-left: 0; text-align: left; }
            .inv-heading { display: flex; flex-direction: column; align-items: flex-start; width: 100%; }
            .inv-info-grid, .inv-bottom { grid-template-columns: 1fr; gap: 20px; }
            .inv-table th, .inv-table td { padding: 10px; font-size: 11px; }
            .inv-summary-horizontal { flex-direction: column; }
            .inv-summary-item { border-right: none; border-bottom: 1px solid #e5e7eb; }
            .inv-summary-item:last-child { border-bottom: none; }
          }
        `}} />

        <div className="invoice-box">
          {/* HEADER */}
          <div className="inv-header">
            <div className="inv-store-info">
              <div className="inv-store-name">{store.name}</div>
              <div className="inv-store-contact-row">
                <MapPin size={14} className="inv-store-contact-icon" />
                <div>
                  {store.address}<br />
                  {store.city}, {store.state} {store.pincode}<br />
                  {store.country}
                </div>
              </div>
              <div className="inv-store-contact-row">
                <Mail size={14} className="inv-store-contact-icon" />
                <div>{store.email}</div>
              </div>
              <div className="inv-store-contact-row">
                <Phone size={14} className="inv-store-contact-icon" />
                <div>{store.phone}</div>
              </div>
            </div>

            <div className="inv-heading">
              <h1>INVOICE</h1>
              <div className="inv-title-underline"></div>
              <div className="inv-pill">#{invoiceNumber}</div>
              <div className="inv-pill inv-pill-gray">Order #{order.id}</div>
            </div>
          </div>

          {/* BILL TO & DETAILS */}
          <div className="inv-info-grid">
            <div className="inv-card">
              <div className="inv-card-header">
                <div className="inv-card-icon-wrapper">
                  <User size={13} />
                </div>
                <div className="inv-section-title">Bill To</div>
              </div>
              <div className="inv-text-sm">
                <strong style={{ fontSize: '15px', color: '#111827', display: 'block', marginBottom: '6px' }}>{customer.name}</strong>
                <div>{customer.address}</div>
                <div>{customer.city}, {customer.state} {customer.pincode}</div>
                <div>{customer.country}</div>
                <div style={{ marginTop: '6px', color: '#6b7280' }}>{customer.email}</div>
                <div style={{ color: '#6b7280' }}>{customer.phone}</div>
              </div>
            </div>

            <div className="inv-card">
              <div className="inv-card-header">
                <div className="inv-card-icon-wrapper">
                  <FileText size={13} />
                </div>
                <div className="inv-section-title">Invoice Details</div>
              </div>
              <div className="inv-text-sm">
                <div className="inv-detail-row">
                  <span className="inv-detail-label">Invoice Date:</span>
                  <span className="inv-detail-value">{invoiceDate}</span>
                </div>
                <div className="inv-detail-row">
                  <span className="inv-detail-label">Order Date:</span>
                  <span className="inv-detail-value">{orderDate}</span>
                </div>
                <div className="inv-detail-row">
                  <span className="inv-detail-label">Payment:</span>
                  <span className="inv-detail-value">{order.payment_method || 'COD'}</span>
                </div>
                <div className="inv-detail-row" style={{ alignItems: 'center' }}>
                  <span className="inv-detail-label">Payment Status:</span>
                  <span className="inv-status-pill">{order.payment_status || 'PENDING'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                  <th style={{ width: '31%' }}>Item & Description</th>
                  <th style={{ textAlign: 'center', width: '6%' }}>Qty</th>
                  <th style={{ textAlign: 'right', width: '12%' }}>Unit Price <span style={{ fontSize: '9px', display: 'block', textTransform: 'none', opacity: 0.8 }}>(Before Tax)</span></th>
                  <th style={{ textAlign: 'center', width: '12%' }}>Received Date</th>
                  <th style={{ textAlign: 'center', width: '11%' }}>GST %</th>
                  <th style={{ textAlign: 'right', width: '11%' }}>GST Amount <span style={{ fontSize: '9px', display: 'block', textTransform: 'none', opacity: 0.8 }}>({(processedItems[0]?.gstRate || 18)}%)</span></th>
                  <th style={{ textAlign: 'right', width: '13%' }}>Line Total <span style={{ fontSize: '9px', display: 'block', textTransform: 'none', opacity: 0.8 }}>(Incl. Tax)</span></th>
                </tr>
              </thead>
              <tbody>
                {processedItems.map((item) => (
                  <tr key={item.id} style={{ opacity: item.isCancelled || item.isReturned ? 0.6 : 1 }}>
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#9ca3af' }}>{item.displayId}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                        {item.isReturned ? '(Returned) ' : item.isCancelled ? '(Cancelled) ' : ''}
                        {item.name}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: '1.4' }}>
                          {item.description}
                        </div>
                      )}
                      {item.sku && (
                        <span className="sku-label">SKU: {item.sku}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '500' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.singleUnitPriceBeforeGst)}</td>
                    <td style={{ textAlign: 'center', fontWeight: '500', fontSize: '11px' }}>
                      {item.delivered_at ? formatDate(item.delivered_at) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{item.gstRate}%</span>
                      <span style={{ display: 'block', marginTop: '2px', color: '#9ca3af', fontSize: '9px' }}>
                        ({item.gstRate / 2}% CGST + {item.gstRate / 2}% SGST)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.gstAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#111827' }}>{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BOTTOM SECTION */}
          <div className="inv-bottom">
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', marginTop: '11px', marginBottom: '0px', fontWeight: '500', paddingRight: '4px' }}>
              Product Purchased on: <span style={{ color: '#111827', fontWeight: '700' }}>{formatDateTime(order.created_at)}</span>
            </div>
            {/* HORIZONTAL SUMMARY */}
            <div className="inv-summary-horizontal">
              <div className="inv-summary-item">
                <div className="inv-summary-label">Subtotal (Before Tax)</div>
                <div className="inv-summary-value">{formatCurrency(subtotal)}</div>
              </div>
              <div className="inv-summary-item">
                <div className="inv-summary-label">Total GST (CGST + SGST)</div>
                <div className="inv-summary-value">
                  {formatCurrency(totalGstAmount)}
                  <span style={{ display: 'block', fontSize: '9px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>
                    ({formatCurrency(totalGstAmount / 2)} + {formatCurrency(totalGstAmount / 2)})
                  </span>
                </div>
              </div>
              {Number(order.total_amount) < grandTotal && (
                <div className="inv-summary-item">
                  <div className="inv-summary-label" style={{ color: '#d32f2f' }}>Discount Applied</div>
                  <div className="inv-summary-value" style={{ color: '#d32f2f' }}>
                    -{formatCurrency(grandTotal - Number(order.total_amount))}
                  </div>
                </div>
              )}
              <div className="inv-summary-item inv-summary-grand-total">
                <div className="inv-summary-label">GRAND TOTAL</div>
                <div className="inv-summary-value">{formatCurrency(grandTotal)}</div>
              </div>
            </div>

            {/* HORIZONTAL REFUND STATUS BAR */}
            {refundedItems.length > 0 && refundedItems.map((item) => (
              <div key={item.id} style={{ marginTop: '12px' }}>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500', paddingRight: '4px' }}>
                  Refund Created on: <span style={{ color: '#17221eff', fontWeight: '750' }}>{item.return_request?.created_at ? formatDateTime(item.return_request.created_at) : '-'}</span>
                </div>
                <div className="inv-summary-horizontal" style={{ border: '1px solid #10b981', background: '#f0fdf4' }}>
                  <div className="inv-summary-item" style={{ borderRight: '1px solid #a7f3d0', flex: 2 }}>
                    <div className="inv-summary-label" style={{ color: '#047857' }}>Returned Product</div>
                    <div className="inv-summary-value" style={{ color: '#065f46', fontSize: '13px' }}>{item.name}</div>
                  </div>
                  <div className="inv-summary-item" style={{ borderRight: '1px solid #a7f3d0', flex: 0.7 }}>
                    <div className="inv-summary-label" style={{ color: '#047857' }}>Received Date</div>
                    <div className="inv-summary-value" style={{ color: '#065f46' }}>{item.delivered_at ? formatDate(item.delivered_at) : '-'}</div>
                  </div>
                  <div className="inv-summary-item" style={{ borderRight: '1px solid #a7f3d0', flex: 0.8 }}>
                    <div className="inv-summary-label" style={{ color: '#047857' }}>Return Requested Date</div>
                    <div className="inv-summary-value" style={{ color: '#065f46' }}>{item.return_request?.created_at ? formatDate(item.return_request.created_at) : '-'}</div>
                  </div>
                  <div className="inv-summary-item" style={{ background: '#d1fae5', flex: 1 }}>
                    <div className="inv-summary-label" style={{ color: '#047857', fontWeight: '800' }}>Refund Status</div>
                    <div className="inv-summary-value" style={{ color: '#047857', fontWeight: '850', fontSize: '14px' }}>Refund Successful</div>
                    <div style={{ color: '#065f46', fontSize: '11px', fontWeight: '750', marginTop: '4px' }}>
                      Amount: {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className="inv-footer">
            <div className="inv-footer-icon-wrapper">
              <ShoppingBag size={16} />
            </div>
            <div style={{ marginTop: '4px', fontWeight: '500' }}>
              Thank you for your purchase!
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;
