import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OPERATORS_LIST = [
  {
    role: 'admin',
    name: 'Super Admin',
    email: 'admin@apsenterprises.in',
    panel: 'Super Admin Panel',
    subtitle: 'Full System Control • Users & Settings',
    badge: 'ALL ACCESS',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309'
  },
  {
    role: 'manager',
    name: 'Operations Manager',
    email: 'manager@apsenterprises.in',
    panel: 'Operations & Plant Panel',
    subtitle: 'Factory Orders • Bookings • AI Suite',
    badge: 'OPERATIONS',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8'
  },
  {
    role: 'accountant',
    name: 'Accounts Officer',
    email: 'accounts@apsenterprises.in',
    panel: 'Accounts & ERP Panel',
    subtitle: 'Tally Prime Sync • Invoices • 10% Gate',
    badge: 'FINANCE',
    badgeBg: '#ede9fe',
    badgeColor: '#7c3aed'
  },
  {
    role: 'employee',
    name: 'Sales Telecaller',
    email: 'telecaller@apsenterprises.in',
    panel: 'Telecalling & CRM Panel',
    subtitle: 'CRM Leads • Dialer Queue • Voice Agent',
    badge: 'OUTREACH',
    badgeBg: '#d1fae5',
    badgeColor: '#047857'
  }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login(email, password);
      setLoading(false);
      navigate(user?.defaultRoute || '/dashboard');
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Invalid operator credentials. Please check your email and password.');
    }
  };

  const handleQuickLogin = async (targetEmail) => {
    setEmail(targetEmail);
    setPassword('admin123');
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login(targetEmail, 'admin123');
      setLoading(false);
      navigate(user?.defaultRoute || '/dashboard');
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Quick login failed.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Subtle ambient gradient blobs matching dashboard aesthetic */}
      <div style={styles.ambientBlob1} />
      <div style={styles.ambientBlob2} />

      <div style={styles.card}>
        {/* APS Enterprises Official Brand Logo */}
        <div style={styles.logoSection}>
          <img
            src="/aps-logo.png"
            alt="APS Enterprises"
            style={styles.brandLogoImg}
          />
        </div>

        {/* Heading */}
        <h1 style={styles.portalTitle}>APS Enterprise Portal</h1>
        <p style={styles.portalSubtitle}>Sign in to your authorized operator account</p>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Operator Email */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>OPERATOR EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
              style={styles.inputField}
              placeholder="e.g. admin@apsenterprises.in"
              required
              autoComplete="username"
            />
          </div>

          {/* Access Password */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>ACCESS PASSWORD / API KEY</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                style={styles.inputField}
                placeholder="Enter your system access password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} style={styles.loginBtn}>
            {loading ? 'Authenticating Operator…' : 'Sign In to Console'}
          </button>
        </form>

        {/* 1-Click Role Panel Selectors */}
        <div style={styles.quickAccessSection}>
          <div style={styles.quickAccessHeader}>
            <span style={styles.quickAccessTitle}>Select Role Panel to Preview (1-Click)</span>
            <span style={styles.quickAccessHint}>Pass: admin123</span>
          </div>
          <div style={styles.quickAccessGrid}>
            {OPERATORS_LIST.map((op) => (
              <button
                key={op.email}
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(op.email)}
                style={styles.quickCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.05)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={styles.quickCardTop}>
                  <span style={styles.quickCardName}>{op.name}</span>
                  <span style={{ ...styles.quickCardBadge, backgroundColor: op.badgeBg, color: op.badgeColor }}>
                    {op.badge}
                  </span>
                </div>
                <div style={styles.quickCardSubtitle}>{op.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footerNote}>
          APS Enterprises Operating System • Enterprise Multi-Agent Cockpit
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem'
  },
  ambientBlob1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(219, 234, 254, 0.7) 0%, rgba(248, 250, 252, 0) 70%)',
    top: '-15%',
    right: '-5%',
    zIndex: 1,
    filter: 'blur(50px)'
  },
  ambientBlob2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(238, 242, 255, 0.8) 0%, rgba(248, 250, 252, 0) 70%)',
    bottom: '-15%',
    left: '-5%',
    zIndex: 1,
    filter: 'blur(55px)'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
    width: '100%',
    maxWidth: 480,
    padding: '2.5rem 2.25rem',
    textAlign: 'center',
    position: 'relative',
    zIndex: 2
  },
  logoSection: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '1.25rem'
  },
  brandLogoImg: {
    height: 56,
    width: 'auto',
    objectFit: 'contain',
    display: 'block'
  },
  portalTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#09090b',
    margin: '0 0 0.35rem 0',
    letterSpacing: '-0.4px'
  },
  portalSubtitle: {
    fontSize: '0.86rem',
    color: '#64748b',
    margin: '0 0 1.75rem 0',
    fontWeight: 500
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0.75rem 1rem',
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '0.82rem',
    fontWeight: 600,
    textAlign: 'left',
    marginBottom: '1.25rem'
  },
  form: {
    textAlign: 'left'
  },
  inputGroup: {
    marginBottom: '1.25rem'
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#475569',
    letterSpacing: '0.8px',
    marginBottom: '0.5rem'
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputField: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#09090b',
    color: '#ffffff',
    fontSize: '0.92rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.75rem',
    boxShadow: '0 4px 14px rgba(9, 9, 11, 0.16)',
    transition: 'background-color 0.2s, transform 0.1s'
  },
  quickAccessSection: {
    marginTop: '1.75rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f1f5f9',
    textAlign: 'left'
  },
  quickAccessHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem'
  },
  quickAccessTitle: {
    fontSize: '0.68rem',
    fontWeight: 800,
    color: '#475569',
    letterSpacing: '0.6px',
    textTransform: 'uppercase'
  },
  quickAccessHint: {
    fontSize: '0.66rem',
    color: '#94a3b8',
    fontWeight: 600
  },
  quickAccessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.55rem'
  },
  quickCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0.75rem 0.8rem',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    width: '100%',
    boxSizing: 'border-box'
  },
  quickCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4
  },
  quickCardName: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#09090b'
  },
  quickCardBadge: {
    fontSize: '0.58rem',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 6,
    letterSpacing: '0.4px',
    textTransform: 'uppercase'
  },
  quickCardSubtitle: {
    fontSize: '0.66rem',
    color: '#64748b',
    lineHeight: 1.3
  },
  footerNote: {
    marginTop: '1.75rem',
    fontSize: '0.72rem',
    color: '#94a3b8',
    fontWeight: 500
  }
};
