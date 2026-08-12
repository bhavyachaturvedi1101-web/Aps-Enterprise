import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

const STAGES = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
const VALID_NEXT = {
  Enquiry: 'Qualified', Qualified: 'Booked', Booked: 'Confirmed Lead',
  'Confirmed Lead': 'Client (Paid)', 'Client (Paid)': 'In Production', 'In Production': 'Dispatched'
};
const STAGE_META = {
  Enquiry:         { color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#64748b)', icon: '📥', idx: 0 },
  Qualified:       { color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', icon: '✅', idx: 1 },
  Booked:          { color: '#a855f7', gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', icon: '📅', idx: 2 },
  'Confirmed Lead':{ color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: '🔐', idx: 3 },
  'Client (Paid)': { color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)', icon: '💰', idx: 4 },
  'In Production': { color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: '🏭', idx: 5 },
  Dispatched:      { color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#ec4899)', icon: '🚚', idx: 6 }
};

const INITIALS_BG = ['#aa3bff','#3b82f6','#10b981','#f59e0b','#ec4899','#06b6d4'];

export default function CRMLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/leads`).then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleTransition = async (lead) => {
    const toStage = VALID_NEXT[lead.stage];
    if (!toStage) return;
    setTransitioning(lead.id);
    try {
      const res = await fetch(`${API}/leads/${lead.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage, employeeId: 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: toStage } : l));
      } else {
        alert(`❌ ${data.error}\n${data.details || data.reason || ''}`);
      }
    } catch { alert('Backend connection error.'); }
    setTransitioning(null);
  };

  const filtered = leads.filter(l =>
    (filterStage === 'All' || l.stage === filterStage) &&
    (l.name?.toLowerCase().includes(search.toLowerCase()) ||
     l.interest?.toLowerCase().includes(search.toLowerCase()))
  );

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.stage === s).length; return acc;
  }, {});

  if (loading) return <div style={s.loading}>Loading CRM data…</div>;

  return (
    <div style={s.page}>

      {/* ── Dark Hero Header ─────────────────────────────────────────── */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={s.heroTag}>A2 MODULE · CRM LAYER</div>
          <h1 style={s.heroTitle}>CRM / Lead Pipeline</h1>
          <p style={s.heroSub}>7-stage state machine with Tally payment gate enforcement</p>
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
              style={{ ...s.swimlane, borderColor: active ? meta.color : 'transparent', background: active ? meta.gradient : '#fff' }}
            >
              <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
              <span style={{ ...s.swimlaneLbl, color: active ? '#fff' : '#08060d' }}>{stage}</span>
              <span style={{ ...s.swimlaneCount, backgroundColor: active ? 'rgba(255,255,255,0.25)' : meta.color + '18', color: active ? '#fff' : meta.color }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* ── Search + Add ──────────────────────────────────────────────── */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search leads by name or product…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <button style={s.addBtn}>+ Add Lead</button>
      </div>

      {/* ── Lead Cards ───────────────────────────────────────────────── */}
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
              style={{ ...s.leadCard, borderLeftColor: meta.color, outline: selected === lead.id ? `2px solid ${meta.color}` : 'none' }}
              onClick={() => setSelected(selected === lead.id ? null : lead.id)}
            >
              {/* Card Top */}
              <div style={s.cardTop}>
                <div style={{ ...s.avatar, background: avatarBg }}>
                  {lead.name?.[0] || '?'}
                </div>
                <div style={s.cardInfo}>
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
                  <div style={s.budget}>{lead.budget}</div>
                  <div style={s.source}>{lead.source || 'Meta Ads'}</div>
                </div>
                {next && (
                  <button
                    disabled={isTransitioning}
                    onClick={(e) => { e.stopPropagation(); handleTransition(lead); }}
                    style={{ ...s.advanceBtn, background: meta.gradient, opacity: isTransitioning ? 0.6 : 1 }}
                  >
                    {isTransitioning ? '⏳' : `→ ${next}`}
                  </button>
                )}
                {!next && (
                  <div style={s.completedBadge}>✅ Complete</div>
                )}
              </div>

              {/* Gate Warning */}
              {lead.stage === 'Confirmed Lead' && (
                <div style={s.gateBanner}>🔐 Tally payment gate — verify 10% advance before advancing</div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
            <div>No leads match your filter</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page:    { padding: '0', fontFamily: 'var(--font-body)', backgroundColor: '#f8fafc', minHeight: '100%' },
  loading: { padding: '4rem', textAlign: 'center', color: '#64748b' },

  // Hero
  hero: {
    background: 'linear-gradient(135deg,#0f0c1e 0%,#1e1440 60%,#0a0e1a 100%)',
    padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  heroLeft:    { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  heroTag:     { fontSize: '0.6rem', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },
  heroTitle:   { fontSize: '2rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.5px' },
  heroSub:     { fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: 0 },
  heroStats:   { display: 'flex', gap: '2.5rem' },
  heroStat:    { textAlign: 'center' },
  heroStatNum: { fontSize: '2rem', fontWeight: 900, lineHeight: 1 },
  heroStatLbl: { fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Swimlane filter
  swimlanes: {
    display: 'flex', gap: '0.6rem', padding: '1.25rem 2.5rem',
    backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', overflowX: 'auto'
  },
  swimlane: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.45rem 0.9rem', borderRadius: 24, border: '2px solid',
    cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
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
    padding: '0.55rem 1rem', flex: 1, maxWidth: 420, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
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
    gap: '1rem', padding: '0 2.5rem 2.5rem'
  },
  leadCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: '1.25rem',
    borderLeft: '4px solid', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.85rem'
  },

  // Card Top
  cardTop:  { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  avatar: {
    width: 40, height: 40, borderRadius: '50%', color: '#fff',
    fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0
  },
  cardInfo:    { flex: 1, minWidth: 0 },
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

  // Empty
  empty: {
    gridColumn: '1 / -1', textAlign: 'center', padding: '4rem',
    color: '#94a3b8', fontWeight: 600, fontSize: '0.88rem'
  }
};
