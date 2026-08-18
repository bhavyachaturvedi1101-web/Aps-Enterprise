import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Login attempt:', email);
    navigate('/dashboard');
  };

  const handleDemoLogin = () => {
    setEmail('admin@apsenterprise.com');
    setPassword('admin123');
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div style={styles.container}>
      {/* Background overlapping purple blobs matching Bidency style */}
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>
      
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa3bff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7v10l10 5 10-5V7z" fill="rgba(170, 59, 255, 0.1)"/>
              <polyline points="12 22 12 12 22 7"/>
              <polyline points="12 12 2 7"/>
            </svg>
          </div>
          <span style={styles.logoText}>APS Enterprise</span>
        </div>
        
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>AI Admin System Control Cockpit</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="name@apsenterprise.com"
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: '2.5rem' }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b',
                  transition: 'color 0.2s'
                }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" style={styles.button}>
            Sign In
          </button>
          <button type="button" onClick={handleDemoLogin} style={styles.demoButton}>
            Quick Demo Login
          </button>
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
    height: '100vh',
    backgroundColor: '#f1f3f7',
    color: '#0f172a',
    fontFamily: 'var(--font-body)',
    position: 'relative',
    overflow: 'hidden'
  },
  blob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(170, 59, 255, 0.25) 0%, rgba(192, 132, 252, 0.1) 100%)',
    top: '-10%',
    right: '10%',
    zIndex: 1,
    filter: 'blur(30px)'
  },
  blob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(170, 59, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
    bottom: '-15%',
    left: '-5%',
    zIndex: 1,
    filter: 'blur(40px)'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '3rem 2.5rem',
    borderRadius: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    width: '90%',
    maxWidth: '420px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    zIndex: 2,
    backdropFilter: 'blur(10px)'
  },
  logoSection: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  logoIcon: {
    color: '#aa3bff',
    display: 'flex',
    alignItems: 'center'
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#08060d',
    letterSpacing: '-0.5px'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    marginBottom: '0.25rem',
    color: '#08060d'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  form: {
    textAlign: 'left'
  },
  inputGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#475569'
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: '#aa3bff',
      backgroundColor: '#ffffff'
    }
  },
  button: {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#08060d',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.75rem',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  demoButton: {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '12px',
    border: '1.5px solid #aa3bff',
    backgroundColor: 'transparent',
    color: '#aa3bff',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.75rem',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s'
  }
};
