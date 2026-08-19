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

        <button type="submit" style={styles.saveButton}>
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
    fontSize: '2rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    margin: 0
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
    marginBottom: '2rem'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: 'var(--shadow-md)',
    padding: '2.5rem',
    maxWidth: '640px'
  },
  section: {
    marginBottom: '2rem',
    borderBottom: '1px solid #f1f3f7',
    paddingBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    marginTop: 0,
    marginBottom: '1.25rem'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#3f3f46',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e4e4e7',
    backgroundColor: '#f8fafc',
    color: '#09090b',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
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
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#3f3f46',
    cursor: 'pointer'
  },
  radioInput: {
    accentColor: '#09090b'
  },
  saveButton: {
    padding: '0.8rem 1.75rem',
    backgroundColor: '#09090b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
  }
};
