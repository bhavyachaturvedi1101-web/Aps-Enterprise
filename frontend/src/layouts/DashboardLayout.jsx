import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

// ─── Nav Structure (APS Enterprise specific) ────────────────────────────────
const NAV_GROUPS = [
  {
    group: 'PLATFORM',
    items: [
      {
        key: 'analytics', label: 'Dashboard', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
      },
      {
        key: 'users', label: 'Users & Roles', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      }
    ]
  },
  {
    group: 'OPERATIONS',
    items: [
      {
        key: 'pipeline', label: 'CRM / Leads', badge: '7',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      },
      {
        key: 'bookings', label: 'Bookings & ERP', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      },
      {
        key: 'payments', label: 'Payment Gate', badge: '1',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      }
    ]
  },
  {
    group: 'AI AGENTS',
    items: [
      {
        key: 'voice', label: 'AI Voice Agent', badge: 'Live',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
      },
      {
        key: 'whatsapp', label: 'WhatsApp Agent', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      },
      {
        key: 'dialer', label: 'Dialer Queue', badge: '12',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      }
    ]
  },
  {
    group: 'FINANCE',
    items: [
      {
        key: 'tally', label: 'Tally Sync', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      },
      {
        key: 'invoices', label: 'Invoices', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      }
    ]
  },
  {
    group: 'PRODUCTIVITY',
    items: [
      {
        key: 'build', label: 'Team & KPIs', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      },
      {
        key: 'activity', label: 'Activity Log', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      },
      {
        key: 'settings', label: 'Settings', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      }
    ]
  }
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const path = location.pathname;
  const queryParams = new URLSearchParams(location.search);
  const activeTab =
    queryParams.get('tab') ||
    (path === '/users'     ? 'users'     :
     path === '/bookings'  ? 'bookings'  :
     path === '/payments'  ? 'payments'  :
     path === '/voice'     ? 'voice'     :
     path === '/whatsapp'  ? 'whatsapp'  :
     path === '/dialer'    ? 'dialer'    :
     path === '/tally'     ? 'tally'     :
     path === '/invoices'  ? 'invoices'  :
     path === '/employees' ? 'build'     :
     path === '/activity'  ? 'activity'  :
     path === '/settings'  ? 'settings'  : 'analytics');


  const handleTabChange = (key) => {
    const routes = {
      analytics:  '/dashboard?tab=analytics',
      pipeline:   '/dashboard?tab=pipeline',
      users:      '/users',
      bookings:   '/bookings',
      payments:   '/payments',
      voice:      '/voice',
      whatsapp:   '/whatsapp',
      dialer:     '/dialer',
      tally:      '/tally',
      invoices:   '/invoices',
      build:      '/employees',
      activity:   '/activity',
      settings:   '/settings'
    };
    navigate(routes[key] || '/dashboard?tab=analytics');
  };

  return (
    <div style={s.container}>

      {/* ─── TOP HEADER ─────────────────────────────────────────────────── */}
      <header style={s.header}>
        {/* Logo */}
        <div style={s.logoSection} onClick={() => navigate('/dashboard')}>
          <div style={s.logoIconWrap}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2L2 7v10l10 5 10-5V7z" fill="rgba(255,255,255,0.2)"/>
              <polyline points="12 22 12 12 22 7"/>
              <polyline points="12 12 2 7"/>
            </svg>
          </div>
          <span style={s.logoText}>APS Enterprise</span>
        </div>

        {/* Center Pills */}
        <div style={s.pillContainer}>
          {[
            { key: 'analytics', label: 'AI Strategy' },
            { key: 'pipeline',  label: 'Lead Pipeline' },
            { key: 'build',     label: 'Team KPIs' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{ ...s.pillButton, ...(activeTab === key ? s.pillActive : s.pillInactive) }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div style={{ ...s.headerRight, position: 'relative' }}>
          {/* Notification Bell */}
          <div style={s.notifWrap} onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div style={s.notifDot}/>
          </div>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div style={s.dropdownPanel}>
              <div style={s.dropdownHeader}>System Notifications</div>
              <div style={s.notifItem}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#08060d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Payment Gate Pending</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Acme Manufacturing 10% advance verification required.</div>
              </div>
              <div style={s.notifItem}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#08060d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
                  <span>AI Voice Calls Active</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>12 automated calls processed this morning.</div>
              </div>
              <div style={s.notifItem}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#08060d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>WhatsApp Automation</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Sequence WA-003 delivered to Global Tech.</div>
              </div>
            </div>
          )}

          {/* User Widget */}
          <div style={s.userWidget} onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}>
            <div style={s.userAvatarInitial}>A</div>
            <div style={s.userInfo}>
              <div style={s.userName}>Admin</div>
              <div style={s.userRole}>System Administrator</div>
            </div>
            <svg style={s.dropdownIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* Profile Dropdown */}
          {userMenuOpen && (
            <div style={{ ...s.dropdownPanel, right: 0, width: 200 }}>
              <div style={s.dropdownHeader}>Signed in as Admin</div>
              <div style={s.menuItem} onClick={() => { handleTabChange('settings'); setUserMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>System Settings</span>
              </div>
              <div style={s.menuItem} onClick={() => { handleTabChange('users'); setUserMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Users & Roles</span>
              </div>
              <div style={{ ...s.menuItem, color: '#ef4444' }} onClick={() => navigate('/login')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── BODY: SIDEBAR + MAIN ───────────────────────────────────────── */}
      <div style={s.bodyWrapper}>

        {/* ─── SIDEBAR ──────────────────────────────────────────────────── */}
        <aside style={s.sidebar}>

          {/* Scrollable Nav */}
          <div style={s.sidebarScroll}>
            {NAV_GROUPS.map((group) => (
              <div key={group.group} style={s.navGroup}>
                <div style={s.navGroupLabel}>{group.group}</div>
                {group.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleTabChange(item.key)}
                      style={isActive ? s.navItemActive : s.navItem}
                    >
                      {isActive && <div style={s.activePill}/>}
                      <span style={isActive ? s.navIconActive : s.navIcon}>{item.icon}</span>
                      <span style={isActive ? s.navLabelActive : s.navLabel}>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          ...s.badge,
                          backgroundColor: item.badge === 'Live' ? 'rgba(16,185,129,0.2)' : 'rgba(170,59,255,0.2)',
                          color: item.badge === 'Live' ? '#10b981' : '#c084fc'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom user card */}
          <div style={s.sidebarBottom}>
            <div style={s.sidebarDivider}/>
            <div style={s.userCard}>
              <div style={s.sidebarInitial}>A</div>
              <div style={s.userCardInfo}>
                <div style={s.userCardName}>admin</div>
                <div style={s.userCardEmail}>admin@aps.enterprise</div>
              </div>
              <button onClick={() => navigate('/login')} style={s.logoutBtn} title="Logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main style={s.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  container: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden'
  },

  // ── Header
  header: {
    height: 62,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.75rem', zIndex: 20, flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  logoSection: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer'
  },
  logoIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    background: 'linear-gradient(135deg,#aa3bff,#7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 3px 10px rgba(170,59,255,0.35)'
  },
  logoText: {
    fontFamily: 'var(--font-heading)', fontSize: '1.1rem',
    fontWeight: 800, color: '#08060d', letterSpacing: '-0.3px'
  },
  pillContainer: {
    display: 'flex', backgroundColor: '#f1f3f7',
    padding: '3px', borderRadius: 28, gap: 2
  },
  pillButton: {
    padding: '6px 18px', border: 'none', borderRadius: 22,
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', fontFamily: 'var(--font-body)'
  },
  pillActive: { backgroundColor: '#08060d', color: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.12)' },
  pillInactive: { backgroundColor: 'transparent', color: '#64748b' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  notifWrap: {
    position: 'relative', width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: '50%',
    backgroundColor: '#f43f5e', border: '1.5px solid #fff'
  },
  userWidget: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    cursor: 'pointer', padding: '5px 10px', borderRadius: 28,
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc'
  },
  userAvatarInitial: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #aa3bff, #7c3aed)',
    color: '#fff', fontWeight: 800, fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontFamily: 'var(--font-heading)'
  },
  userInfo: { display: 'flex', flexDirection: 'column' },
  userName: { fontSize: '0.8rem', fontWeight: 700, color: '#08060d', lineHeight: 1.2 },
  userRole: { fontSize: '0.68rem', color: '#64748b', fontWeight: 500 },
  dropdownIcon: { color: '#94a3b8' },

  // ── Body
  bodyWrapper: { display: 'flex', flexGrow: 1, overflow: 'hidden' },

  // ── Sidebar
  sidebar: {
    width: 220, flexShrink: 0,
    background: 'linear-gradient(180deg,#0d0b1a 0%,#131026 50%,#0a0e1a 100%)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '3px 0 20px rgba(0,0,0,0.2)',
    zIndex: 10
  },
  sidebarScroll: {
    flex: 1, overflowY: 'auto', padding: '1.25rem 0.75rem 0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    scrollbarWidth: 'none'
  },
  navGroup: { marginBottom: '0.5rem' },
  navGroupLabel: {
    fontSize: '0.58rem', fontWeight: 700, letterSpacing: '1.2px',
    color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
    padding: '0.65rem 0.75rem 0.35rem', userSelect: 'none'
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 10,
    border: 'none', background: 'transparent', cursor: 'pointer',
    position: 'relative', transition: 'background 0.15s', textAlign: 'left'
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 10,
    border: 'none', background: 'rgba(99,102,241,0.14)',
    cursor: 'pointer', position: 'relative', textAlign: 'left',
    boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.2)'
  },
  activePill: {
    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
    width: 3, height: 20, borderRadius: '0 3px 3px 0',
    background: 'linear-gradient(180deg,#818cf8,#6366f1)',
    boxShadow: '0 0 8px rgba(99,102,241,0.8)'
  },
  navIcon: { color: 'rgba(255,255,255,0.65)', display: 'flex', flexShrink: 0 },
  navIconActive: { color: '#a5b4fc', display: 'flex', flexShrink: 0 },
  navLabel: {
    fontSize: '0.82rem', fontWeight: 500,
    color: 'rgba(255,255,255,0.75)', flex: 1, fontFamily: 'var(--font-body)'
  },
  navLabelActive: {
    fontSize: '0.82rem', fontWeight: 600,
    color: '#e2e8f0', flex: 1, fontFamily: 'var(--font-body)'
  },
  badge: {
    fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px',
    borderRadius: 20, flexShrink: 0
  },

  // ── Sidebar Bottom
  sidebarBottom: { padding: '0 0.75rem 1rem', flexShrink: 0 },
  sidebarDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: '0.85rem' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.65rem 0.75rem', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)'
  },
  sidebarInitial: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 800, color: '#fff', flexShrink: 0
  },
  userCardInfo: { flex: 1, minWidth: 0 },
  userCardName: {
    fontSize: '0.8rem', fontWeight: 700, color: '#fff',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  },
  userCardEmail: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 },
  logoutBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(248,113,113,0.65)', cursor: 'pointer',
    padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center'
  },

  // ── Main Content
  mainContent: { flexGrow: 1, overflowY: 'auto', position: 'relative', backgroundColor: 'var(--bg-primary)' },

  // ── Dropdowns
  dropdownPanel: { position: 'absolute', top: 46, right: 0, width: 280, backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  dropdownHeader: { fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 },
  notifItem: { padding: '8px', borderRadius: 8, backgroundColor: '#f8fafc', borderLeft: '3px solid #aa3bff', display: 'flex', flexDirection: 'column', gap: 2 },
  menuItem: { padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }
};
