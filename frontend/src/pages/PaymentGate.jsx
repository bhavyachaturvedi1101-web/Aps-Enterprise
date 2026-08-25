import React, { useState, useEffect } from 'react';
import { MOCK_PAYMENTS } from '../mockData';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

export default function PaymentGate() {
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API}/leads`);
      const data = await res.json();
      const activeLeads = data.leads || [];

      // Filter for Confirmed Lead or beyond
      const paymentLeads = activeLeads.filter(l =>
        ['Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)
      );

      const mappedPayments = paymentLeads.map((l, index) => {
        const isVerified = l.stage !== 'Confirmed Lead';
        return {
          id: `PAY${String(index + 1).padStart(3, '0')}`,
          leadId: l.id,
          lead: l.name,
          amount: `₹${parseFloat(l.budget * 0.10).toLocaleString('en-IN')}`,
          percent: '10%',
          status: isVerified ? 'Verified' : 'Pending Verification',
          tallyRef: isVerified ? `TALLY-2026-${2000 + parseInt(l.id || index)}` : null,
          dueDate: '2026-08-11',
          daysOverdue: isVerified ? 0 : 3
        };
      });

      setPayments(mappedPayments);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (pay) => {
    setVerifying(pay.leadId);
    try {
      const res = await fetch(`${API}/leads/${pay.leadId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'Client (Paid)', employeeId: 'admin' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Payment verified against Tally ledger. Lead can now advance to Client (Paid).');
        await fetchPayments();
      } else {
        alert(`Verification failed: ${data.error || 'Unknown error'}\n${data.reason || ''}`);
      }
    } catch (err) {
      console.error(err);
      alert('Connection error to backend API.');
    } finally {
      setVerifying(null);
    }
  };

  const handleSendReminder = async () => {
    const pending = payments.find(p => p.status === 'Pending Verification');
    if (!pending) return;

    setSendingReminder(true);
    try {
      const res = await fetch(`${API}/whatsapp/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: pending.leadId })
      });
      const data = await res.json();
      if (data.success) {
        alert(`WhatsApp payment reminder sequence triggered for "${pending.lead}"! Message ID: ${data.message.messageId}`);
      } else {
        alert(`Reminder trigger failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Connection error to backend API.');
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading Payment Gate...</div>;
  }

  const pendingPayments = payments.filter(p => p.status === 'Pending Verification');

  return (
    <div style={{ ...s.page, padding: undefined }} className="page-container">
      <div style={s.pageHead} className="mobile-stack-header">
        <div>
          <h1 style={s.title}>Payment Gate</h1>
        </div>
      </div>

      {pendingPayments.length > 0 ? (
        <div style={{ ...s.alertBox, backgroundColor: '#fffbeb', borderColor: '#fde68a' }} className="mobile-alert-wrap">
          <div style={s.alertIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div style={{ ...s.alertTitle, color: '#b45309' }}>{pendingPayments.length} payment(s) pending verification</div>
            <div style={{ ...s.alertSub, color: '#92400e' }}>
              {pendingPayments.map(p => `${p.lead} (${p.amount})`).join(', ')} advance payment is overdue. Send reminder via WhatsApp.
            </div>
          </div>
          <button onClick={handleSendReminder} disabled={sendingReminder} className="btn-blue-primary" style={s.alertBtn}>
            {sendingReminder ? 'Sending…' : 'Send Reminder'}
          </button>
        </div>
      ) : (
        <div style={{...s.alertBox, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0'}} className="mobile-alert-wrap">
          <div style={s.alertIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style={{...s.alertTitle, color: '#047857'}}>All payments verified</div>
            <div style={{...s.alertSub, color: '#065f46'}}>No pending 10% advance payments ledger matches require action.</div>
          </div>
        </div>
      )}

      <div className="payment-table-wrapper">
        <div style={s.card} className="payment-table-inner">
        <div style={s.tableHead}>
          {['Payment ID', 'Lead / Client', 'Amount (10% Advance)', 'Due Date', 'Status'].map(h => (
            <div key={h} style={{...s.th, flex: h === 'Amount (10% Advance)' || h === 'Lead / Client' ? 2 : 1}}>{h}</div>
          ))}
        </div>
        {payments.map(pay => (
          <div key={pay.id} className="table-row-hover" style={s.payRow}>
            <div style={{...s.payLeft, flex: 1}}>
              <div style={s.payId}>{pay.id}</div>
              <div style={s.payLead}>{pay.lead}</div>
            </div>
            <div style={{...s.payMid, flex: 2}}>
              <div style={s.payAmount}>{pay.amount} <span style={s.payPct}>({pay.percent} advance)</span></div>
              {pay.tallyRef && <div style={s.tallyRef}>Tally Ref: {pay.tallyRef}</div>}
            </div>
            <div style={{...s.payMid, flex: 1}}>
              <div style={s.payDue}>Due: {pay.dueDate} {pay.daysOverdue > 0 && <span style={s.overdue}>{pay.daysOverdue} days overdue</span>}</div>
            </div>
            <div style={{...s.payRight, flex: 1}}>
              {pay.status === 'Verified' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#047857', fontWeight: 700, fontSize: '0.82rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }}/>
                  <span>Verified with Tally</span>
                </div>
              ) : (
                <button onClick={() => handleVerify(pay)} disabled={verifying === pay.leadId} className="btn-blue-primary" style={{ ...s.verifyBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span>{verifying === pay.leadId ? 'Verifying…' : 'Verify with Tally'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>No leads tracked in Payment Gate.</div>
        )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#09090b', margin:0 },
  sub: { fontSize:'0.78rem', color:'#71717a', marginTop:4 },
  alertBox: { border:'1px solid', borderRadius:14, padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'1.25rem' },
  alertIcon: { fontSize:'1.4rem' },
  alertTitle: { fontWeight:700, fontSize:'0.88rem' },
  alertSub: { fontSize:'0.72rem', marginTop:2 },
  alertBtn: { marginLeft:'auto', padding:'6px 14px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.78rem', cursor:'pointer', flexShrink:0, boxShadow: '0 2px 6px rgba(37,99,235,0.25)' },
  card: { backgroundColor:'#fff', borderRadius:16, border:'1px solid #e4e4e7', overflow:'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
  tableHead: { display:'flex', backgroundColor:'#f8fafc', borderBottom:'1px solid #e4e4e7', padding:'0.65rem 1.25rem', gap:'1.5rem' },
  th: { fontSize:'0.65rem', fontWeight:700, color:'#71717a', textTransform:'uppercase', letterSpacing:'0.5px' },
  payRow: { display:'flex', alignItems:'center', padding:'1.25rem 1.5rem', borderBottom:'1px solid #f4f4f5', gap:'1.5rem' },
  payLeft: { minWidth: 120 },
  payId: { fontSize:'0.72rem', fontWeight:700, color:'#09090b', fontFamily:'monospace' },
  payLead: { fontSize:'0.9rem', fontWeight:800, color:'#09090b', marginTop:2 },
  payMid: { minWidth: 150 },
  payAmount: { fontSize:'1rem', fontWeight:700, color:'#09090b' },
  payPct: { fontSize:'0.75rem', fontWeight:500, color:'#71717a' },
  payDue: { fontSize:'0.72rem', color:'#71717a' },
  overdue: { backgroundColor:'#fef2f2', color:'#ef4444', border: '1px solid #fca5a5', padding:'2px 7px', borderRadius:6, fontWeight:700, marginLeft:6, fontSize:'0.68rem' },
  tallyRef: { fontSize:'0.68rem', fontFamily:'monospace', color:'#52525b', marginTop:2 },
  payRight: { minWidth: 150, textAlign:'right' },
  verified: { color:'#047857', fontWeight:700, fontSize:'0.85rem' },
  verifyBtn: { padding:'8px 16px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.78rem', cursor:'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }
};
