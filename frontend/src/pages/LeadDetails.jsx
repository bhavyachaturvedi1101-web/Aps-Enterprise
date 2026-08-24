import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES } from '../mockData';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

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

  const handleTriggerVoiceCall = async () => {
    try {
      const res = await fetch(`${API}/calls/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone || '9876543210',
          durationSeconds: 45,
          callOutcome: 'Interested — Demo Scheduled',
          transcript: `Spoke with ${lead.name}. Client confirmed interest in ${lead.interest}. Requested quote and payment details.`
        })
      });
      if (res.ok) {
        alert('Voice call initiated and logged successfully!');
        await fetchLeadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, leadName: lead.name })
      });
      if (res.ok) {
        alert('💬 WhatsApp reminder sent successfully!');
        await fetchLeadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Lead record not found</h2>
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
              <span style={styles.infoValue}>
                {(() => {
                  const emp = MOCK_EMPLOYEES.find(e => e.id === lead.assignedEmployeeId);
                  return emp ? `${emp.name} (${emp.role})` : (lead.assignedEmployeeId || 'Sneha (Admin)');
                })()}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Created Date & Time:</span>
              <span style={{ ...styles.infoValue, fontWeight: 700 }}>
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(lead.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '19 Aug 2026, 02:40 PM'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Notes:</span>
              <span style={styles.infoValue}>{lead.notes || 'No notes available.'}</span>
            </div>
          </div>

          {/* Voice AI Calls & Transcripts */}
          <div style={styles.mainCard}>
            <h2 style={{ ...styles.cardHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              <span>Voice Agent Call Logs</span>
            </h2>
            {callLogs.length > 0 ? (
              callLogs.map(c => (
                <div key={c.callId} style={styles.logCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#09090b', fontFamily: 'monospace' }}>{c.callId} · {c.agent}</span>
                    <span style={{ fontSize: '0.72rem', color: '#71717a' }}>{c.durationSeconds}s duration</span>
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
            <h2 style={{ ...styles.cardHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>State Machine Audit Trail</span>
            </h2>
            {activityLogs.length > 0 ? (
              activityLogs.map(a => (
                <div key={a.id} style={styles.logCard}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#08060d' }}>{a.action}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                    By Employee: {(() => {
                      const emp = MOCK_EMPLOYEES.find(e => e.id === a.employeeId);
                      return emp ? `${emp.name} (${emp.role})` : (a.employeeName || a.employeeId);
                    })()} {(() => {
                      if (!a.countersignedBy) return '';
                      const counterEmp = MOCK_EMPLOYEES.find(e => e.id === a.countersignedBy);
                      return `| Countersigned by: ${counterEmp ? `${counterEmp.name} (${counterEmp.role})` : a.countersignedBy}`;
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptySub}>No audit log entries yet.</div>
            )}
          </div>
        </div>

        {/* Sidebar Status & Action Triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.sidebarCard}>
            <h2 style={styles.cardHeader}>Automation Policy Gates</h2>
            <div style={styles.checkRow}>
              <span style={styles.checkIcon}>
                {isErpBookingCreated ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                )}
              </span>
              <span style={styles.checkText}>ERP Order Manifest Generation</span>
            </div>
            <div style={styles.checkRow}>
              <span style={styles.checkIcon}>
                {isTallyPaymentVerified ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                )}
              </span>
              <span style={styles.checkText}>Tally 10% Advance Verification</span>
            </div>

            <div style={styles.actionContainer}>
              <button
                onClick={handleTriggerVoiceCall}
                style={{ ...styles.actionButton, background: '#09090b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
                <span>Trigger Voice Call</span>
              </button>
              <button
                onClick={handleSendWhatsApp}
                style={{ ...styles.actionButton, background: '#ffffff', color: '#09090b', border: '1px solid #e4e4e7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Send WhatsApp Reminder</span>
              </button>
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
                <div style={{ ...styles.completedAlert, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Factory production order released in ERP!</span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Log */}
          <div style={styles.sidebarCard}>
            <h2 style={{ ...styles.cardHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>WhatsApp Automated Messages</span>
            </h2>
            {waMessages.length > 0 ? (
              waMessages.map(w => (
                <div key={w.messageId} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f4f4f5' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b' }}>{w.sequenceType}</div>
                  <div style={{ fontSize: '0.72rem', color: '#52525b' }}>Template: {w.template}</div>
                  <div style={{ fontSize: '0.68rem', color: '#71717a' }}>Status: {w.status}</div>
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
    color: '#09090b',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '2rem'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#09090b',
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
    color: '#09090b',
    margin: 0
  },
  idBadge: {
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    fontSize: '0.78rem',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid #e4e4e7',
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
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  sidebarCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  cardHeader: {
    fontSize: '1.1rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    marginBottom: '1.25rem'
  },
  infoRow: {
    display: 'flex',
    marginBottom: '1rem',
    borderBottom: '1px solid #f4f4f5',
    paddingBottom: '0.6rem'
  },
  infoLabel: {
    width: '160px',
    fontWeight: '700',
    color: '#71717a',
    fontSize: '0.85rem'
  },
  infoValue: {
    color: '#09090b',
    fontWeight: '600',
    fontSize: '0.85rem'
  },
  logCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    marginBottom: '0.75rem',
    border: '1px solid #e4e4e7'
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
    color: '#09090b'
  },
  actionContainer: {
    marginTop: '2rem',
    borderTop: '1px solid #f4f4f5',
    paddingTop: '1.25rem'
  },
  actionButton: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: '#09090b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)'
  },
  completedAlert: {
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    padding: '0.85rem',
    borderRadius: '14px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
    border: '1px solid #e4e4e7'
  },
  emptySub: {
    fontSize: '0.78rem',
    color: '#71717a',
    fontStyle: 'italic'
  }
};
