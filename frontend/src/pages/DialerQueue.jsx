import React, { useState } from 'react';

const MOCK_CALLS = [
  { id: 'C001', name: 'Horizon Industries', phone: '+91 98765 43210', product: 'CNC Machine', status: 'Queued', priority: 'High', agent: 'A1 AI' },
  { id: 'C002', name: 'BlueStar Fab', phone: '+91 87654 32109', product: 'Laser Cutter', status: 'In Progress', priority: 'Normal', agent: 'A1 AI' },
  { id: 'C003', name: 'RiverTech', phone: '+91 76543 21098', product: 'Plasma Cutter', status: 'Queued', priority: 'Normal', agent: 'A1 AI' },
  { id: 'C004', name: 'Apex Steel', phone: '+91 65432 10987', product: 'Sheet Bender', status: 'Completed', priority: 'Low', agent: 'Telecaller' },
  { id: 'C005', name: 'PrimeMake', phone: '+91 54321 09876', product: 'Hydraulic Press', status: 'Failed', priority: 'High', agent: 'A1 AI' }
];

const STATUS_CLR = { Queued:'#3b82f6', 'In Progress':'#a855f7', Completed:'#10b981', Failed:'#f43f5e' };

export default function DialerQueue() {
  const [calls] = useState(MOCK_CALLS);
  const stats = [
    { label: 'In Queue', val: calls.filter(c => c.status === 'Queued').length, color: '#3b82f6' },
    { label: 'Active Call', val: calls.filter(c => c.status === 'In Progress').length, color: '#a855f7' },
    { label: 'Completed Today', val: calls.filter(c => c.status === 'Completed').length, color: '#10b981' },
    { label: 'Failed', val: calls.filter(c => c.status === 'Failed').length, color: '#f43f5e' }
  ];

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Dialer Queue</h1>
          <p style={s.sub}>A1 Voice Agent call queue — real-time call status from Dialer integration</p>
        </div>
        <div style={s.liveBadge}>🔴 Dialer: Live</div>
      </div>

      <div style={s.statsRow}>
        {stats.map(st => (
          <div key={st.label} style={{...s.statCard, borderTopColor: st.color}}>
            <div style={{...s.statNum, color: st.color}}>{st.val}</div>
            <div style={s.statLbl}>{st.label}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['Call ID', 'Contact', 'Phone', 'Product Interest', 'Agent', 'Priority', 'Status'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {calls.map(call => (
          <div key={call.id} style={s.row}>
            <div style={{...s.td, fontWeight:700, color:'#aa3bff', fontFamily:'monospace'}}>{call.id}</div>
            <div style={{...s.td, fontWeight:700, color:'#08060d'}}>{call.name}</div>
            <div style={{...s.td, fontFamily:'monospace', fontSize:'0.75rem'}}>{call.phone}</div>
            <div style={s.td}>{call.product}</div>
            <div style={s.td}>{call.agent}</div>
            <div style={s.td}><span style={{...s.pill, backgroundColor: call.priority==='High'?'#fee2e2':'#f1f5f9', color: call.priority==='High'?'#b91c1c':'#64748b'}}>{call.priority}</span></div>
            <div style={s.td}><span style={{...s.pill, backgroundColor: STATUS_CLR[call.status]+'20', color: STATUS_CLR[call.status]}}>{call.status}</span></div>
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
  liveBadge: { backgroundColor:'#fee2e2', color:'#b91c1c', border:'1px solid #fecaca', borderRadius:20, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700 },
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
