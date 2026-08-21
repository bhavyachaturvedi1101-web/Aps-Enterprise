import React, { useState } from 'react';

const INITIAL_TAX_INVOICES = [
  { id: 'INV-2026-8801', client: 'Apex Metalcraft', gstNo: '27AAAAA1122A1Z1', poNo: 'PO-9912', product: 'Heavy Duty CNC Router 500T', hsnCode: '8466', baseAmount: 150000, gst: 27000, issued: '2026-08-01', due: '2026-08-31', status: 'Sent', paymentTerms: 'Net 30 Days' },
  { id: 'INV-2026-8802', client: 'Tata Heavy Tools', gstNo: '27BBBBB3344B1Z2', poNo: 'PO-9915', product: '200T Hydraulic Press Machine', hsnCode: '8462', baseAmount: 420000, gst: 75600, issued: '2026-08-03', due: '2026-08-18', status: 'Draft', paymentTerms: 'Immediate Deposit' },
  { id: 'INV-2026-8803', client: 'Kirloskar Forge', gstNo: '27CCCC5566C1Z3', poNo: 'PO-9920', product: 'Laser Cutting Automation Arm', hsnCode: '8456', baseAmount: 280000, gst: 50400, issued: '2026-08-05', due: '2026-09-05', status: 'Paid', paymentTerms: '10% Advance Paid' },
  { id: 'INV-2026-8804', client: 'Godrej Process Eq', gstNo: '27DDDDD7788D1Z4', poNo: 'PO-9924', product: 'Factory Automated Conveyor Line', hsnCode: '8428', baseAmount: 95000, gst: 17100, issued: '2026-08-07', due: '2026-09-07', status: 'Sent', paymentTerms: 'Net 30 Days' }
];

export default function Invoices() {
  const [invoices, setInvoices] = useState(INITIAL_TAX_INVOICES);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [newInv, setNewInv] = useState({ client: '', product: '', baseAmount: '120000', poNo: 'PO-9940' });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (!newInv.client || !newInv.product) return;
    const base = parseFloat(newInv.baseAmount);
    const invObj = {
      id: `INV-2026-880${invoices.length + 1}`,
      client: newInv.client,
      gstNo: '27AAAAA0000A1Z5',
      poNo: newInv.poNo || 'PO-9940',
      product: newInv.product,
      hsnCode: '8466',
      baseAmount: base,
      gst: Math.round(base * 0.18),
      issued: new Date().toISOString().split('T')[0],
      due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Sent',
      paymentTerms: 'Net 30 Days'
    };
    setInvoices(prev => [invObj, ...prev]);
    setShowModal(false);
    showToast(`Invoice "${invObj.id}" generated & saved!`);
  };

  const handleDispatchWhatsAppPDF = (inv) => {
    showToast(`GST Tax Invoice PDF "${inv.id}" dispatched to ${inv.client} via WhatsApp!`);
  };

  return (
    <div style={s.page}>
      {toastMessage && (
        <div style={s.toast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Customer Billing & PDF Tax Invoices</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-blue-primary" style={s.addBtn}>
          + Create Tax Invoice
        </button>
      </div>

      {/* Invoice Visual Cards Grid */}
      <div style={s.cardsGrid}>
        {invoices.map(inv => {
          const grandTotal = inv.baseAmount + inv.gst;
          const isPaid = inv.status === 'Paid';
          return (
            <div key={inv.id} style={s.invoiceCard}>
              <div style={s.cardHead}>
                <div>
                  <span style={s.invBadge}>{inv.id}</span>
                  <div style={s.clientTitle}>{inv.client}</div>
                  <div style={s.poText}>PO Ref: {inv.poNo}</div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  backgroundColor: isPaid ? '#f0fdf4' : '#eff6ff',
                  color: isPaid ? '#16a34a' : '#2563eb'
                }}>
                  {inv.status}
                </span>
              </div>

              <div style={s.cardBody}>
                <div style={s.productName}>{inv.product}</div>
                <div style={s.hsnText}>HSN Code: {inv.hsnCode} | GST Rate: 18%</div>
                
                <div style={s.amountRow}>
                  <div>
                    <div style={s.subLbl}>Base Rate</div>
                    <div style={s.subVal}>₹{inv.baseAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={s.subLbl}>GST Amount</div>
                    <div style={s.subVal}>₹{inv.gst.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={s.subLbl}>Grand Total</div>
                    <div style={s.totalVal}>₹{grandTotal.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              <div style={s.cardFooter}>
                <button onClick={() => setViewInvoice(inv)} style={s.previewBtn}>
                  Preview & Print PDF
                </button>
                <button onClick={() => handleDispatchWhatsAppPDF(inv)} style={s.waBtn}>
                  Send WhatsApp PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Invoice Modal */}
      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New Customer Invoice</h3>
              <button onClick={() => setShowModal(false)} style={s.closeModalBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} style={s.modalForm}>
              <label style={s.label}>Client Name</label>
              <input
                required
                style={s.modalInput}
                placeholder="e.g. Mahindra Heavy Tech"
                value={newInv.client}
                onChange={e => setNewInv({ ...newInv, client: e.target.value })}
              />
              <label style={s.label}>PO Reference Number</label>
              <input
                style={s.modalInput}
                placeholder="PO-9940"
                value={newInv.poNo}
                onChange={e => setNewInv({ ...newInv, poNo: e.target.value })}
              />
              <label style={s.label}>Machine / Product Description</label>
              <input
                required
                style={s.modalInput}
                placeholder="e.g. Robotic Welder Station v4"
                value={newInv.product}
                onChange={e => setNewInv({ ...newInv, product: e.target.value })}
              />
              <label style={s.label}>Base Subtotal Rate (₹)</label>
              <input
                required
                type="number"
                style={s.modalInput}
                placeholder="120000"
                value={newInv.baseAmount}
                onChange={e => setNewInv({ ...newInv, baseAmount: e.target.value })}
              />
              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Generate Invoice Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice Modal */}
      {viewInvoice && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 640, padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #08060d', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#08060d', fontFamily: 'var(--font-heading)' }}>APS ENTERPRISE CO.</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Industrial Machinery & Automation Systems</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>GSTIN: 27AAAAA0000A1Z5 | HSN: {viewInvoice.hsnCode}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', fontFamily: 'monospace' }}>TAX INVOICE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>{viewInvoice.id}</div>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>PO Ref: {viewInvoice.poNo}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', fontSize: '0.8rem' }}>
              <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Billed To Client:</div>
              <div style={{ fontWeight: 800, color: '#08060d', fontSize: '0.95rem', marginTop: 2 }}>{viewInvoice.client}</div>
              <div style={{ color: '#64748b', marginTop: 2 }}>GSTIN: {viewInvoice.gstNo} | Terms: {viewInvoice.paymentTerms}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', color: '#475569' }}>Machine Specs</th>
                  <th style={{ padding: '8px 12px', color: '#475569' }}>Base Rate</th>
                  <th style={{ padding: '8px 12px', color: '#475569' }}>GST (18%)</th>
                  <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#08060d' }}>{viewInvoice.product}</td>
                  <td style={{ padding: '10px 12px' }}>₹{viewInvoice.baseAmount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>₹{viewInvoice.gst.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>₹{(viewInvoice.baseAmount + viewInvoice.gst).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                <div><strong>Bank:</strong> HDFC Bank Ltd (Commercial Banking)</div>
                <div><strong>A/C No:</strong> 50200098765432</div>
                <div><strong>IFSC:</strong> HDFC0001234</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>
                  Grand Total: ₹{(viewInvoice.baseAmount + viewInvoice.gst).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={s.modalActions}>
              <button onClick={() => window.print()} style={{ ...s.submitBtn, backgroundColor: '#09090b' }}>
                Print Tax Invoice
              </button>
              <button onClick={() => setViewInvoice(null)} style={s.cancelBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: '2rem 2.5rem', fontFamily: 'var(--font-body)', maxWidth: 1440, margin: '0 auto' },
  toast: { position: 'fixed', bottom: 24, right: 24, backgroundColor: '#09090b', color: '#fff', padding: '0.8rem 1.4rem', borderRadius: 14, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 2000, fontSize: '0.85rem', fontWeight: 600 },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.8rem', color: '#71717a', marginTop: 4 },
  addBtn: { backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' },
  invoiceCard: { backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e4e4e7', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  invBadge: { fontSize: '0.75rem', fontWeight: 800, color: '#09090b', fontFamily: 'monospace' },
  clientTitle: { fontSize: '1rem', fontWeight: 800, color: '#09090b', marginTop: 2 },
  poText: { fontSize: '0.72rem', color: '#71717a', marginTop: 1 },
  cardBody: { borderTop: '1px solid #f4f4f5', borderBottom: '1px solid #f4f4f5', padding: '0.85rem 0', margin: '0.5rem 0' },
  productName: { fontSize: '0.88rem', fontWeight: 700, color: '#09090b' },
  hsnText: { fontSize: '0.72rem', color: '#71717a', marginTop: 2, marginBottom: '0.75rem' },
  amountRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1px solid #e4e4e7' },
  subLbl: { fontSize: '0.65rem', color: '#71717a', fontWeight: 700 },
  subVal: { fontSize: '0.8rem', fontWeight: 700, color: '#52525b' },
  totalVal: { fontSize: '0.95rem', fontWeight: 800, color: '#09090b' },
  cardFooter: { display: 'flex', gap: 8, marginTop: '0.5rem' },
  previewBtn: { flex: 1, padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' },
  waBtn: { flex: 1, padding: '6px 12px', backgroundColor: '#ffffff', color: '#09090b', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 450, padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e4e4e7' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#71717a' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#3f3f46', marginTop: 4 },
  modalInput: { padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #e4e4e7', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', color: '#09090b' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#52525b' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }
};
