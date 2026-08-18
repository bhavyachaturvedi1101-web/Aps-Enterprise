import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/activity`).then(r => r.json()).then(d => { setLogs(d.logs || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const ICONS = {
    e1: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aa3bff" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>,
    e2: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    e3: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    system: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
  };

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
            <div style={{...s.td, fontWeight:700, color:'#08060d', display:'flex', alignItems:'center', gap:5}}>
              {ICONS[log.employeeId] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              <span>{log.employeeId}</span>
            </div>
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
