import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/activity`).then(r => r.json()).then(d => { setLogs(d.logs || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const ICONS = { e1:'🎙️', e2:'⚙️', e3:'📊', system:'🤖' };

  if (loading) return <div style={s.loading}>Loading activity…</div>;

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Activity & Audit Log</h1>
          <p style={s.sub}>Full audit trail of all lead transitions, payments, and team actions</p>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['Time', 'Employee', 'Action', 'From Stage', 'To Stage'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {logs.map(log => (
          <div key={log.id} style={s.tableRow}>
            <div style={s.td}>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
            <div style={{...s.td, fontWeight:700, color:'#08060d'}}>{ICONS[log.employeeId] || '👤'} {log.employeeId}</div>
            <div style={{...s.td, flex:2, fontSize:'0.75rem', color:'#475569'}}>{log.action}</div>
            <div style={s.td}><span style={{...s.stagePill, backgroundColor:'#f1f5f9', color:'#64748b'}}>{log.fromStage}</span></div>
            <div style={s.td}><span style={{...s.stagePill, backgroundColor:'#f0fdf4', color:'#16a34a'}}>{log.toStage}</span></div>
          </div>
        ))}
        {logs.length === 0 && <div style={s.empty}>No activity recorded yet.</div>}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  loading: { padding:'3rem', textAlign:'center', color:'#64748b' },
  pageHead: { marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#08060d', margin:0 },
  sub: { fontSize:'0.78rem', color:'#64748b', marginTop:4 },
  card: { backgroundColor:'#fff', borderRadius:18, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' },
  tableHead: { display:'flex', backgroundColor:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'0.65rem 1.25rem', gap:'1rem' },
  th: { flex:1, fontSize:'0.68rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px' },
  tableRow: { display:'flex', alignItems:'center', padding:'0.9rem 1.25rem', borderBottom:'1px solid #f1f5f9', gap:'1rem' },
  td: { flex:1, fontSize:'0.8rem', color:'#475569', fontWeight:500 },
  stagePill: { padding:'2px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700 },
  empty: { padding:'2rem', textAlign:'center', color:'#94a3b8', fontSize:'0.82rem' }
};
