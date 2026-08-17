import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [waMessages, setWaMessages] = useState([]);

  const fetchLeadData = async () => {
    try {
      const res = await fetch(`${API}/leads/${id}`);
      if (!res.ok) throw new Error('Lead not found');
      const d = await res.json();
      setLead(d.lead);

      // Fetch calls, activity logs, and whatsapp messages
      const [callsRes, actRes, waRes] = await Promise.all([
        fetch(`${API}/calls`),
        fetch(`${API}/activity`),
        fetch(`${API}/whatsapp/messages`)
      ]);

      const callsData = await callsRes.json();
      const actData = await actRes.json();
      const waData = await waRes.json();

      const leadCalls = (callsData.calls || []).filter(c => c.leadId === d.lead.id || c.phone === d.lead.phone);
      const leadActs = (actData.activityLogs || []).filter(a => a.leadId === d.lead.id);
      const leadWa = (waData.messages || []).filter(w => w.leadId === d.lead.id || w.leadName === d.lead.name);

      setCallLogs(leadCalls);
      setActivityLogs(leadActs);
      setWaMessages(leadWa);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const handleVerifyPayment = async () => {
    setVerifyingPayment(true);
    try {
      const res = await fetch(`${API}/leads/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'Client (Paid)', employeeId: 'e2' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('10% advance verified successfully against Tally ledger! Order released to factory.');
        await fetchLeadData();
      } else {
        alert(`❌ Verification failed: ${data.error || 'Unknown error'}\n${data.reason || data.details || ''}`);
      }
    } catch (err) {
      console.error(err);
      alert('Connection error to backend API.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Lead record not found in A2 system</h2>
        <button onClick={() => navigate('/crm')} style={styles.actionButton}>
          Back to Lead Pipeline
        </button>
      </div>
    );
  }

  const isErpBookingCreated = ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(lead.stage);
  const isTallyPaymentVerified = ['Client (Paid)', 'In Production', 'Dispatched'].includes(lead.stage) || lead.tallyPaymentVerified;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/crm')} style={styles.backButton}>
          ← Back to Lead Pipeline
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <h1 style={styles.title}>{lead.name}</h1>
          <span style={styles.idBadge}>{lead.id}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Main Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.mainCard}>
            <h2 style={styles.cardHeader}>Object Information & Parameters</h2>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Status Stage:</span>
              <span style={{
                ...styles.infoValue,
                fontWeight: '800',
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
              <span style={styles.infoValue}>₹{parseFloat(lead.budget || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Source:</span>
              <span style={styles.infoValue}>{lead.source || 'Meta Ads'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Assigned Staff:</span>
              <span style={styles.infoValue}>{lead.assignedEmployeeId || 'Bhavya (A2 Admin)'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Notes:</span>
              <span style={styles.infoValue}>{lead.notes || 'No notes available.'}</span>
            </div>
          </div>

          {/* Voice AI Calls & Transcripts */}
          <div style={styles.mainCard}>
            <h2 style={styles.cardHeader}>🎙️ A1 Voice Agent Call Logs</h2>
            {callLogs.length > 0 ? (
              callLogs.map(c => (
                <div key={c.callId} style={styles.logCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#aa3bff' }}>{c.callId} · {c.agent}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.durationSeconds}s duration</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#08060d' }}>Outcome: {c.callOutcome}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, italic: 'true' }}>"{c.transcript}"</div>
                </div>
              ))
            ) : (
              <div style={styles.emptySub}>No voice call logs recorded for this lead yet.</div>
            )}
          </div>

          {/* Audit Activity Log Timeline */}
          <div style={styles.mainCard}>
            <h2 style={styles.cardHeader}>📋 State Machine Audit Trail</h2>
            {activityLogs.length > 0 ? (
              activityLogs.map(a => (
                <div key={a.id} style={styles.logCard}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#08060d' }}>{a.action}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                    By Employee: {a.employeeId} {a.countersignedBy && `| Countersigned by: ${a.countersignedBy}`}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptySub}>No audit log entries yet.</div>
            )}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.sidebarCard}>
            <h2 style={styles.cardHeader}>Integrations Checklist</h2>
            <div style={styles.checkRow}>
              <span style={styles.checkIcon}>✅</span>
              <span style={styles.checkText}>CRM Sync (Leads API)</span>
            </div>
            <div style={styles.checkRow}>
              <span style={styles.checkIcon}>{isErpBookingCreated ? '✅' : '❌'}</span>
              <span style={styles.checkText}>ERP Booking & Config Created</span>
            </div>
            <div style={styles.checkRow}>
              <span style={styles.checkIcon}>{isTallyPaymentVerified ? '✅' : '❌'}</span>
              <span style={styles.checkText}>Tally 10% Advance Verification</span>
            </div>

            <div style={styles.actionContainer}>
              {lead.stage === 'Confirmed Lead' && (
                <button
                  onClick={handleVerifyPayment}
                  disabled={verifyingPayment}
                  style={styles.actionButton}
                >
                  {verifyingPayment ? 'Verifying with Tally...' : 'Verify 10% Advance (Tally Gate)'}
                </button>
              )}
              {isTallyPaymentVerified && (
                <div style={styles.completedAlert}>
                  🎉 Factory production order released in ERP!
                </div>
              )}
            </div>
          </div>

          {/* A5 WhatsApp Log */}
          <div style={styles.sidebarCard}>
            <h2 style={styles.cardHeader}>💬 A5 WhatsApp Automated Messages</h2>
            {waMessages.length > 0 ? (
              waMessages.map(w => (
                <div key={w.messageId} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>{w.sequenceType}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Template: {w.template}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Status: {w.status}</div>
                </div>
              ))
            ) : (
              <div style={styles.emptySub}>No automated WhatsApp messages sent yet.</div>
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
  idBadge: {
    backgroundColor: '#f1f5f9',
    color: '#aa3bff',
    fontSize: '0.78rem',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '12px',
    fontFamily: 'monospace'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '2rem'
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  sidebarCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  cardHeader: {
    fontSize: '1.1rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#08060d',
    marginBottom: '1.25rem'
  },
  infoRow: {
    display: 'flex',
    marginBottom: '1rem',
    borderBottom: '1px solid #f1f3f7',
    paddingBottom: '0.6rem'
  },
  infoLabel: {
    width: '160px',
    fontWeight: '700',
    color: '#64748b',
    fontSize: '0.85rem'
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: '0.85rem'
  },
  logCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    marginBottom: '0.75rem',
    border: '1px solid #e2e8f0'
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  checkIcon: {
    marginRight: '0.75rem',
    fontSize: '1rem'
  },
  checkText: {
    color: '#08060d'
  },
  actionContainer: {
    marginTop: '2rem',
    borderTop: '1px solid #f1f3f7',
    paddingTop: '1.25rem'
  },
  actionButton: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: '#aa3bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(170, 59, 255, 0.2)'
  },
  completedAlert: {
    backgroundColor: '#ecfdf5',
    color: '#10b981',
    padding: '0.85rem',
    borderRadius: '14px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
    border: '1px solid #10b981'
  },
  emptySub: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontStyle: 'italic'
  }
};
