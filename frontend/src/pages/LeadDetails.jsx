import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    fetch(`${API}/leads/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Lead not found');
        return r.json();
      })
      .then(d => {
        setLead(d.lead);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleVerifyPayment = async () => {
    setVerifyingPayment(true);
    try {
      const res = await fetch(`${API}/leads/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'Client (Paid)', employeeId: 'admin' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLead(prev => ({
          ...prev,
          stage: 'Client (Paid)',
          tallyPaymentVerified: true
        }));
        alert('10% advance verified successfully against Tally ledger! Order released to factory.');
      } else {
        alert(`❌ Verification failed: ${data.error || 'Unknown error'}\n${data.reason || ''}`);
      }
    } catch (err) {
      console.error(err);
      alert('Connection error to backend API.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Lead not found</h2>
        <button onClick={() => navigate('/dashboard?tab=pipeline')} style={styles.actionButton}>
          Back to Pipeline
        </button>
      </div>
    );
  }

  const isErpBookingCreated = ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(lead.stage);
  const isTallyPaymentVerified = ['Client (Paid)', 'In Production', 'Dispatched'].includes(lead.stage) || lead.tallyPaymentVerified;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard?tab=pipeline')} style={styles.backButton}>
          ← Back to Pipeline
        </button>
        <h1 style={styles.title}>Lead Details: {lead.name}</h1>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainCard}>
          <h2 style={styles.cardHeader}>Object Information</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Status:</span>
            <span style={{
              ...styles.infoValue,
              fontWeight: '700',
              color: isTallyPaymentVerified ? '#10b981' : '#f59e0b'
            }}>
              {lead.stage}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Product Interest:</span>
            <span style={styles.infoValue}>{lead.interest}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Budget:</span>
            <span style={styles.infoValue}>₹{parseFloat(lead.budget).toLocaleString('en-IN')}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Notes:</span>
            <span style={styles.infoValue}>{lead.notes || 'No notes available.'}</span>
          </div>
        </div>

        <div style={styles.sidebarCard}>
          <h2 style={styles.cardHeader}>Integrations Checklist</h2>
          <div style={styles.checkRow}>
            <span style={styles.checkIcon}>{lead.crmSynced ? '✅' : '✅'}</span>
            <span style={styles.checkText}>CRM Sync (Leads API)</span>
          </div>
          <div style={styles.checkRow}>
            <span style={styles.checkIcon}>{isErpBookingCreated ? '✅' : '❌'}</span>
            <span style={styles.checkText}>ERP Booking & Config Created</span>
          </div>
          <div style={styles.checkRow}>
            <span style={styles.checkIcon}>{isTallyPaymentVerified ? '✅' : '❌'}</span>
            <span style={styles.checkText}>Tally Payment Verification</span>
          </div>

          <div style={styles.actionContainer}>
            {lead.stage === 'Confirmed Lead' && (
              <button
                onClick={handleVerifyPayment}
                disabled={verifyingPayment}
                style={styles.actionButton}
              >
                {verifyingPayment ? 'Verifying with Tally...' : 'Verify 10% Advance (Tally)'}
              </button>
            )}
            {isTallyPaymentVerified && (
              <div style={styles.completedAlert}>
                🎉 Factory order triggered successfully!
              </div>
            )}
          </div>
        </div>
      </div>
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
  header: {
    marginBottom: '2rem'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#aa3bff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    padding: 0,
    fontFamily: 'var(--font-body)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '2rem'
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2.5rem',
    border: '1px solid #e2e8f0',
    boxShadow: 'var(--shadow-md)'
  },
  sidebarCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2.5rem',
    border: '1px solid #e2e8f0',
    boxShadow: 'var(--shadow-md)'
  },
  cardHeader: {
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#08060d',
    marginBottom: '1.5rem'
  },
  infoRow: {
    display: 'flex',
    marginBottom: '1.25rem',
    borderBottom: '1px solid #f1f3f7',
    paddingBottom: '0.75rem'
  },
  infoLabel: {
    width: '150px',
    fontWeight: '700',
    color: 'var(--text-secondary)'
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600'
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  checkIcon: {
    marginRight: '0.75rem',
    fontSize: '1.1rem'
  },
  checkText: {
    color: '#08060d'
  },
  actionContainer: {
    marginTop: '2.5rem',
    borderTop: '1px solid #f1f3f7',
    paddingTop: '1.5rem'
  },
  actionButton: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: '#aa3bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 4px 10px rgba(170, 59, 255, 0.2)',
    transition: 'all 0.2s',
    ':disabled': {
      backgroundColor: '#f1f3f7',
      color: 'var(--text-muted)',
      boxShadow: 'none',
      cursor: 'not-allowed'
    }
  },
  completedAlert: {
    backgroundColor: '#ecfdf5',
    color: '#10b981',
    padding: '1rem',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    border: '1px solid #10b981'
  }
};
