import React, { useState } from 'react';

const MOCK_PAYMENTS = [
  { id: 'PAY001', lead: 'Global Tech', amount: '₹4,200', percent: '10%', status: 'Pending Verification', tallyRef: null, dueDate: '2026-08-02', daysOverdue: 3 },
  { id: 'PAY002', lead: 'Elite Builders', amount: '₹1,800', percent: '10%', status: 'Verified', tallyRef: 'TALLY-2024-0087', dueDate: '2026-08-01', daysOverdue: 0 },
  { id: 'PAY003', lead: 'Precision Works', amount: '₹3,500', percent: '10%', status: 'Verified', tallyRef: 'TALLY-2024-0091', dueDate: '2026-08-03', daysOverdue: 0 }
];

export default function PaymentGate() {
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [verifying, setVerifying] = useState(null);

  const handleVerify = async (payId) => {
    setVerifying(payId);
    await new Promise(r => setTimeout(r, 1500));
    setPayments(prev => prev.map(p => p.id === payId ? { ...p, status: 'Verified', tallyRef: 'TALLY-2024-' + Math.floor(1000 + Math.random()*9000) } : p));
    setVerifying(null);
    alert('✅ Payment verified against Tally ledger. Lead can now advance to Client (Paid).');
  };

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Payment Gate</h1>
          <p style={s.sub}>Tally integration — 10% advance payment verification. Hard gate before factory release.</p>
        </div>
        <div style={s.tallyBadge}>Tally: Connected ✓</div>
      </div>

      <div style={s.alertBox}>
        <div style={s.alertIcon}>⚠️</div>
        <div>
          <div style={s.alertTitle}>1 payment pending verification</div>
          <div style={s.alertSub}>Global Tech advance payment is 3 days overdue. Send reminder via WhatsApp A5.</div>
        </div>
        <button style={s.alertBtn}>Send Reminder</button>
      </div>

      <div style={s.card}>
        {payments.map(pay => (
          <div key={pay.id} style={s.payRow}>
            <div style={s.payLeft}>
              <div style={s.payId}>{pay.id}</div>
              <div style={s.payLead}>{pay.lead}</div>
            </div>
            <div style={s.payMid}>
              <div style={s.payAmount}>{pay.amount} <span style={s.payPct}>({pay.percent} advance)</span></div>
              <div style={s.payDue}>Due: {pay.dueDate} {pay.daysOverdue > 0 && <span style={s.overdue}>{pay.daysOverdue} days overdue</span>}</div>
              {pay.tallyRef && <div style={s.tallyRef}>Tally Ref: {pay.tallyRef}</div>}
            </div>
            <div style={s.payRight}>
              {pay.status === 'Verified'
                ? <div style={s.verified}>✅ Verified</div>
                : <button onClick={() => handleVerify(pay.id)} disabled={verifying === pay.id} style={s.verifyBtn}>
                    {verifying === pay.id ? '🔄 Verifying…' : '🔍 Verify with Tally'}
                  </button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#08060d', margin:0 },
  sub: { fontSize:'0.78rem', color:'#64748b', marginTop:4 },
  tallyBadge: { backgroundColor:'#fffbeb', color:'#d97706', border:'1px solid #fde68a', borderRadius:20, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700 },
  alertBox: { backgroundColor:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'1.5rem' },
  alertIcon: { fontSize:'1.4rem' },
  alertTitle: { fontWeight:700, color:'#92400e', fontSize:'0.88rem' },
  alertSub: { fontSize:'0.72rem', color:'#b45309', marginTop:2 },
  alertBtn: { marginLeft:'auto', padding:'6px 14px', backgroundColor:'#f59e0b', color:'#fff', border:'none', borderRadius:20, fontWeight:700, fontSize:'0.78rem', cursor:'pointer', flexShrink:0 },
  card: { backgroundColor:'#fff', borderRadius:18, border:'1px solid #e2e8f0', overflow:'hidden' },
  payRow: { display:'flex', alignItems:'center', padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9', gap:'1.5rem' },
  payLeft: { width:120 },
  payId: { fontSize:'0.72rem', fontWeight:700, color:'#aa3bff', fontFamily:'monospace' },
  payLead: { fontSize:'0.9rem', fontWeight:800, color:'#08060d', marginTop:2 },
  payMid: { flex:1 },
  payAmount: { fontSize:'1rem', fontWeight:700, color:'#08060d' },
  payPct: { fontSize:'0.75rem', fontWeight:500, color:'#64748b' },
  payDue: { fontSize:'0.72rem', color:'#64748b', marginTop:2 },
  overdue: { backgroundColor:'#fee2e2', color:'#b91c1c', padding:'1px 7px', borderRadius:10, fontWeight:700, marginLeft:6 },
  tallyRef: { fontSize:'0.68rem', fontFamily:'monospace', color:'#10b981', marginTop:2 },
  payRight: { width:180, textAlign:'right' },
  verified: { color:'#10b981', fontWeight:700, fontSize:'0.85rem' },
  verifyBtn: { padding:'8px 16px', backgroundColor:'#f59e0b', color:'#fff', border:'none', borderRadius:20, fontWeight:700, fontSize:'0.78rem', cursor:'pointer' }
};
