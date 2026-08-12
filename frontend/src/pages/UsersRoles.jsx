import React from 'react';

const USERS = [
  { id: 'u1', name: 'Animesh J', email: 'animesh@aps.in', role: 'Super Admin', module: 'A1 Voice', lastLogin: '5m ago', status: 'Online' },
  { id: 'u2', name: 'Admin', email: 'admin@aps.enterprise', role: 'A2 Admin', module: 'A2 Dashboard', lastLogin: 'Now', status: 'Online' },
  { id: 'u3', name: 'Bhavya', email: 'bhavya@aps.in', role: 'Operations', module: 'A2/A4', lastLogin: '1h ago', status: 'Away' },
  { id: 'u4', name: 'Aaditya', email: 'aaditya@aps.in', role: 'Agent', module: 'A4/A5', lastLogin: '2h ago', status: 'Offline' }
];

const STATUS_CLR = { Online:'#10b981', Away:'#f59e0b', Offline:'#94a3b8' };

export default function UsersRoles() {
  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Users & Roles</h1>
          <p style={s.sub}>Access control and permission management for APS Enterprise A2 dashboard</p>
        </div>
        <button style={s.addBtn}>+ Invite User</button>
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['User', 'Email', 'Role', 'Module', 'Last Login', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ ...s.th, flex: h === 'Email' ? 1.5 : 1 }}>{h}</div>
          ))}
        </div>
        {USERS.map(u => (
          <div key={u.id} style={s.tableRow}>
            <div style={{ ...s.td, flex: 1 }}>
              <div style={s.rowWrap}>
                <div style={s.userAvatar}>{u.name[0]}</div>
                <span style={s.userName}>{u.name}</span>
              </div>
            </div>
            <div style={{ ...s.td, flex: 1.5, color: '#64748b' }}>{u.email}</div>
            <div style={{ ...s.td, flex: 1 }}>
              <span style={s.rolePill}>{u.role}</span>
            </div>
            <div style={{ ...s.td, flex: 1, color: '#94a3b8' }}>{u.module}</div>
            <div style={{ ...s.td, flex: 1, color: '#94a3b8' }}>{u.lastLogin}</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: STATUS_CLR[u.status], marginRight: 6 }}/>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: STATUS_CLR[u.status] }}>{u.status}</span>
            </div>
            <div style={{ flex: 1 }}>
              <button style={s.editBtn}>Edit</button>
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
  addBtn: { padding: '0.6rem 1.25rem', backgroundColor: '#08060d', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' },
  card: { backgroundColor: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#475569' },
  rowWrap: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#aa3bff,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName: { fontWeight: 700, fontSize: '0.85rem', color: '#08060d' },
  rolePill: { backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-block' },
  editBtn: { padding: '4px 14px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }
};
