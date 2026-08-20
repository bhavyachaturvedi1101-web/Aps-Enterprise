import React, { useState, useRef, useEffect } from 'react';

const INITIAL_USERS = [
  { id: 'u1', name: 'Animesh J', email: 'animesh@aps.in', role: 'Super Admin', module: 'Voice AI', lastLogin: '5m ago', status: 'Online' },
  { id: 'u2', name: 'Admin', email: 'admin@aps.enterprise', role: 'Admin', module: 'Dashboard & Core', lastLogin: 'Now', status: 'Online' },
  { id: 'u3', name: 'Bhavya', email: 'bhavya@aps.in', role: 'Operations', module: 'Operations & CRM', lastLogin: '1h ago', status: 'Away' },
  { id: 'u4', name: 'Aaditya', email: 'aaditya@aps.in', role: 'Agent', module: 'WhatsApp & Analytics', lastLogin: '2h ago', status: 'Offline' }
];

const ROLE_STYLES = {
  'Super Admin': { bg: '#f3e8ff', color: '#7c3aed', border: '#e9d5ff' },
  'Admin':       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Operations':  { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  'Agent':       { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Telecaller':  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Accountant':  { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
};

const STATUS_STYLES = {
  Online:  { color: '#059669', bg: '#ecfdf5', dot: '#10b981', border: '#a7f3d0' },
  Away:    { color: '#d97706', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
  Offline: { color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8', border: '#cbd5e1' }
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #1e293b, #0f172a)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #f59e0b, #d97706)'
];

const ROLES = ['Super Admin', 'Admin', 'Operations', 'Telecaller', 'Accountant', 'Agent'];
const MODULES = ['Voice AI', 'Dashboard & Core', 'AI Assistant', 'Performance & KPIs', 'WhatsApp Automation', 'Operations & CRM', 'All Modules'];

// Custom Enterprise Select Component
function CustomSelect({ value, options, onChange, minWidth = 140, fullWidth = false, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block', width: fullWidth ? '100%' : 'auto' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.55rem 0.85rem',
          borderRadius: 8,
          border: '1px solid #e4e4e7',
          backgroundColor: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#09090b',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          minWidth: fullWidth ? '100%' : minWidth,
          width: fullWidth ? '100%' : 'auto',
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <span>{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#71717a"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: dropUp ? 'calc(100% + 4px)' : undefined,
            top: dropUp ? undefined : 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e4e4e7',
            boxShadow: dropUp ? '0 -10px 25px -5px rgba(0,0,0,0.12)' : '0 10px 25px -5px rgba(0,0,0,0.12)',
            zIndex: 1050,
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 200,
            overflowY: 'auto'
          }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#ffffff' : '#09090b',
                  backgroundColor: isSelected ? '#2563eb' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                <span>{opt}</span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UsersRoles() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [editingUser, setEditingUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Operations', module: 'Dashboard & Core', status: 'Online' });

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('Name (A-Z)');

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
    setNewUser({ name: '', email: '', role: 'Operations', module: 'Dashboard & Core', status: 'Online' });
  };

  // Delete user
  const handleDeleteUser = (id) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setEditingUser(null);
    }
  };

  // Filter & Sort Users
  const filteredUsers = users
    .filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.module.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All Statuses' || u.status === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'Name (A-Z)') return a.name.localeCompare(b.name);
      if (sortBy === 'Name (Z-A)') return b.name.localeCompare(a.name);
      if (sortBy === 'Role') return a.role.localeCompare(b.role);
      if (sortBy === 'Status') return a.status.localeCompare(b.status);
      return 0;
    });

  const hasActiveFilters = searchQuery || roleFilter !== 'All Roles' || statusFilter !== 'All Statuses' || sortBy !== 'Name (A-Z)';

  return (
    <div style={s.page}>
      {/* Page Header */}
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Users & Roles</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ padding: '4px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.73rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}/>
              {users.length} Active System Accounts
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 6, background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.73rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}/>
              {users.filter(u => u.status === 'Online').length} Currently Online
            </div>
          </div>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn-blue-primary" style={s.addBtn}>+ Invite User</button>
      </div>

      {/* ── Search, Filter & Sort Toolbar ───────────────────────────────── */}
      <div style={s.toolbar}>
        {/* Search Bar */}
        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search users, emails, roles, modules…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={s.clearSearchBtn} title="Clear search">✕</button>
          )}
        </div>

        {/* Filter by Role */}
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Role:</label>
          <CustomSelect
            value={roleFilter}
            options={['All Roles', ...ROLES]}
            onChange={val => setRoleFilter(val)}
            minWidth={135}
          />
        </div>

        {/* Filter by Status */}
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Status:</label>
          <CustomSelect
            value={statusFilter}
            options={['All Statuses', 'Online', 'Away', 'Offline']}
            onChange={val => setStatusFilter(val)}
            minWidth={135}
          />
        </div>

        {/* Sort By */}
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Sort by:</label>
          <CustomSelect
            value={sortBy}
            options={['Name (A-Z)', 'Name (Z-A)', 'Role', 'Status']}
            onChange={val => setSortBy(val)}
            minWidth={140}
          />
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('All Roles');
              setStatusFilter('All Statuses');
              setSortBy('Name (A-Z)');
            }}
            className="btn-red-reset"
            style={s.resetBtn}
          >
            Reset Filters
          </button>
        )}
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['User', 'Email', 'Role', 'Module Scope', 'Last Login', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ ...s.th, flex: h === 'Email' ? 1.4 : 1 }}>{h}</div>
          ))}
        </div>
        {filteredUsers.map((u, idx) => {
          const rStyle = ROLE_STYLES[u.role] || { bg: '#f4f4f5', color: '#09090b', border: '#e4e4e7' };
          const sStyle = STATUS_STYLES[u.status] || { color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8', border: '#cbd5e1' };
          const avatarBg = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
          return (
            <div key={u.id} className="table-row-hover" style={s.tableRow}>
              <div style={{ ...s.td, flex: 1 }}>
                <div style={s.rowWrap}>
                  <div style={{ ...s.userAvatar, background: avatarBg }}>{u.name[0]}</div>
                  <span style={s.userName}>{u.name}</span>
                </div>
              </div>
              <div style={{ ...s.td, flex: 1.4, color: '#64748b', fontWeight: 500 }}>{u.email}</div>
              <div style={{ ...s.td, flex: 1 }}>
                <span style={{ color: rStyle.color, fontWeight: 700, fontSize: '0.82rem' }}>
                  {u.role}
                </span>
              </div>
              <div style={{ ...s.td, flex: 1, color: '#52525b', fontWeight: 600 }}>{u.module}</div>
              <div style={{ ...s.td, flex: 1, color: '#71717a', fontSize: '0.75rem' }}>{u.lastLogin}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: sStyle.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sStyle.dot }}/>
                  {u.status}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <button onClick={() => handleEditClick(u)} className="edit-btn-hover" style={s.editBtn}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit User Modal ───────────────────────────────────────────── */}
      {editingUser && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Edit User Permissions</h3>
              <button onClick={() => setEditingUser(null)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={s.modalForm}>
              <label style={s.label}>User Name</label>
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

              <label style={s.label}>Assign Role</label>
              <CustomSelect
                value={editingUser.role}
                options={ROLES}
                onChange={r => setEditingUser({ ...editingUser, role: r })}
                fullWidth={true}
              />

              <label style={s.label}>Assign Module Scope</label>
              <CustomSelect
                value={editingUser.module}
                options={MODULES}
                onChange={m => setEditingUser({ ...editingUser, module: m })}
                fullWidth={true}
                dropUp={true}
              />

              <label style={s.label}>Account Status</label>
              <CustomSelect
                value={editingUser.status}
                options={['Online', 'Away', 'Offline']}
                onChange={st => setEditingUser({ ...editingUser, status: st })}
                fullWidth={true}
                dropUp={true}
              />

              <div style={s.modalActions}>
                <button type="button" onClick={() => handleDeleteUser(editingUser.id)} style={s.deleteBtn}>Remove User</button>
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Invite Team Member</h3>
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
              <CustomSelect
                value={newUser.role}
                options={ROLES}
                onChange={r => setNewUser({ ...newUser, role: r })}
                fullWidth={true}
              />

              <label style={s.label}>Assign Module</label>
              <CustomSelect
                value={newUser.module}
                options={MODULES}
                onChange={m => setNewUser({ ...newUser, module: m })}
                fullWidth={true}
                dropUp={true}
              />

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
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#71717a', marginTop: 4 },
  addBtn: { padding: '0.6rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' },

  // Toolbar
  toolbar: { display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, padding: '0.45rem 0.75rem', flex: '1 1 240px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#09090b', fontFamily: 'var(--font-body)', fontWeight: 500, backgroundColor: 'transparent' },
  clearSearchBtn: { border: 'none', background: 'transparent', color: '#71717a', fontSize: '0.8rem', cursor: 'pointer', padding: 0 },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  filterLabel: { fontSize: '0.73rem', fontWeight: 700, color: '#71717a' },
  selectInput: { padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #e4e4e7', backgroundColor: '#fff', fontSize: '0.8rem', color: '#09090b', outline: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
  resetBtn: { padding: '0.45rem 0.85rem', borderRadius: 8, border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)', transition: 'all 0.15s ease' },
  card: { backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e4e4e7', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#3f3f46' },
  rowWrap: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  userAvatar: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#09090b', color: '#fff', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName: { fontWeight: 700, fontSize: '0.85rem', color: '#09090b' },
  rolePill: { backgroundColor: '#f4f4f5', color: '#09090b', fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #e4e4e7', letterSpacing: '0.2px' },
  editBtn: { padding: '4px 12px', backgroundColor: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, color: '#09090b', cursor: 'pointer', transition: 'all 0.15s' },

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 480,
    padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e4e4e7'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#71717a' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#3f3f46', marginTop: 4 },
  modalInput: {
    padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #e4e4e7',
    fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', color: '#09090b'
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #e4e4e7', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#52525b' },
  deleteBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #e4e4e7', background: '#f4f4f5', color: '#71717a', cursor: 'pointer', fontWeight: 700, marginRight: 'auto' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' }
};
