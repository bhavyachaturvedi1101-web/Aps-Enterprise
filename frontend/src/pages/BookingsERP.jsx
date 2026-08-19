import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

const STATUS_COLORS = {
  'Booking Created': '#09090b',
  'Confirmed': '#27272a',
  'Factory Released': '#52525b',
  'In Production': '#09090b',
  'Dispatched': '#71717a'
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
          erpRef: `ERP-2026-${1000 + parseInt(l.id ? l.id.replace('LEAD-', '') : index)}`,
          status: mapStageToStatus(l.stage),
          date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 Aug 2026',
          amount: `₹${parseFloat(l.budget || 0).toLocaleString('en-IN')}`
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
        </div>
      </div>

      <div style={s.statsRow}>
        {[['Total Bookings', bookings.length], ['Factory Released', bookings.filter(b => b.status === 'Factory Released' || b.status === 'In Production' || b.status === 'Dispatched').length], ['Pending Confirm', bookings.filter(b => b.status === 'Booking Created').length]].map(([lbl, val]) => (
          <div key={lbl} style={{...s.statCard, borderTopColor: '#09090b'}}>
            <div style={{...s.statNum, color: '#09090b'}}>{val}</div>
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
            <div style={{...s.td, fontWeight:700, color:'#09090b'}}>{b.id}</div>
            <div style={{...s.td, fontWeight:700, color:'#09090b'}}>{b.client}</div>
            <div style={s.td}>{b.product}</div>
            <div style={{...s.td, fontFamily:'monospace', fontSize:'0.72rem', color:'#52525b'}}>{b.erpRef}</div>
            <div style={s.td}>{b.date}</div>
            <div style={{...s.td, fontWeight:700, color:'#09090b'}}>{b.amount}</div>
            <div style={s.td}>
              <span style={{...s.pill, backgroundColor: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7'}}>
                {b.status}
              </span>
            </div>
          </div>
        ))}
        {bookings.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>No bookings active.</div>}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  loading: { padding: '3rem', textAlign: 'center', color: '#71717a' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#09090b', margin:0 },
  sub: { fontSize:'0.78rem', color:'#71717a', marginTop:4 },
  headerBadge: { backgroundColor:'#f4f4f5', color:'#09090b', border:'1px solid #e4e4e7', borderRadius:20, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700 },
  statsRow: { display:'flex', gap:'1rem', marginBottom:'1.5rem' },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:14, padding:'1.25rem', border:'1px solid #e4e4e7', borderTop:'3px solid #09090b', boxShadow:'0 2px 6px rgba(0,0,0,0.02)' },
  statNum: { fontSize:'2rem', fontWeight:800, color:'#09090b' },
  statLbl: { fontSize:'0.72rem', color:'#71717a', fontWeight:600, marginTop:2 },
  card: { backgroundColor:'#fff', borderRadius:18, border:'1px solid #e4e4e7', overflow:'hidden' },
  tableHead: { display:'flex', backgroundColor:'#f8fafc', borderBottom:'1px solid #e4e4e7', padding:'0.65rem 1.25rem', gap:'1rem' },
  th: { flex:1, fontSize:'0.65rem', fontWeight:700, color:'#71717a', textTransform:'uppercase', letterSpacing:'0.5px' },
  row: { display:'flex', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid #f4f4f5', gap:'1rem' },
  td: { flex:1, fontSize:'0.8rem', color:'#3f3f46' },
  pill: { padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700 }
};
