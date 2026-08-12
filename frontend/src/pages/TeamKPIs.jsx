import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

export default function TeamKPIs() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/employees`).then(r => r.json()).then(d => { setEmployees(d.employees || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.loading}>Loading team data…</div>;

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Team & KPI Performance</h1>
          <p style={s.sub}>A4 Module — Employee metrics, task tracking, and AI performance scoring</p>
        </div>
        <button style={s.addBtn}>+ Add Member</button>
      </div>

      <div style={s.grid}>
        {employees.map(emp => (
          <div key={emp.id} style={s.empCard}>
            <div style={s.empTop}>
              <div style={s.empAvatar}>{emp.name[0]}</div>
              <div>
                <div style={s.empName}>{emp.name}</div>
                <div style={s.empRole}>{emp.role}</div>
              </div>
              <div style={s.kpiScore}>{emp.kpiScore}</div>
            </div>
            <div style={s.metrics}>
              {[['Tasks Done', emp.tasksCompleted, '#a855f7'], ['Sales Closed', emp.salesClosed, '#10b981'], ['Calls', emp.callsHandled, '#3b82f6']].map(([lbl, val, clr]) => (
                <div key={lbl} style={s.metric}>
                  <div style={{...s.metricVal, color: clr}}>{val}</div>
                  <div style={s.metricLbl}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={s.kpiBar}>
              <div style={{...s.kpiBarFill, width: emp.kpiScore}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  loading: { padding:'3rem', textAlign:'center', color:'#64748b' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#08060d', margin:0 },
  sub: { fontSize:'0.78rem', color:'#64748b', marginTop:4 },
  addBtn: { padding:'0.6rem 1.25rem', backgroundColor:'#08060d', color:'#fff', border:'none', borderRadius:20, fontWeight:700, fontSize:'0.82rem', cursor:'pointer' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1.25rem' },
  empCard: { backgroundColor:'#fff', borderRadius:18, padding:'1.5rem', border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' },
  empTop: { display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'1rem' },
  empAvatar: { width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#aa3bff,#7c3aed)', color:'#fff', fontWeight:800, fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  empName: { fontWeight:800, fontSize:'0.95rem', color:'#08060d' },
  empRole: { fontSize:'0.72rem', color:'#64748b', marginTop:1 },
  kpiScore: { marginLeft:'auto', fontSize:'1.4rem', fontWeight:800, color:'#aa3bff' },
  metrics: { display:'flex', gap:'1rem', marginBottom:'0.85rem' },
  metric: { flex:1, textAlign:'center', backgroundColor:'#f8fafc', borderRadius:10, padding:'0.65rem 0' },
  metricVal: { fontSize:'1.2rem', fontWeight:800 },
  metricLbl: { fontSize:'0.62rem', color:'#94a3b8', fontWeight:600, marginTop:1 },
  kpiBar: { height:6, backgroundColor:'#f1f3f7', borderRadius:10, overflow:'hidden' },
  kpiBarFill: { height:'100%', background:'linear-gradient(90deg,#aa3bff,#3b82f6)', borderRadius:10, transition:'width 0.6s ease' }
};
