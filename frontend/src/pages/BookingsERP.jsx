import React, { useState } from 'react';

const MOCK_BOOKINGS = [
  { id: 'BK001', client: 'Acme Corp', product: 'Industrial Mill', erpRef: 'ERP-2024-0112', status: 'Booking Created', date: '2026-07-30', amount: '₹50,000' },
  { id: 'BK002', client: 'Global Tech', product: 'Hydraulic Press', erpRef: 'ERP-2024-0118', status: 'Confirmed', date: '2026-08-01', amount: '₹42,000' },
  { id: 'BK003', client: 'Elite Builders', product: 'CNC Router', erpRef: 'ERP-2024-0122', status: 'Factory Released', date: '2026-08-03', amount: '₹18,000' },
  { id: 'BK004', client: 'Precision Works', product: 'Plasma Cutter', erpRef: 'ERP-2024-0125', status: 'In Production', date: '2026-08-04', amount: '₹35,000' }
];

const STATUS_COLORS = {
  'Booking Created': '#3b82f6', 'Confirmed': '#a855f7',
  'Factory Released': '#f59e0b', 'In Production': '#10b981'
};

export default function BookingsERP() {
  const [bookings] = useState(MOCK_BOOKINGS);

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Bookings & ERP</h1>
          <p style={s.sub}>ERP integration layer — booking configurations and factory release tracking</p>
        </div>
        <div style={s.headerBadge}>ERP: Live ✓</div>
      </div>

      <div style={s.statsRow}>
        {[['Total Bookings', bookings.length, '#a855f7'], ['Factory Released', bookings.filter(b => b.status === 'Factory Released' || b.status === 'In Production').length, '#10b981'], ['Pending Confirm', bookings.filter(b => b.status === 'Booking Created').length, '#f59e0b']].map(([lbl, val, clr]) => (
          <div key={lbl} style={{...s.statCard, borderTopColor: clr}}>
            <div style={{...s.statNum, color: clr}}>{val}</div>
            <div style={s.statLbl}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['Booking ID', 'Client', 'Product', 'ERP Reference', 'Date', 'Amount', 'Status'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {bookings.map(b => (
          <div key={b.id} style={s.row}>
            <div style={{...s.td, fontWeight:700, color:'#aa3bff'}}>{b.id}</div>
            <div style={{...s.td, fontWeight:700, color:'#08060d'}}>{b.client}</div>
            <div style={s.td}>{b.product}</div>
            <div style={{...s.td, fontFamily:'monospace', fontSize:'0.72rem'}}>{b.erpRef}</div>
            <div style={s.td}>{b.date}</div>
            <div style={{...s.td, fontWeight:700}}>{b.amount}</div>
            <div style={s.td}>
              <span style={{...s.pill, backgroundColor: STATUS_COLORS[b.status]+'20', color: STATUS_COLORS[b.status]}}>
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#08060d', margin:0 },
  sub: { fontSize:'0.78rem', color:'#64748b', marginTop:4 },
  headerBadge: { backgroundColor:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0', borderRadius:20, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700 },
  statsRow: { display:'flex', gap:'1rem', marginBottom:'1.5rem' },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:14, padding:'1.25rem', border:'1px solid #e2e8f0', borderTop:'3px solid', boxShadow:'0 2px 6px rgba(0,0,0,0.04)' },
  statNum: { fontSize:'2rem', fontWeight:800 },
  statLbl: { fontSize:'0.72rem', color:'#64748b', fontWeight:600, marginTop:2 },
  card: { backgroundColor:'#fff', borderRadius:18, border:'1px solid #e2e8f0', overflow:'hidden' },
  tableHead: { display:'flex', backgroundColor:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'0.65rem 1.25rem', gap:'1rem' },
  th: { flex:1, fontSize:'0.65rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px' },
  row: { display:'flex', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid #f1f5f9', gap:'1rem' },
  td: { flex:1, fontSize:'0.8rem', color:'#475569' },
  pill: { padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700 }
};
