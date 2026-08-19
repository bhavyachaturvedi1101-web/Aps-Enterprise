import React, { useState } from 'react';

const INITIAL_USERS = [
  { id: 'u1', name: 'Animesh J', email: 'animesh@aps.in', role: 'Super Admin', module: 'Voice AI', lastLogin: '5m ago', status: 'Online' },
  { id: 'u2', name: 'Admin', email: 'admin@aps.enterprise', role: 'System Admin', module: 'Control Cockpit', lastLogin: 'Now', status: 'Online' },
  { id: 'u3', name: 'Bhavya', email: 'bhavya@aps.in', role: 'Operations', module: 'Operations & Analytics', lastLogin: '1h ago', status: 'Away' },
  { id: 'u4', name: 'Aaditya', email: 'aaditya@aps.in', role: 'Agent', module: 'Analytics & Automation', lastLogin: '2h ago', status: 'Offline' }
];

const STATUS_CLR = { Online: '#10b981', Away: '#f59e0b', Offline: '#94a3b8' };
const ROLES = ['Super Admin', 'System Admin', 'Operations', 'Telecaller', 'Accountant', 'Agent'];
const MODULES = ['Voice AI', 'Control Cockpit', 'AI Assistant', 'Performance Analytics', 'WhatsApp Automation', 'Operations & Analytics', 'All Modules'];

export default function UsersRoles() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [editingUser, setEditingUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Operations', module: 'Control Cockpit', status: 'Online' });


  // Open Edit Modal
  const handleEditClick = (user) => {
    setEditingUser({ ...user });
  };

  // Save Edit Changes
  const handleSaveEdit = (e) => {
    e.preventDefault();
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  // Save Invite User
  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return alert('Name and email are required');
    const created = {
      id: `u${users.length + 1}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      module: newUser.module,
      lastLogin: 'Just now',
      status: newUser.status
    };
    setUsers(prev => [created, ...prev]);
    setShowInviteModal(false);
    setNewUser({ name: '', email: '', role: 'Operations', module: 'A2 Dashboard', status: 'Online' });
  };

  // Delete user
  const handleDeleteUser = (id) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setEditingUser(null);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Users & Roles</h1>
          <p style={s.sub}>Access control and permission management for APS Enterprise A2 dashboard</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} style={s.addBtn}>+ Invite User</button>
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['User', 'Email', 'Role', 'Module', 'Last Login', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ ...s.th, flex: h === 'Email' ? 1.5 : 1 }}>{h}</div>
          ))}
        </div>
        {users.map(u => (
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
              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: STATUS_CLR[u.status] || '#94a3b8', marginRight: 6 }}/>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: STATUS_CLR[u.status] || '#94a3b8' }}>{u.status}</span>
            </div>
            <div style={{ flex: 1 }}>
              <button onClick={() => handleEditClick(u)} style={s.editBtn}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit User Modal ───────────────────────────────────────────── */}
      {editingUser && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>Edit User & Access Permissions</h3>
              <button onClick={() => setEditingUser(null)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={s.modalForm}>
              <label style={s.label}>Full Name</label>
              <input
                required
                style={s.modalInput}
                value={editingUser.name}
                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
              />

              <label style={s.label}>Email Address</label>
              <input
                required
                type="email"
                style={s.modalInput}
                value={editingUser.email}
                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
              />

              <label style={s.label}>Role & Permissions</label>
              <select
                style={s.modalInput}
                value={editingUser.role}
                onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <label style={s.label}>Module Access</label>
              <select
                style={s.modalInput}
                value={editingUser.module}
                onChange={e => setEditingUser({ ...editingUser, module: e.target.value })}
              >
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <label style={s.label}>Status</label>
              <select
                style={s.modalInput}
                value={editingUser.status}
                onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
              >
                <option value="Online">Online</option>
                <option value="Away">Away</option>
                <option value="Offline">Offline</option>
              </select>

              <div style={s.modalActions}>
                <button type="button" onClick={() => handleDeleteUser(editingUser.id)} style={s.deleteBtn}>Delete User</button>
                <button type="button" onClick={() => setEditingUser(null)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invite User Modal ─────────────────────────────────────────── */}
      {showInviteModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>Invite New User</h3>
              <button onClick={() => setShowInviteModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleInviteSubmit} style={s.modalForm}>
              <label style={s.label}>Full Name</label>
              <input
                required
                placeholder="e.g. Ramesh Kumar"
                style={s.modalInput}
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              />

              <label style={s.label}>Email Address</label>
              <input
                required
                type="email"
                placeholder="ramesh@aps.in"
                style={s.modalInput}
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />

              <label style={s.label}>Assign Role</label>
              <select
                style={s.modalInput}
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <label style={s.label}>Assign Module</label>
              <select
                style={s.modalInput}
                value={newUser.module}
                onChange={e => setNewUser({ ...newUser, module: e.target.value })}
              >
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowInviteModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
  editBtn: { padding: '4px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer', transition: 'all 0.15s' },

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 480,
    padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: 4 },
  modalInput: {
    padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1',
    fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)'
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 },
  deleteBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, marginRight: 'auto' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 20, border: 'none', background: '#08060d', color: '#fff', cursor: 'pointer', fontWeight: 700 }
};
