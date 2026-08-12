import React, { useState } from 'react';

const TALLY_DATA = [
  { ref: 'TALLY-2024-0087', lead: 'Elite Builders', ledger: 'Advance Receipts', amount: '₹1,800', date: '2026-08-01', status: 'Reconciled' },
  { ref: 'TALLY-2024-0091', lead: 'Precision Works', ledger: 'Advance Receipts', amount: '₹3,500', date: '2026-08-03', status: 'Reconciled' },
  { ref: 'TALLY-2024-PEND', lead: 'Global Tech', ledger: 'Advance Receipts', amount: '₹4,200', date: '—', status: 'Awaiting Entry' }
];

export default function TallySync() {
  const [entries] = useState(TALLY_DATA);

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Tally Sync</h1>
          <p style={s.sub}>Tally ERP ledger sync — advance payment entries and reconciliation status</p>
        </div>
        <div style={s.tallyBadge}>💰 Tally: Connected</div>
      </div>

      {/* Summary */}
      <div style={s.statsRow}>
        {[
          { label: 'Reconciled', val: entries.filter(e => e.status === 'Reconciled').length, color: '#10b981' },
          { label: 'Awaiting Entry', val: entries.filter(e => e.status === 'Awaiting Entry').length, color: '#f59e0b' },
          { label: 'Total Entries', val: entries.length, color: '#a855f7' }
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...s.statCard, borderTopColor: color }}>
            <div style={{ ...s.statNum, color }}>{val}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* Entries Table */}
      <div style={s.card}>
        <div style={s.tableHead}>
          {['Tally Ref', 'Lead / Client', 'Ledger', 'Date', 'Amount', 'Status'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {entries.map(t => (
          <div key={t.ref} style={s.row}>
            <div style={{ ...s.td, fontWeight: 700, color: '#aa3bff', fontFamily: 'monospace' }}>{t.ref}</div>
            <div style={{ ...s.td, fontWeight: 700, color: '#08060d' }}>{t.lead}</div>
            <div style={s.td}>{t.ledger}</div>
            <div style={s.td}>{t.date}</div>
            <div style={{ ...s.td, fontWeight: 700 }}>{t.amount}</div>
            <div style={s.td}>
              <span style={{
                ...s.pill,
                backgroundColor: t.status === 'Reconciled' ? '#f0fdf4' : '#fffbeb',
                color: t.status === 'Reconciled' ? '#16a34a' : '#d97706'
              }}>
                {t.status === 'Reconciled' ? '✅' : '⏳'} {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#08060d', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#64748b', marginTop: 4 },
  tallyBadge: { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 20, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3px solid', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  statNum: { fontSize: '2rem', fontWeight: 800 },
  statLbl: { fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  row: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#475569' },
  pill: { padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }
};
