import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const STAGES = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
const VALID_NEXT = {
  Enquiry: 'Qualified', Qualified: 'Booked', Booked: 'Confirmed Lead',
  'Confirmed Lead': 'Client (Paid)', 'Client (Paid)': 'In Production', 'In Production': 'Dispatched'
};
const STAGE_META = {
  Enquiry:         { color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#64748b)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, idx: 0 },
  Qualified:       { color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>, idx: 1 },
  Booked:          { color: '#a855f7', gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, idx: 2 },
  'Confirmed Lead':{ color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, idx: 3 },
  'Client (Paid)': { color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, idx: 4 },
  'In Production': { color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 20h20"/><path d="M6 20V10l4 3V10l4 3V6l6 4v10"/></svg>, idx: 5 },
  Dispatched:      { color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#ec4899)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, idx: 6 }
};

const INITIALS_BG = ['#aa3bff','#3b82f6','#10b981','#f59e0b','#ec4899','#06b6d4'];

export default function CRMLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');

  // Modals & Policy State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCountersignModal, setShowCountersignModal] = useState(false);
  const [targetLead, setTargetLead] = useState(null);
  const [countersignedBy, setCountersignedBy] = useState('e3');
  const [approvalPolicy, setApprovalPolicy] = useState('single-action');

  // Add Lead Form State
  const [newLead, setNewLead] = useState({ name: '', interest: 'CNC Router Pro', budget: '25000', source: 'Meta Ads', notes: '' });

  const fetchLeads = async () => {
    try {
      const r = await fetch(`${API}/leads`);
      const d = await r.json();
      setLeads(d.leads || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const r = await fetch(`${API}/config`);
      const d = await r.json();
      if (d.config?.approvalPolicy) {
        setApprovalPolicy(d.config.approvalPolicy);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchConfig();
  }, []);

  const handlePolicyToggle = async (newPol) => {
    setApprovalPolicy(newPol);
    try {
      await fetch(`${API}/config/approval-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: newPol })
      });
    } catch (err) {
      console.error('Policy update error', err);
    }
  };

  const executeTransitionCall = async (lead, toStage, countersignUser = null) => {
    setTransitioning(lead.id);
    try {
      const res = await fetch(`${API}/leads/${lead.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStage,
          employeeId: 'e2',
          countersignedBy: countersignUser
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchLeads();
      } else {
        alert(`❌ ${data.error || 'Transition Failed'}\n${data.reason || data.details || ''}`);
      }
    } catch {
      alert('Backend connection error.');
    } finally {
      setTransitioning(null);
      setShowCountersignModal(false);
      setTargetLead(null);
    }
  };

  const handleTransitionClick = (lead) => {
    const toStage = VALID_NEXT[lead.stage];
    if (!toStage) return;

    const isHighStakes = (lead.stage === 'Confirmed Lead' && toStage === 'Client (Paid)') ||
                         (lead.stage === 'Client (Paid)' && toStage === 'In Production');

    if (approvalPolicy === 'countersign' && isHighStakes) {
      setTargetLead(lead);
      setShowCountersignModal(true);
    } else {
      executeTransitionCall(lead, toStage);
    }
  };

  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.name) return alert('Lead name is required!');
    try {
      const res = await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewLead({ name: '', interest: 'CNC Router Pro', budget: '25000', source: 'Meta Ads', notes: '' });
        await fetchLeads();
      } else {
        alert('Failed to add lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating lead.');
    }
  };

  const filtered = leads.filter(l =>
    (filterStage === 'All' || l.stage === filterStage) &&
    (l.name?.toLowerCase().includes(search.toLowerCase()) ||
     l.interest?.toLowerCase().includes(search.toLowerCase()))
  );

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.stage === s).length; return acc;
  }, {});

  if (loading) return <div style={s.loading}>Loading CRM Control Cockpit…</div>;

  return (
    <div style={s.page}>

      {/* ── Dark Hero Header ─────────────────────────────────────────── */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={s.heroTag}>CENTRAL LEAD PIPELINE & COCKPIT</div>
          <h1 style={s.heroTitle}>CRM / Lead State Machine</h1>
          <p style={s.heroSub}>Central operating dashboard with Tally 10% payment gate & Dual-Approval workflow</p>
        </div>


        {/* Policy Switcher */}
        <div style={s.policyBox}>
          <div style={s.policyTitle}>BUSINESS APPROVAL POLICY</div>
          <div style={s.policyToggleGroup}>
            <button
              onClick={() => handlePolicyToggle('single-action')}
              style={{
                ...s.policyBtn,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: approvalPolicy === 'single-action' ? '#aa3bff' : 'transparent',
                color: approvalPolicy === 'single-action' ? '#fff' : '#a5b4fc'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Single-Action</span>
            </button>
            <button
              onClick={() => handlePolicyToggle('countersign')}
              style={{
                ...s.policyBtn,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: approvalPolicy === 'countersign' ? '#f59e0b' : 'transparent',
                color: approvalPolicy === 'countersign' ? '#fff' : '#a5b4fc'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Countersign (Dual)</span>
            </button>
          </div>
        </div>

        <div style={s.heroStats}>
          {[
            { label: 'Total Leads',  val: leads.length,                                        clr: '#a5b4fc' },
            { label: 'Paid Clients', val: stageCounts['Client (Paid)'],                        clr: '#6ee7b7' },
            { label: 'Gate Pending', val: stageCounts['Confirmed Lead'],                       clr: '#fde68a' },
            { label: 'In Production',val: stageCounts['In Production'],                        clr: '#67e8f9' }
          ].map(({ label, val, clr }) => (
            <div key={label} style={s.heroStat}>
              <div style={{ ...s.heroStatNum, color: clr }}>{val}</div>
              <div style={s.heroStatLbl}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Integration Connectors Status Bar ──────────────────────────────── */}
      <div style={s.connectorBar}>
        <div style={s.connCard}>
          <span style={s.connDot}></span>
          <div>
            <div style={s.connName}>CRM Connector</div>
            <div style={s.connSub}>Synced · Real-Time Lead Engine</div>
          </div>
        </div>
        <div style={s.connCard}>
          <span style={s.connDot}></span>
          <div>
            <div style={s.connName}>ERP Connector</div>
            <div style={s.connSub}>Connected · Order Release Ready</div>
          </div>
        </div>
        <div style={s.connCard}>
          <span style={s.connDot}></span>
          <div>
            <div style={s.connName}>Dialer Connector</div>
            <div style={s.connSub}>Active Queue Monitor</div>
          </div>
        </div>
        <div style={{...s.connCard, backgroundColor: '#fffbeb', borderColor: '#fde68a'}}>
          <span style={{...s.connDot, backgroundColor: '#f59e0b'}}></span>
          <div>
            <div style={{...s.connName, color: '#92400e'}}>Tally Accounting Ledger</div>
            <div style={{...s.connSub, color: '#b45309'}}>10% Advance Hard Gate Active</div>
          </div>
        </div>
      </div>

      {/* ── Pipeline Stage Swimlanes ──────────────────────────────────── */}
      <div style={s.swimlanes}>
        {STAGES.map(stage => {
          const meta = STAGE_META[stage];
          const count = stageCounts[stage];
          const active = filterStage === stage;
          return (
            <div
              key={stage}
              onClick={() => setFilterStage(active ? 'All' : stage)}
              style={{
                ...s.swimlane,
                borderColor: active ? meta.color : 'transparent',
                background: active ? meta.gradient : '#fff',
                transform: active ? 'scale(1.03)' : 'none'
              }}
            >
              <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
              <span style={{ ...s.swimlaneLbl, color: active ? '#fff' : '#08060d' }}>{stage}</span>
              <span style={{
                ...s.swimlaneCount,
                backgroundColor: active ? 'rgba(255,255,255,0.25)' : meta.color + '18',
                color: active ? '#fff' : meta.color
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar (Search + Add) ────────────────────────────────────── */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search leads by name or product interest…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <button onClick={() => setShowAddModal(true)} style={s.addBtn}>
          + Add New Lead
        </button>
      </div>

      {/* ── Lead Cards Grid ───────────────────────────────────────────── */}
      <div style={s.cardGrid}>
        {filtered.map((lead, idx) => {
          const meta = STAGE_META[lead.stage] || STAGE_META['Enquiry'];
          const progress = ((meta.idx + 1) / STAGES.length) * 100;
          const next = VALID_NEXT[lead.stage];
          const isTransitioning = transitioning === lead.id;
          const avatarBg = INITIALS_BG[idx % INITIALS_BG.length];

          return (
            <div
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              style={{ ...s.leadCard, borderLeftColor: meta.color, cursor: 'pointer' }}
            >
              {/* Card Top */}
              <div style={s.cardTop}>
                <div style={{ ...s.avatar, background: avatarBg }}>
                  {lead.name?.[0] || '?'}
                </div>
                <div style={s.cardInfo}>
                  <div style={s.leadIdStr}>{lead.id}</div>
                  <div style={s.leadName}>{lead.name}</div>
                  <div style={s.leadProduct}>{lead.interest}</div>
                </div>
                <div style={{ ...s.stageBadge, background: meta.gradient }}>
                  {meta.icon} {lead.stage}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={s.progWrap}>
                <div style={s.progTrack}>
                  <div style={{ ...s.progFill, width: `${progress}%`, background: meta.gradient }}/>
                </div>
                <span style={s.progPct}>Step {meta.idx + 1}/7</span>
              </div>

              {/* Card Bottom */}
              <div style={s.cardBottom}>
                <div style={s.budgetWrap}>
                  <div style={s.budget}>₹{parseFloat(lead.budget || 0).toLocaleString('en-IN')}</div>
                  <div style={s.source}>{lead.source || 'Admin Cockpit'}</div>
                </div>
                {next && (
                  <button
                    disabled={isTransitioning}
                    onClick={(e) => { e.stopPropagation(); handleTransitionClick(lead); }}
                    style={{ ...s.advanceBtn, background: meta.gradient, opacity: isTransitioning ? 0.6 : 1 }}
                  >
                    {isTransitioning ? '⏳ Syncing…' : `→ ${next}`}
                  </button>
                )}
                {!next && (
                  <div style={s.completedBadge}>✓ Dispatched</div>
                )}
              </div>

              {/* Gate & Dual-Approval Banners */}
              {lead.stage === 'Confirmed Lead' && (
                <div style={s.gateBanner}>
                  <strong>Tally Gate</strong>: 10% advance required
                  {approvalPolicy === 'countersign' && ' + Dual Approval'}
                </div>
              )}
              {lead.stage === 'Client (Paid)' && (
                <div style={{...s.gateBanner, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46'}}>
                  <strong>Factory Release Ready</strong>
                  {approvalPolicy === 'countersign' && ' (Countersign Active)'}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: '2rem', marginBottom: 10, color: '#cbd5e1' }}>∅</div>
            <div>No lead records found in database.</div>
          </div>
        )}
      </div>

      {/* ── Add Lead Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3>Add New Lead to System Pipeline</h3>

              <button onClick={() => setShowAddModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleAddLeadSubmit} style={s.modalForm}>
              <label style={s.label}>Customer / Company Name</label>
              <input
                required
                style={s.modalInput}
                placeholder="e.g. Acme Manufacturing Ltd."
                value={newLead.name}
                onChange={e => setNewLead({ ...newLead, name: e.target.value })}
              />

              <label style={s.label}>Product Interest</label>
              <input
                required
                style={s.modalInput}
                placeholder="e.g. CNC Router Pro v3"
                value={newLead.interest}
                onChange={e => setNewLead({ ...newLead, interest: e.target.value })}
              />

              <label style={s.label}>Estimated Budget (₹)</label>
              <input
                required
                type="number"
                style={s.modalInput}
                placeholder="35000"
                value={newLead.budget}
                onChange={e => setNewLead({ ...newLead, budget: e.target.value })}
              />

              <label style={s.label}>Lead Source</label>
              <select
                style={s.modalInput}
                value={newLead.source}
                onChange={e => setNewLead({ ...newLead, source: e.target.value })}
              >
                <option value="Meta Ads">Meta Ads</option>
                <option value="AI Voice Agent">AI Voice Agent</option>
                <option value="Inbound Telecaller">Inbound Telecaller</option>
                <option value="Direct Web">Direct Web</option>
              </select>


              <label style={s.label}>Notes & Requirements</label>
              <textarea
                rows="3"
                style={{ ...s.modalInput, resize: 'vertical' }}
                placeholder="Enter client specifications..."
                value={newLead.notes}
                onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
              />

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowAddModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Save Lead & Sync CRM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Countersign Dual-Approval Modal ────────────────────────────── */}
      {showCountersignModal && targetLead && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, borderTop: '6px solid #f59e0b' }}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d97706' }}>BUSINESS POLICY ENFORCEMENT</div>
                <h3 style={{ margin: 0 }}>Countersign (Dual-Approval) Required</h3>
              </div>
              <button onClick={() => setShowCountersignModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                Lead <strong>{targetLead.name} ({targetLead.id})</strong> is transitioning to <strong>{VALID_NEXT[targetLead.stage]}</strong>.
                Under the active <strong>Countersign Policy</strong>, a second authorized officer signature is required before verifying Tally ledger or releasing factory order.
              </p>

              <label style={s.label}>Initiating Officer</label>
              <input disabled value="Bhavya (e2 - Primary)" style={{ ...s.modalInput, backgroundColor: '#f1f5f9' }} />

              <label style={s.label}>Select Countersigning Second Approver</label>
              <select
                style={s.modalInput}
                value={countersignedBy}
                onChange={e => setCountersignedBy(e.target.value)}
              >
                <option value="e3">Aaditya (Operations Manager)</option>
                <option value="e1">Animesh (Senior Sales Lead)</option>
              </select>
            </div>

            <div style={s.modalActions}>
              <button onClick={() => setShowCountersignModal(false)} style={s.cancelBtn}>Cancel</button>
              <button
                onClick={() => executeTransitionCall(targetLead, VALID_NEXT[targetLead.stage], countersignedBy)}
                style={{ ...s.submitBtn, background: 'linear-gradient(135deg,#d97706,#f59e0b)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Sign & Execute Transition</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page:    { padding: '0', fontFamily: 'var(--font-body)', backgroundColor: '#f8fafc', minHeight: '100vh' },
  loading: { padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '1rem' },

  // Hero
  hero: {
    background: 'linear-gradient(135deg,#0f0c1e 0%,#1e1440 60%,#0a0e1a 100%)',
    padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '1.5rem', flexWrap: 'wrap'
  },
  heroLeft:    { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  heroTag:     { fontSize: '0.6rem', fontWeight: 800, letterSpacing: '2px', color: '#a5b4fc', textTransform: 'uppercase' },
  heroTitle:   { fontSize: '2rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.5px' },
  heroSub:     { fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', margin: 0 },

  policyBox: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '0.75rem 1.25rem',
    border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center'
  },
  policyTitle: { fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', marginBottom: 6 },
  policyToggleGroup: { display: 'flex', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', padding: 3, borderRadius: 20 },
  policyBtn: {
    border: 'none', padding: '5px 12px', borderRadius: 16, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s'
  },

  heroStats:   { display: 'flex', gap: '2rem' },
  heroStat:    { textAlign: 'center' },
  heroStatNum: { fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 },
  heroStatLbl: { fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase' },

  // Connector status bar
  connectorBar: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem', padding: '1.25rem 2.5rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0'
  },
  connCard: {
    backgroundColor: '#fff', padding: '0.65rem 1rem', borderRadius: 12, border: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', gap: '0.75rem'
  },
  connDot: { width: 9, height: 9, borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 },
  connName: { fontSize: '0.78rem', fontWeight: 800, color: '#08060d' },
  connSub:  { fontSize: '0.65rem', color: '#64748b' },

  // Swimlanes
  swimlanes: {
    display: 'flex', gap: '0.6rem', padding: '1.25rem 2.5rem',
    backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', overflowX: 'auto'
  },
  swimlane: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.45rem 0.9rem', borderRadius: 24, border: '2px solid',
    cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap'
  },
  swimlaneLbl:   { fontSize: '0.78rem', fontWeight: 700 },
  swimlaneCount: { fontSize: '0.68rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20 },

  // Toolbar
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.1rem 2.5rem', gap: '1rem'
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 24,
    padding: '0.55rem 1rem', flex: 1, maxWidth: 420
  },
  searchInput: {
    border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'var(--font-body)',
    color: '#08060d', backgroundColor: 'transparent', flex: 1, fontWeight: 500
  },
  addBtn: {
    padding: '0.6rem 1.4rem', background: 'linear-gradient(135deg,#aa3bff,#7c3aed)',
    color: '#fff', border: 'none', borderRadius: 24, fontWeight: 700, fontSize: '0.82rem',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(170,59,255,0.35)', whiteSpace: 'nowrap'
  },

  // Card Grid
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem', padding: '0 2.5rem 2.5rem'
  },
  leadCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: '1.25rem',
    borderLeft: '4px solid', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: '0.85rem'
  },
  cardTop:  { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  avatar: {
    width: 40, height: 40, borderRadius: '50%', color: '#fff',
    fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0
  },
  cardInfo:    { flex: 1, minWidth: 0 },
  leadIdStr:   { fontSize: '0.65rem', fontWeight: 800, color: '#aa3bff', fontFamily: 'monospace' },
  leadName:    { fontWeight: 800, fontSize: '0.95rem', color: '#08060d', lineHeight: 1.2 },
  leadProduct: { fontSize: '0.75rem', color: '#64748b', marginTop: 2 },
  stageBadge: {
    fontSize: '0.62rem', fontWeight: 700, color: '#fff',
    padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: 3
  },

  // Progress
  progWrap:  { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  progTrack: { flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden' },
  progFill:  { height: '100%', borderRadius: 10, transition: 'width 0.4s ease' },
  progPct:   { fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' },

  // Card Bottom
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  budgetWrap: {},
  budget: { fontSize: '1.1rem', fontWeight: 900, color: '#08060d' },
  source: { fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: 1 },
  advanceBtn: {
    padding: '6px 14px', color: '#fff', border: 'none', borderRadius: 20,
    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', transition: 'opacity 0.15s',
    whiteSpace: 'nowrap'
  },
  completedBadge: {
    fontSize: '0.72rem', fontWeight: 700, color: '#059669',
    backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: 20
  },

  // Gate banner
  gateBanner: {
    fontSize: '0.7rem', fontWeight: 600, color: '#92400e',
    backgroundColor: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 8, padding: '6px 10px'
  },

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 500,
    padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: 4 },
  modalInput: {
    padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1',
    fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)'
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 20, border: 'none', background: '#aa3bff', color: '#fff', cursor: 'pointer', fontWeight: 700 },

  empty: {
    gridColumn: '1 / -1', textAlign: 'center', padding: '4rem',
    color: '#94a3b8', fontWeight: 600, fontSize: '0.88rem'
  }
};
