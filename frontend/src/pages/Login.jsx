import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@apsenterprise.com');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [loading, setLoading] = useState(false);

  const { login, loginWithRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const user = login(email, password);
      setLoading(false);
      navigate(user.defaultRoute || '/dashboard');
    }, 400);
  };

  const handleQuickConnect = (roleKey) => {
    setSelectedRole(roleKey);
    const demo = DEMO_ACCOUNTS[roleKey];
    setEmail(demo.email);
    setPassword('••••••••');
    setLoading(true);

    setTimeout(() => {
      const user = loginWithRole(roleKey);
      setLoading(false);
      navigate(user.defaultRoute || '/dashboard');
    }, 300);
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
        <p style={styles.portalSubtitle}>Sign in to start operations</p>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Operator Email */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>OPERATOR EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.inputField}
              placeholder="admin@apsenterprise.com"
              required
            />
          </div>

          {/* Access Password */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>ACCESS PASSWORD</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.inputField}
                placeholder="••••••••"
                required
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
            {loading ? 'Authenticating Operator…' : 'Log In Operator'}
          </button>

          {/* Quick Connect Demo Accounts without emojis */}
          <div style={styles.quickConnectWrap}>
            <div style={styles.quickConnectDivider}>
              <span style={styles.quickConnectText}>OR QUICK CONNECT (DEMO ACCOUNTS)</span>
            </div>

            <div style={styles.roleButtonsRow}>
              {/* Admin */}
              <button
                type="button"
                onClick={() => handleQuickConnect('admin')}
                style={{
                  ...styles.roleChipBtn,
                  borderColor: selectedRole === 'admin' ? '#09090b' : '#e2e8f0',
                  backgroundColor: selectedRole === 'admin' ? '#09090b' : '#ffffff',
                  color: selectedRole === 'admin' ? '#ffffff' : '#475569'
                }}
              >
                <span>Admin</span>
              </button>

              {/* Manager */}
              <button
                type="button"
                onClick={() => handleQuickConnect('manager')}
                style={{
                  ...styles.roleChipBtn,
                  borderColor: selectedRole === 'manager' ? '#2563eb' : '#e2e8f0',
                  backgroundColor: selectedRole === 'manager' ? '#eff6ff' : '#ffffff',
                  color: selectedRole === 'manager' ? '#1d4ed8' : '#475569'
                }}
              >
                <span>Manager</span>
              </button>

              {/* Employee */}
              <button
                type="button"
                onClick={() => handleQuickConnect('employee')}
                style={{
                  ...styles.roleChipBtn,
                  borderColor: selectedRole === 'employee' ? '#10b981' : '#e2e8f0',
                  backgroundColor: selectedRole === 'employee' ? '#ecfdf5' : '#ffffff',
                  color: selectedRole === 'employee' ? '#047857' : '#475569'
                }}
              >
                <span>Employee</span>
              </button>
            </div>
          </div>
        </form>
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
    backgroundColor: '#f3f4f8',
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
    background: 'radial-gradient(circle, rgba(238, 225, 255, 0.7) 0%, rgba(243, 244, 248, 0) 70%)',
    top: '-15%',
    right: '-5%',
    zIndex: 1,
    filter: 'blur(40px)'
  },
  ambientBlob2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(220, 235, 255, 0.6) 0%, rgba(243, 244, 248, 0) 70%)',
    bottom: '-15%',
    left: '-5%',
    zIndex: 1,
    filter: 'blur(45px)'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
    width: '100%',
    maxWidth: 440,
    padding: '2.75rem 2.25rem',
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
    height: 58,
    width: 'auto',
    objectFit: 'contain',
    display: 'block'
  },
  portalTitle: {
    fontSize: '1.65rem',
    fontWeight: 800,
    color: '#09090b',
    margin: '0 0 0.35rem 0',
    letterSpacing: '-0.4px'
  },
  portalSubtitle: {
    fontSize: '0.86rem',
    color: '#64748b',
    margin: '0 0 2rem 0',
    fontWeight: 500
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
    padding: '0.85rem',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#09090b',
    color: '#ffffff',
    fontSize: '0.92rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.75rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
    transition: 'background-color 0.2s, transform 0.1s'
  },
  quickConnectWrap: {
    marginTop: '2rem'
  },
  quickConnectDivider: {
    textAlign: 'center',
    marginBottom: '1rem',
    position: 'relative'
  },
  quickConnectText: {
    fontSize: '0.66rem',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.6px',
    textTransform: 'uppercase'
  },
  roleButtonsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.65rem'
  },
  roleChipBtn: {
    padding: '0.7rem 0.5rem',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 700,
    transition: 'all 0.15s ease'
  }
};
