import React, { useState } from 'react';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#71717a', marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' },
  card: { backgroundColor: '#fff', borderRadius: 18, border: '1px solid #e4e4e7', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#09090b', marginBottom: '1rem', fontFamily: 'var(--font-heading)' },
  input: { width: '100%', padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #e4e4e7', fontSize: '0.85rem', outline: 'none', marginBottom: '0.85rem', fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: '#09090b' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#3f3f46', marginBottom: 4, display: 'block' },
  btn: { padding: '0.65rem 1.4rem', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' },
  logBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e4e4e7', maxHeight: 240, overflowY: 'auto' },
  logRow: { padding: '0.5rem 0', borderBottom: '1px solid #f4f4f5', fontSize: '0.8rem' },
  badge: { padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }
};

export function VoiceAgent() {
  const [phone, setPhone] = useState('');
  const [leadName, setLeadName] = useState('');
  const [logs, setLogs] = useState([
    { id: 1, phone: '+91 98765 43210', name: 'Acme Corp', status: 'Completed', outcome: 'Interested — Demo Scheduled' },
    { id: 2, phone: '+91 87654 32109', name: 'Global Tech', status: 'Completed', outcome: 'Callback Requested' }
  ]);
  const [calling, setCalling] = useState(false);

  const handleTriggerCall = async (e) => {
    e.preventDefault();
    if (!phone || !leadName) return;
    setCalling(true);
    try {
      await fetch(`${API}/calls/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          leadName,
          durationSeconds: 32,
          callOutcome: 'Qualified Lead',
          transcript: `Spoke with ${leadName}. Confirmed interest in product catalog. Transferred to CRM Pipeline.`
        })
      });
      setLogs(prev => [{ id: Date.now(), phone, name: leadName, status: 'Completed', outcome: 'Qualified Lead' }, ...prev]);
      alert(`Outbound AI Voice call placed to ${leadName} (${phone})!`);
      setPhone('');
      setLeadName('');
    } catch {
      alert('Error triggering voice agent call.');
    } finally {
      setCalling(false);
    }
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>AI Voice Agent Control Panel</h1>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Trigger Outbound AI Voice Call</div>
          <form onSubmit={handleTriggerCall}>
            <label style={s.label}>Contact Name</label>
            <input required style={s.input} placeholder="e.g. Rahul Sharma" value={leadName} onChange={e => setLeadName(e.target.value)} />
            <label style={s.label}>Phone Number</label>
            <input required style={s.input} placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
            <button type="submit" disabled={calling} className="btn-blue-primary" style={{ ...s.btn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.65rem 1.4rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
              </svg>
              <span style={{ lineHeight: 1 }}>{calling ? 'Dialing Voice Agent…' : 'Initiate AI Voice Call'}</span>
            </button>
          </form>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Live Voice Call Logs</div>
          <div style={s.logBox}>
            {logs.map(l => (
              <div key={l.id} style={s.logRow}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{l.name} ({l.phone})</span>
                  <span style={s.badge}>{l.status}</span>
                </div>
                <div style={{ color: '#64748b', marginTop: 2 }}>{l.outcome}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppAgent() {
  const [recipient, setRecipient] = useState('');
  const [template, setTemplate] = useState('Payment Reminder');
  const [messages, setMessages] = useState([
    { id: 'WA-001', recipient: 'Horizon Ltd', template: 'Tally 10% Advance Reminder', status: 'Delivered' },
    { id: 'WA-002', recipient: 'Apex Steel', template: 'Order Dispatch Notification', status: 'Delivered' }
  ]);
  const [sending, setSending] = useState(false);

  const handleSendWA = async (e) => {
    e.preventDefault();
    if (!recipient) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/whatsapp/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadName: recipient })
      });
      const data = await res.json();
      setMessages(prev => [{ id: data.message?.messageId || `WA-${Date.now()}`, recipient, template, status: 'Sent' }, ...prev]);
      alert(`WhatsApp sequence "${template}" sent to ${recipient}!`);
      setRecipient('');
    } catch {
      alert('Error sending WhatsApp message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>WhatsApp Automation Control Panel</h1>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Broadcast / Single WhatsApp Dispatch</div>
          <form onSubmit={handleSendWA}>
            <label style={s.label}>Recipient / Company Name</label>
            <input required style={s.input} placeholder="e.g. Apex Manufacturing" value={recipient} onChange={e => setRecipient(e.target.value)} />
            <label style={s.label}>Template Sequence</label>
            <select style={s.input} value={template} onChange={e => setTemplate(e.target.value)}>
              <option value="Payment Reminder">Tally 10% Advance Payment Gate</option>
              <option value="Lead Qualification">Voice Follow-up & Product Brochure</option>
              <option value="Dispatch Alert">Factory Dispatch Tracking Link</option>
            </select>

            <button type="submit" disabled={sending} className="btn-blue-primary" style={{ ...s.btn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span>{sending ? 'Sending WhatsApp…' : 'Send WhatsApp Message'}</span>
            </button>
          </form>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Recent WhatsApp Logs</div>
          <div style={s.logBox}>
            {messages.map(m => (
              <div key={m.id} style={s.logRow}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{m.recipient} ({m.id})</span>
                  <span style={{ ...s.badge, backgroundColor: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7' }}>{m.status}</span>
                </div>
                <div style={{ color: '#71717a', marginTop: 2 }}>{m.template}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
