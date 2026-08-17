import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

const STATUS_COLORS = {
  'Booking Created': '#3b82f6',
  'Confirmed': '#a855f7',
  'Factory Released': '#f59e0b',
  'In Production': '#10b981',
  'Dispatched': '#ec4899'
};

const mapStageToStatus = (stage) => {
  switch (stage) {
    case 'Booked': return 'Booking Created';
    case 'Confirmed Lead': return 'Confirmed';
    case 'Client (Paid)': return 'Factory Released';
    case 'In Production': return 'In Production';
    case 'Dispatched': return 'Dispatched';
    default: return 'Booking Created';
  }
};

export default function BookingsERP() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/leads`)
      .then(r => r.json())
      .then(d => {
        const activeLeads = d.leads || [];
        // Filter for Booked or beyond stages
        const erpLeads = activeLeads.filter(l => 
          ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)
        );
        
        // Map to booking objects
        const mappedBookings = erpLeads.map((l, index) => ({
          id: `BK${String(index + 1).padStart(3, '0')}`,
          client: l.name,
          product: l.interest,
          erpRef: `ERP-2026-${1000 + parseInt(l.id || index)}`,
          status: mapStageToStatus(l.stage),
          date: '2026-08-14',
          amount: `₹${parseFloat(l.budget).toLocaleString('en-IN')}`
        }));
        
        setBookings(mappedBookings);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={s.loading}>Loading ERP bookings...</div>;
  }

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
        {[['Total Bookings', bookings.length, '#a855f7'], ['Factory Released', bookings.filter(b => b.status === 'Factory Released' || b.status === 'In Production' || b.status === 'Dispatched').length, '#10b981'], ['Pending Confirm', bookings.filter(b => b.status === 'Booking Created').length, '#f59e0b']].map(([lbl, val, clr]) => (
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
        {bookings.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No bookings active.</div>}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  loading: { padding: '3rem', textAlign: 'center', color: '#64748b' },
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
