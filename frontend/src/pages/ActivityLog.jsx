import React, { useEffect, useState } from 'react';
import { MOCK_ACTIVITY_LOGS } from '../mockData';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState(MOCK_ACTIVITY_LOGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/activity`).then(r => r.json()).then(d => { setLogs(d.activityLogs || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const ICONS = {
    e1: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>,
    e2: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    e3: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    system: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg>
  };

  if (loading) return <div style={s.loading}>Loading activity…</div>;

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Activity & Audit Log</h1>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['Time', 'Employee', 'Action', 'From Stage', 'To Stage'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {logs.map(log => (
          <div key={log.id} className="table-row-hover" style={s.tableRow}>
            <div style={{ ...s.td, fontSize: '0.74rem', color: '#475569' }}>
              {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {' '}
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ ...s.td, fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: 5 }}>
              {ICONS[log.employeeId] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
              <span>{log.employeeName || log.employeeId}</span>
            </div>
            <div style={{ ...s.td, flex: 2, fontSize: '0.75rem', color: '#52525b' }}>{log.action}</div>
            <div style={s.td}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#94a3b8' }} />
                {log.fromStage}
              </span>
            </div>
            <div style={s.td}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                {log.toStage}
              </span>
            </div>
          </div>
        ))}
        {logs.length === 0 && <div style={s.empty}>No activity recorded yet.</div>}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  loading: { padding: '3rem', textAlign: 'center', color: '#71717a' },
  pageHead: { marginBottom: '1.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#71717a', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e4e4e7', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.68rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '0.9rem 1.25rem', borderBottom: '1px solid #f4f4f5', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#3f3f46', fontWeight: 500 },
  stagePill: { padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 },
  empty: { padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }
};
