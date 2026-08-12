import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Data ────────────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'Enquiry', title: 'Enquiry', color: '#64748b' },
  { key: 'Qualified', title: 'Qualified', color: '#3b82f6' },
  { key: 'Booked', title: 'Booked', color: '#a855f7' },
  { key: 'Confirmed Lead', title: 'Confirmed Lead', color: '#f59e0b', warning: 'Payment Gate' },
  { key: 'Client (Paid)', title: 'Client (Paid)', color: '#10b981', success: '10% Verified' },
  { key: 'In Production', title: 'In Production', color: '#06b6d4' },
  { key: 'Dispatched', title: 'Dispatched', color: '#ec4899' }
];

const MOCK_LEADS = [
  { id: '1', name: 'John Doe', interest: 'CNC Machine v2', budget: '₹15,000', stage: 'Enquiry', source: 'Meta Ads' },
  { id: '2', name: 'Jane Smith', interest: 'Laser Cutter Pro', budget: '₹25,000', stage: 'Qualified', source: 'A1 Voice Agent' },
  { id: '3', name: 'Acme Corp', interest: 'Industrial Mill', budget: '₹50,000', stage: 'Booked', source: 'Inbound Call' },
  { id: '4', name: 'Global Tech', interest: 'Hydraulic Press', budget: '₹42,000', stage: 'Confirmed Lead', source: 'Meta Ads' },
  { id: '5', name: 'Elite Builders', interest: 'CNC Router', budget: '₹18,000', stage: 'Client (Paid)', source: 'Telecaller' },
  { id: '6', name: 'Precision Works', interest: 'Plasma Cutter', budget: '₹35,000', stage: 'In Production', source: 'A1 Voice Agent' },
  { id: '7', name: 'ModernFab', interest: 'Sheet Bender', budget: '₹28,000', stage: 'Dispatched', source: 'WhatsApp A5' }
];

const INTEGRATIONS = [
  { name: 'CRM', icon: '🔗', status: 'Live', role: 'Lead sync & status updates', color: '#10b981' },
  { name: 'ERP', icon: '🏭', status: 'Live', role: 'Booking & factory release', color: '#3b82f6' },
  { name: 'Dialer', icon: '📞', status: 'Live', role: 'Call queue management', color: '#a855f7' },
  { name: 'Tally', icon: '💰', status: 'Live — Hard Gate', role: '10% advance payment gate', color: '#f59e0b' }
];

const RECENT_ACTIVITY = [
  { id: 1, employee: 'Bhavya', action: 'Confirmed Lead approved — Global Tech moved to payment gate', time: '5m ago', icon: '📋' },
  { id: 2, employee: 'A1 Voice Agent', action: 'New enquiry captured — Horizon Industries (₹62,000)', time: '12m ago', icon: '🤖' },
  { id: 3, employee: 'Animesh', action: 'Tally verified 10% advance — Elite Builders moved to Client (Paid)', time: '34m ago', icon: '✅' },
  { id: 4, employee: 'A5 WhatsApp', action: 'Follow-up sent to 3 Confirmed Leads re: pending payment', time: '1h ago', icon: '💬' },
  { id: 5, employee: 'Aaditya', action: 'ERP factory release triggered — Precision Works In Production', time: '2h ago', icon: '🏭' }
];

const ALERTS = [
  { id: 1, type: 'warning', title: 'Payment Pending', message: 'Global Tech (₹42,000) — 10% advance overdue by 3 days', action: 'Verify Now' },
  { id: 2, type: 'info', title: 'A1 Voice Queue', message: '7 new enquiry callbacks queued for today', action: 'View Queue' },
  { id: 3, type: 'success', title: 'Factory Order Released', message: 'Precision Works order released to manufacturing floor', action: 'Track' }
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'analytics';

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'How Can I Assist You Today', sender: 'ai', isHeader: true }
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    const input = chatInput.toLowerCase();
    let reply = "I'm analyzing the A2 pipeline database. What else can I help with?";
    if (input.includes('payment') || input.includes('tally')) reply = "1 lead is pending Tally payment verification: Global Tech (₹42,000) — 3 days overdue. Recommend sending WhatsApp reminder via A5.";
    else if (input.includes('lead') || input.includes('pipeline')) reply = `Pipeline has ${MOCK_LEADS.length} active leads: 1 Enquiry, 1 Qualified, 1 Booked, 1 Confirmed Lead, 1 Client (Paid), 1 In Production, 1 Dispatched.`;
    else if (input.includes('crm')) reply = "CRM sync is live. All 7 leads are synchronized. Last sync: 2 minutes ago.";
    else if (input.includes('erp')) reply = "ERP booking module shows 2 confirmed bookings. Precision Works has an active factory order.";
    else if (input.includes('dialer') || input.includes('call')) reply = "Dialer shows 7 callbacks queued for today. A1 Voice Agent completed 12 calls this morning.";
    else if (input.includes('employee') || input.includes('team')) reply = "Team: Animesh (A1 Voice), Bhavya (A2 Core), Aaditya (A4/A5). Top KPI: Bhavya at 96%.";
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { id: Date.now() + 1, text: reply, sender: 'ai' }]);
    }, 600);
  };

  return (
    <div style={s.container}>

      {/* ─── ANALYTICS VIEW ────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={s.page}>

          {/* Hero Banner */}
          <div style={s.heroCard}>
            <div style={s.heroLeft}>
              <h1 style={s.heroTitle}>Automated Lead Insights</h1>
              <p style={s.heroSub}>
                AI-driven analytics provide clear insights into your pipeline status,
                lead conversions, and overall operational impact.
              </p>
              <div style={s.heroTag}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#aa3bff" stroke="#aa3bff" strokeWidth="1">
                  <path d="M12 2L2 7v10l10 5 10-5V7z"/>
                </svg>
                <span>AI, Leads Pipeline</span>
              </div>
            </div>
            <div style={s.heroRight}>
              {/* Circle Graphic */}
              <div style={s.circleWrap}>
                <div style={s.circleBig}/>
                <div style={s.circleSmall}/>
                <div style={{...s.metricFloat, top: 20, left: 10}}>
                  <div style={s.mVal}>40,874</div><div style={s.mLbl}>Uniques</div>
                </div>
                <div style={{...s.metricFloat, bottom: 35, left: 20}}>
                  <div style={s.mVal}>240</div><div style={s.mLbl}>Clicks</div>
                </div>
                <div style={{...s.metricFloat, bottom: 20, right: 0}}>
                  <div style={s.mVal}>103,542</div><div style={s.mLbl}>Impressions</div>
                </div>
                {/* Location Card */}
                <div style={s.locCard}>
                  <div style={s.locHead}><span>Top Region</span><span style={{color:'#aa3bff'}}>↗</span></div>
                  {[['#c084fc','Maharashtra','47%'],['#a855f7','Gujarat','33%'],['#e9d5ff','Delhi NCR','20%']].map(([clr,nm,pct])=>(
                    <div key={nm} style={s.locRow}>
                      <span style={{...s.locDot,background:clr}}/>
                      <span style={s.locName}>{nm}</span>
                      <span style={s.locPct}>{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status Bar */}
          <div style={s.intBar}>
            {INTEGRATIONS.map(int => (
              <div key={int.name} style={s.intCard}>
                <div style={s.intLeft}>
                  <div style={s.intIcon}>{int.icon}</div>
                  <div>
                    <div style={s.intName}>{int.name}</div>
                    <div style={s.intRole}>{int.role}</div>
                  </div>
                </div>
                <div style={{...s.intBadge, color: int.color, borderColor: int.color, background: int.color+'15'}}>
                  {int.status}
                </div>
              </div>
            ))}
          </div>

          {/* Overview Header */}
          <div style={s.secHead}>
            <h2 style={s.secTitle}>Overview</h2>
            <div style={s.filterRow}>
              {['Last Month','All Campaigns','Global'].map(f => (
                <div key={f} style={s.filterPill}>{f} <span style={{color:'#94a3b8',marginLeft:4}}>✕</span></div>
              ))}
              <button style={s.filterIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Three Card Grid */}
          <div style={s.grid3}>
            {/* Card 1 — Lead Status Performance Bar Chart */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.cardTitle}>Lead Status Performance</div>
                  <div style={s.cardSub}>Number of leads by stage, highlighting conversion</div>
                </div>
                <span style={s.cardArrow}>↗</span>
              </div>
              <div style={s.barChart}>
                {[['17,874','Enquiry',140],['10,874','Qualified',90],['8,874','Booked',70],['6,874','Confirmed',50]].map(([val,lbl,h]) => (
                  <div key={lbl} style={s.barCol}>
                    <div style={s.barVal}>{val}</div>
                    <div style={{...s.bar, height: h}}>
                      <div style={s.barSheen}/>
                    </div>
                    <div style={s.barLbl}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2 — Call Channel Stats */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.cardTitle}>Call Channel Stats</div>
                  <div style={s.cardSub}>CTR comparison for telecallers vs A1 AI agent</div>
                </div>
                <span style={s.cardArrow}>↗</span>
              </div>
              <div style={s.ctrBody}>
                <div style={s.aiPrompt}>✨ What would you like to explore next?</div>
                <div style={s.ctrRow}>
                  <div>
                    <div style={s.ctrBig}>0.04%</div>
                    <div style={s.ctrLbl}>CTR — Telecaller</div>
                  </div>
                  <div style={s.ctrDivider}/>
                  <div>
                    <div style={s.ctrBig}>0.08%</div>
                    <div style={s.ctrLbl}>CTR — A1 AI Agent</div>
                  </div>
                </div>
                <div style={s.progBar}>
                  <div style={s.progA}/>
                  <div style={s.progB}/>
                </div>
                <div style={s.ctrNote}>A1 AI Agent converts 2× better than human telecallers</div>
              </div>
            </div>

            {/* Card 3 — APS AI Assistant */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>APS AI Assistant</div>
                <div style={{color:'#94a3b8',cursor:'pointer'}}>•••</div>
              </div>
              <div style={s.chatWrap}>
                <div style={s.chatArea}>
                  {chatMessages.map(msg => (
                    <div key={msg.id} style={{...s.bubble, ...(msg.sender === 'ai' ? s.bubbleAi : s.bubbleUser)}}>
                      {msg.sender === 'ai' && (
                        <div style={s.aiAvatar}>🔮</div>
                      )}
                      <div>
                        {msg.isHeader && <div style={s.aiLabel}>HOW CAN I <span style={{color:'#aa3bff'}}>ASSIST</span> YOU TODAY</div>}
                        <div style={s.bubbleText}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={s.chatForm}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask me anything about leads, CRM, Tally..."
                    style={s.chatInput}
                  />
                  <div style={s.chatFoot}>
                    <span style={s.chatAttach}>📎 Attach File</span>
                    <div style={{display:'flex',gap:4}}>
                      <button type="button" style={s.chatCircle}>✏️</button>
                      <button type="button" style={s.chatCircle}>🖼️</button>
                      <button type="submit" style={s.chatSend}>🎤</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Bottom Two-Column: Activity + Alerts */}
          <div style={s.grid2}>
            {/* Recent Activity */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>Recent Activity Log</div>
                <div style={{...s.filterPill, fontSize:'0.7rem'}}>View All →</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {RECENT_ACTIVITY.map(act => (
                  <div key={act.id} style={s.actRow}>
                    <div style={s.actIcon}>{act.icon}</div>
                    <div style={{flex:1}}>
                      <div style={s.actName}>{act.employee}</div>
                      <div style={s.actDesc}>{act.action}</div>
                    </div>
                    <div style={s.actTime}>{act.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts & Predictions */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>Alerts & Predictions</div>
                <div style={{...s.intBadge, color:'#a855f7',borderColor:'#a855f7',background:'#a855f715',fontSize:'0.7rem'}}>AI Powered</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {ALERTS.map(alert => (
                  <div key={alert.id} style={{...s.alertCard, borderLeftColor: alert.type==='warning'?'#f59e0b':alert.type==='success'?'#10b981':'#3b82f6'}}>
                    <div style={s.alertTitle}>{alert.title}</div>
                    <div style={s.alertMsg}>{alert.message}</div>
                    <button style={{...s.alertBtn, color: alert.type==='warning'?'#f59e0b':alert.type==='success'?'#10b981':'#3b82f6'}}>{alert.action} →</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─── PIPELINE VIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div style={s.page}>
          <div style={s.pipeHead}>
            <div>
              <h1 style={s.secTitle}>Lead Status Pipeline</h1>
              <p style={{...s.cardSub, marginTop:4}}>State machine enforcement — payment gate required to advance to Client (Paid)</p>
            </div>
            <button style={s.addBtn}>+ Add New Lead</button>
          </div>

          <div style={s.pipeGrid}>
            {PIPELINE_STAGES.map(stage => {
              const stageLeads = MOCK_LEADS.filter(l => l.stage === stage.key);
              return (
                <div key={stage.key} style={s.pipeCol}>
                  <div style={{...s.pipeColHead, borderTopColor: stage.color}}>
                    <span style={s.pipeColTitle}>{stage.title}</span>
                    <span style={s.pipeBadge}>{stageLeads.length}</span>
                  </div>
                  {stage.warning && <div style={s.warnBanner}>{stage.warning}</div>}
                  {stage.success && <div style={s.sucBanner}>{stage.success}</div>}
                  <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
                    {stageLeads.map(lead => (
                      <div key={lead.id} style={s.leadCard} onClick={() => navigate(`/leads/${lead.id}`)}>
                        <div style={s.leadRow}>
                          <span style={s.leadName}>{lead.name}</span>
                          <span style={{color:'#aa3bff',fontWeight:700}}>→</span>
                        </div>
                        <div style={s.leadProduct}>{lead.interest}</div>
                        <div style={s.leadMeta}>
                          <span style={s.leadBudget}>{lead.budget}</span>
                          <span style={s.leadSource}>{lead.source}</span>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && <div style={s.empty}>No leads</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  container: { padding:'2rem', fontFamily:'var(--font-body)', backgroundColor:'var(--bg-primary)', minHeight:'calc(100vh - 70px)', boxSizing:'border-box' },
  page: { display:'flex', flexDirection:'column', gap:'1.5rem' },

  // Hero
  heroCard: { backgroundColor:'#fff', borderRadius:24, padding:'2.5rem', border:'1px solid #e2e8f0', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.04)', display:'flex', justifyContent:'space-between', minHeight:240, position:'relative', overflow:'hidden' },
  heroLeft: { flex:'1 1 50%', display:'flex', flexDirection:'column', justifyContent:'center', gap:'1rem', zIndex:2 },
  heroTitle: { fontSize:'2.8rem', fontWeight:800, fontFamily:'var(--font-heading)', letterSpacing:'-1.5px', color:'#08060d', margin:0 },
  heroSub: { fontSize:'0.95rem', lineHeight:1.6, color:'#64748b', maxWidth:500, margin:0 },
  heroTag: { display:'inline-flex', alignItems:'center', gap:6, backgroundColor:'#08060d', color:'#fff', padding:'6px 14px', borderRadius:20, width:'fit-content', fontSize:'0.8rem', fontWeight:700 },
  heroRight: { flex:'1 1 50%', display:'flex', justifyContent:'flex-end', alignItems:'center', position:'relative' },

  // Circles
  circleWrap: { position:'relative', width:300, height:220 },
  circleBig: { position:'absolute', width:180, height:180, borderRadius:'50%', background:'linear-gradient(135deg,rgba(170,59,255,0.35) 0%,rgba(192,132,252,0.15) 100%)', top:10, right:20, filter:'blur(2px)' },
  circleSmall: { position:'absolute', width:120, height:120, borderRadius:'50%', backgroundColor:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', top:60, right:120, boxShadow:'0 4px 6px rgba(0,0,0,0.04)' },
  metricFloat: { position:'absolute' },
  mVal: { fontSize:'0.95rem', fontWeight:800, color:'#08060d' },
  mLbl: { fontSize:'0.65rem', color:'#64748b', fontWeight:600 },
  locCard: { position:'absolute', top:8, right:0, backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'0.8rem 1rem', width:140, boxShadow:'0 8px 20px rgba(0,0,0,0.06)' },
  locHead: { display:'flex', justifyContent:'space-between', fontSize:'0.72rem', fontWeight:700, color:'#08060d', marginBottom:6 },
  locRow: { display:'flex', alignItems:'center', fontSize:'0.68rem', fontWeight:600, marginBottom:4 },
  locDot: { width:6, height:6, borderRadius:'50%', marginRight:6 },
  locName: { color:'#64748b', flexGrow:1, textAlign:'left' },
  locPct: { color:'#08060d', fontWeight:700 },

  // Integration Bar
  intBar: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' },
  intCard: { backgroundColor:'#fff', borderRadius:16, padding:'1rem 1.25rem', border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.03)' },
  intLeft: { display:'flex', alignItems:'center', gap:'0.75rem' },
  intIcon: { fontSize:'1.4rem', width:38, height:38, borderRadius:10, backgroundColor:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center' },
  intName: { fontWeight:800, fontSize:'0.9rem', color:'#08060d', fontFamily:'var(--font-heading)' },
  intRole: { fontSize:'0.7rem', color:'#64748b', fontWeight:500 },
  intBadge: { fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid' },

  // Overview Header
  secHead: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  secTitle: { fontSize:'2rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#08060d', margin:0 },
  filterRow: { display:'flex', gap:'0.5rem', alignItems:'center' },
  filterPill: { backgroundColor:'#fff', border:'1px solid #e2e8f0', padding:'5px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, color:'#08060d', display:'flex', alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.04)', cursor:'pointer' },
  filterIcon: { width:32, height:32, borderRadius:'50%', backgroundColor:'#fff', border:'1px solid #e2e8f0', color:'#08060d', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },

  // Cards
  grid3: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem' },
  grid2: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'1.25rem' },
  card: { backgroundColor:'#fff', borderRadius:24, padding:'1.75rem', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', display:'flex', flexDirection:'column', gap:'1rem' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  cardTitle: { fontSize:'1rem', fontWeight:800, color:'#08060d', fontFamily:'var(--font-heading)', margin:0 },
  cardSub: { fontSize:'0.72rem', color:'#64748b', marginTop:2 },
  cardArrow: { color:'#aa3bff', fontWeight:800, fontSize:'1.1rem' },

  // Bar Chart
  barChart: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', height:175, paddingTop:'0.75rem' },
  barCol: { display:'flex', flexDirection:'column', alignItems:'center', flexGrow:1 },
  barVal: { fontSize:'0.72rem', fontWeight:700, color:'#08060d', marginBottom:4 },
  bar: { width:42, background:'linear-gradient(180deg,#c084fc,#aa3bff)', borderRadius:'8px 8px 0 0', position:'relative', overflow:'hidden' },
  barSheen: { position:'absolute', inset:0, backgroundImage:'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize:'10px 10px' },
  barLbl: { fontSize:'0.68rem', color:'#64748b', fontWeight:600, marginTop:6, textAlign:'center' },

  // CTR
  ctrBody: { display:'flex', flexDirection:'column', gap:'1rem', flex:1 },
  aiPrompt: { fontSize:'0.78rem', fontWeight:600, color:'#64748b', backgroundColor:'#f8fafc', padding:'6px 12px', borderRadius:20, width:'fit-content' },
  ctrRow: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  ctrBig: { fontSize:'1.8rem', fontWeight:800, color:'#08060d' },
  ctrLbl: { fontSize:'0.68rem', color:'#64748b', fontWeight:600 },
  ctrDivider: { width:1, height:40, backgroundColor:'#e2e8f0' },
  progBar: { display:'flex', height:20, borderRadius:10, overflow:'hidden', backgroundColor:'#f1f3f7' },
  progA: { width:'40%', background:'linear-gradient(90deg,#c084fc,#a855f7)' },
  progB: { width:'60%', background:'linear-gradient(90deg,#e9d5ff,#c084fc)' },
  ctrNote: { fontSize:'0.72rem', color:'#64748b', fontStyle:'italic' },

  // Chatbot
  chatWrap: { display:'flex', flexDirection:'column', flex:1, minHeight:200 },
  chatArea: { flexGrow:1, maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'0.75rem' },
  bubble: { display:'flex', gap:'0.5rem', padding:'0.65rem 0.9rem', borderRadius:16, fontSize:'0.78rem', lineHeight:1.4, width:'fit-content', maxWidth:'90%' },
  bubbleAi: { backgroundColor:'#f8fafc', color:'#08060d', alignSelf:'flex-start', borderTopLeftRadius:2 },
  bubbleUser: { backgroundColor:'#aa3bff', color:'#fff', alignSelf:'flex-end', borderTopRightRadius:2 },
  aiAvatar: { width:18, height:18, borderRadius:'50%', backgroundColor:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.08)', flexShrink:0, fontSize:10 },
  aiLabel: { fontSize:'0.6rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 },
  bubbleText: { fontWeight:600 },
  chatForm: { border:'1px solid #e2e8f0', borderRadius:14, padding:'0.4rem', backgroundColor:'#f8fafc' },
  chatInput: { width:'100%', border:'none', backgroundColor:'transparent', outline:'none', padding:'4px 8px', fontSize:'0.78rem', fontFamily:'var(--font-body)', fontWeight:500, color:'#08060d' },
  chatFoot: { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.35rem', borderTop:'1px solid #e2e8f0', paddingTop:'0.3rem' },
  chatAttach: { border:'none', backgroundColor:'transparent', color:'#94a3b8', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' },
  chatCircle: { width:22, height:22, borderRadius:'50%', border:'none', backgroundColor:'transparent', cursor:'pointer', fontSize:'0.72rem' },
  chatSend: { width:22, height:22, borderRadius:'50%', border:'none', backgroundColor:'#aa3bff', color:'#fff', cursor:'pointer', fontSize:'0.72rem', display:'flex', alignItems:'center', justifyContent:'center' },

  // Activity
  actRow: { display:'flex', alignItems:'flex-start', gap:'0.75rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f8fafc' },
  actIcon: { fontSize:'1.1rem', width:32, height:32, backgroundColor:'#f8fafc', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  actName: { fontSize:'0.8rem', fontWeight:700, color:'#08060d' },
  actDesc: { fontSize:'0.72rem', color:'#64748b', lineHeight:1.4 },
  actTime: { fontSize:'0.68rem', color:'#94a3b8', fontWeight:600, whiteSpace:'nowrap' },

  // Alerts
  alertCard: { padding:'0.9rem 1rem', borderRadius:12, backgroundColor:'#f8fafc', borderLeft:'3px solid', display:'flex', flexDirection:'column', gap:'0.25rem' },
  alertTitle: { fontSize:'0.85rem', fontWeight:800, color:'#08060d' },
  alertMsg: { fontSize:'0.75rem', color:'#64748b', lineHeight:1.4 },
  alertBtn: { fontSize:'0.72rem', fontWeight:700, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', marginTop:'0.25rem' },

  // Pipeline
  pipeHead: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  addBtn: { padding:'0.65rem 1.4rem', backgroundColor:'#08060d', color:'#fff', border:'none', borderRadius:24, fontWeight:700, fontSize:'0.85rem', cursor:'pointer' },
  pipeGrid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1rem', alignItems:'start', overflowX:'auto', paddingBottom:'1rem' },
  pipeCol: { backgroundColor:'#fff', borderRadius:18, padding:'0.9rem', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', minHeight:360 },
  pipeColHead: { display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.65rem', marginBottom:'0.75rem', borderTop:'4px solid', paddingTop:'0.4rem' },
  pipeColTitle: { fontWeight:800, fontSize:'0.78rem', color:'#08060d', fontFamily:'var(--font-heading)' },
  pipeBadge: { backgroundColor:'#f1f3f7', color:'#64748b', padding:'2px 7px', borderRadius:10, fontSize:'0.68rem', fontWeight:700 },
  warnBanner: { backgroundColor:'#fffbeb', color:'#b45309', padding:'3px 6px', borderRadius:6, fontSize:'0.65rem', fontWeight:700, textAlign:'center', marginBottom:'0.6rem', border:'1px solid #fef3c7' },
  sucBanner: { backgroundColor:'#ecfdf5', color:'#047857', padding:'3px 6px', borderRadius:6, fontSize:'0.65rem', fontWeight:700, textAlign:'center', marginBottom:'0.6rem', border:'1px solid #d1fae5' },
  leadCard: { backgroundColor:'#f8fafc', borderRadius:12, padding:'0.85rem', cursor:'pointer', border:'1px solid transparent', transition:'all 0.15s' },
  leadRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 },
  leadName: { fontWeight:700, fontSize:'0.82rem', color:'#08060d' },
  leadProduct: { fontSize:'0.7rem', color:'#64748b', marginBottom:4 },
  leadMeta: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  leadBudget: { fontSize:'0.75rem', fontWeight:700, color:'#aa3bff' },
  leadSource: { fontSize:'0.65rem', color:'#94a3b8', fontWeight:600 },
  empty: { fontSize:'0.72rem', color:'#94a3b8', textAlign:'center', padding:'1rem 0' }
};
