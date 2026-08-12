import React, { useState } from 'react';

const INVOICES = [
  { id: 'INV-001', client: 'Acme Corp', product: 'Industrial Mill', amount: '₹50,000', issued: '2026-07-30', due: '2026-08-30', status: 'Sent' },
  { id: 'INV-002', client: 'Global Tech', product: 'Hydraulic Press', amount: '₹42,000', issued: '2026-08-01', due: '2026-09-01', status: 'Draft' },
  { id: 'INV-003', client: 'Elite Builders', product: 'CNC Router', amount: '₹18,000', issued: '2026-08-03', due: '2026-09-03', status: 'Paid' },
  { id: 'INV-004', client: 'Precision Works', product: 'Plasma Cutter', amount: '₹35,000', issued: '2026-08-04', due: '2026-09-04', status: 'Sent' }
];

const STATUS = {
  Paid:  { bg: '#f0fdf4', color: '#16a34a', icon: '✅' },
  Sent:  { bg: '#eff6ff', color: '#2563eb', icon: '📤' },
  Draft: { bg: '#f8fafc', color: '#64748b', icon: '📝' }
};

export default function Invoices() {
  const [invoices] = useState(INVOICES);

  const total = invoices.reduce((sum, inv) => sum + parseInt(inv.amount.replace(/[₹,]/g, '')), 0);
  const paid = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + parseInt(inv.amount.replace(/[₹,]/g, '')), 0);
  const pending = total - paid;

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Invoices</h1>
          <p style={s.sub}>Client invoices and billing records for all APS Enterprise orders</p>
        </div>
        <button style={s.addBtn}>+ New Invoice</button>
      </div>

      {/* Summary Cards */}
      <div style={s.statsRow}>
        {[
          { label: 'Total Invoiced', val: `₹${total.toLocaleString('en-IN')}`, color: '#a855f7' },
          { label: 'Collected', val: `₹${paid.toLocaleString('en-IN')}`, color: '#10b981' },
          { label: 'Outstanding', val: `₹${pending.toLocaleString('en-IN')}`, color: '#f59e0b' },
          { label: 'Total Invoices', val: invoices.length, color: '#3b82f6' }
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...s.statCard, borderTopColor: color }}>
            <div style={{ ...s.statNum, color }}>{val}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* Invoice Table */}
      <div style={s.card}>
        <div style={s.tableHead}>
          {['Invoice ID', 'Client', 'Product', 'Issued', 'Due Date', 'Amount', 'Status', 'Action'].map(h => (
            <div key={h} style={{ ...s.th, flex: h === 'Product' ? 1.5 : 1 }}>{h}</div>
          ))}
        </div>

        {invoices.map(inv => {
          const st = STATUS[inv.status];
          return (
            <div key={inv.id} style={s.row}>
              <div style={{ ...s.td, fontWeight: 700, color: '#aa3bff', fontFamily: 'monospace', flex: 1 }}>{inv.id}</div>
              <div style={{ ...s.td, fontWeight: 700, color: '#08060d', flex: 1 }}>{inv.client}</div>
              <div style={{ ...s.td, flex: 1.5 }}>{inv.product}</div>
              <div style={{ ...s.td, flex: 1 }}>{inv.issued}</div>
              <div style={{ ...s.td, flex: 1 }}>{inv.due}</div>
              <div style={{ ...s.td, fontWeight: 700, color: '#08060d', flex: 1 }}>{inv.amount}</div>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.pill, backgroundColor: st.bg, color: st.color }}>
                  {st.icon} {inv.status}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <button style={s.actionBtn}>View ↗</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#08060d', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#64748b', marginTop: 4 },
  addBtn: { padding: '0.6rem 1.25rem', backgroundColor: '#08060d', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3px solid', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  statNum: { fontSize: '1.6rem', fontWeight: 800 },
  statLbl: { fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  row: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#475569' },
  pill: { padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 },
  actionBtn: { padding: '4px 12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }
};
