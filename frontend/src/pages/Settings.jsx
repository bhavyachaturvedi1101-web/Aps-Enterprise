import React, { useState } from 'react';

export default function Settings() {
  const [approvalFlow, setApprovalFlow] = useState('single');
  const [crmEndpoint, setCrmEndpoint] = useState('https://crm.apsenterprise.com/api/v1');
  const [erpEndpoint, setErpEndpoint] = useState('https://erp.apsenterprise.com/api/v1');
  const [tallyEndpoint, setTallyEndpoint] = useState('https://tally.apsenterprise.com/api/v1');

  const handleSave = (e) => {
    e.preventDefault();
    alert('Settings updated successfully!');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>System Control Settings</h1>

      <form onSubmit={handleSave} style={styles.card}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Approval & Gate Workflows</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Factory Release Gate Rule</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="approvalFlow"
                  value="single"
                  checked={approvalFlow === 'single'}
                  onChange={(e) => setApprovalFlow(e.target.value)}
                  style={styles.radioInput}
                />
                Single-Action Approval (One admin verify + release)
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="approvalFlow"
                  value="dual"
                  checked={approvalFlow === 'dual'}
                  onChange={(e) => setApprovalFlow(e.target.value)}
                  style={styles.radioInput}
                />
                Two-Person Countersign (Dual-admin release authorization required)
              </label>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Integration API Endpoints</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>CRM Integration Endpoint</label>
            <input
              type="text"
              value={crmEndpoint}
              onChange={(e) => setCrmEndpoint(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>ERP Integration Endpoint</label>
            <input
              type="text"
              value={erpEndpoint}
              onChange={(e) => setErpEndpoint(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tally Ledger Integration Endpoint</label>
            <input
              type="text"
              value={tallyEndpoint}
              onChange={(e) => setTallyEndpoint(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <button type="submit" className="btn-blue-primary" style={styles.saveButton}>
          Save Settings
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '2.5rem',
    color: '#0f172a',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    margin: 0,
    marginBottom: '1.5rem'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
    padding: '2rem',
    maxWidth: '640px'
  },
  section: {
    marginBottom: '1.75rem',
    borderBottom: '1px solid #f4f4f5',
    paddingBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    marginTop: 0,
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#3f3f46',
    marginBottom: '0.4rem'
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #e4e4e7',
    backgroundColor: '#ffffff',
    color: '#09090b',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    transition: 'all 0.15s ease'
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#3f3f46',
    cursor: 'pointer'
  },
  radioInput: {
    accentColor: '#2563eb',
    width: 16,
    height: 16,
    cursor: 'pointer'
  },
  saveButton: {
    padding: '0.65rem 1.6rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
  }
};
