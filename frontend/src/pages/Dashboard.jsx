import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CRMLeads from './CRMLeads';

const API = 'http://localhost:5000/api';

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

const INTEGRATIONS = [
  {
    name: 'CRM',
    role: 'Lead sync & status updates',
    color: '#10b981',
    status: 'Live',
    iconBg: '#ecfdf5',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    )
  },
  {
    name: 'ERP',
    role: 'Booking & factory release',
    color: '#3b82f6',
    status: 'Live',
    iconBg: '#eff6ff',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20"/>
        <path d="M6 20V10l4 3V10l4 3V6l6 4v10"/>
      </svg>
    )
  },
  {
    name: 'Dialer',
    role: 'Call queue management',
    color: '#a855f7',
    status: 'Live',
    iconBg: '#f3e8ff',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    )
  },
  {
    name: 'Tally',
    role: '10% advance payment gate',
    color: '#f59e0b',
    status: 'Live — Hard Gate',
    iconBg: '#fffbeb',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    )
  }
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'analytics';

  const [leads, setLeads] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', interest: 'CNC Router Pro', budget: '25000', source: 'Meta Ads', notes: '' });

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
        const leadsRes = await fetch(`${API}/leads`);
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      } else {
        alert('Failed to add lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating lead.');
    }
  };

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState(['Last Month', 'All Campaigns', 'Global']);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selDate, setSelDate] = useState('Last Month');
  const [selCampaign, setSelCampaign] = useState('All Campaigns');
  const [selGeo, setSelGeo] = useState('Global');
  const [isListening, setIsListening] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'How Can I Assist You Today', sender: 'ai', isHeader: true }
  ]);

  // Fetch leads and activities
  useEffect(() => {
    const fetchData = async () => {
      try {
        const leadsRes = await fetch(`${API}/leads`);
        const leadsData = await leadsRes.json();
        
        const activityRes = await fetch(`${API}/activity`);
        const activityData = await activityRes.json();

        setLeads(leadsData.leads || []);
        setActivityLogs(activityData.logs || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const res = await fetch(`${API}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentInput })
      });
      const data = await res.json();
      if (data && data.answer) {
        setChatMessages(prev => [
          ...prev, 
          { 
            id: Date.now() + 1, 
            text: data.answer, 
            sender: 'ai',
            chartData: data.chartData,
            actionSuggestions: data.actionSuggestions 
          }
        ]);
        return;
      }
    } catch (err) {
      console.error('Error contacting APS AI backend:', err);
    }

    // Smart fallback response
    const input = currentInput.toLowerCase().trim();
    let reply = "";
    if (['hi', 'hello', 'hiii', 'hey', 'hii', 'greetings'].some(w => input.startsWith(w) || input === w)) {
      reply = `Hello! I am your APS Enterprise AI Assistant. Currently, you have ${leads.length} active leads across 7 pipeline stages. How can I help you manage operations today?`;
    } else if (input.includes('payment') || input.includes('tally') || input.includes('gate') || input.includes('advance')) {
      const pendingVerify = leads.filter(l => l.stage === 'Confirmed Lead');
      if (pendingVerify.length > 0) {
        reply = `Tally Gate Alert: ${pendingVerify.length} lead(s) require 10% advance verification: ${pendingVerify.map(l => `${l.name} (₹${parseFloat(l.budget).toLocaleString('en-IN')})`).join(', ')}. Recommend verifying via the Payment Gate.`;
      } else {
        reply = "All payment gates are verified. 0 leads pending Tally 10% advance verification.";
      }
    } else if (input.includes('lead') || input.includes('pipeline') || input.includes('stage')) {
      const stageCounts = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage.key] = leads.filter(l => l.stage === stage.key).length;
        return acc;
      }, {});
      reply = `Pipeline Summary (${leads.length} Total Leads):\n` + 
        PIPELINE_STAGES.map(s => `• ${s.title}: ${stageCounts[s.key] || 0}`).join('\n');
    } else if (input.includes('crm')) {
      reply = `CRM Connector is active. All ${leads.length} leads are synchronized in real-time with state machine enforcement.`;
    } else if (input.includes('erp') || input.includes('factory') || input.includes('order')) {
      const booked = leads.filter(l => ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)).length;
      const inProd = leads.filter(l => l.stage === 'In Production').length;
      reply = `ERP Layer Status: ${booked} bookings created, ${inProd} released to manufacturing floor.`;
    } else if (input.includes('dialer') || input.includes('call') || input.includes('voice')) {
      reply = "AI Voice Agent & Dialer: 7 callbacks queued for today. Average call conversion rate is 42%.";
    } else if (input.includes('employee') || input.includes('team') || input.includes('kpi')) {
      reply = "Team KPIs: 5 active operators. Bhavya leading at 98% KPI score.";
    } else {
      reply = `I have analyzed your query "${currentInput}". The APS Operating System is fully synchronized with ${leads.length} active leads. You can check CRM pipeline, ERP bookings, or Tally payment gates anytime.`;
    }


    setChatMessages(prev => [...prev, { id: Date.now() + 1, text: reply, sender: 'ai' }]);
  };

  const handleFileAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageAttachClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), text: `Attached file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, sender: 'user' },
      { id: Date.now() + 1, text: `Received file "${file.name}". Processing attachment with APS Document AI...`, sender: 'ai' }
    ]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), text: `Attached image: ${file.name}`, sender: 'user' },
      { id: Date.now() + 1, text: `Analyzing image "${file.name}" for equipment specifications and invoice data...`, sender: 'ai' }
    ]);
  };

  const handleClearChat = () => {
    setChatMessages([{ id: Date.now(), text: 'Chat history cleared. How can I assist you today?', sender: 'ai', isHeader: true }]);
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setChatInput('Show me all confirmed leads pending Tally payment verification');
      setIsListening(true);
      setTimeout(() => setIsListening(false), 2000);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };


  // Compute stats dynamically
  const stageCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = leads.filter(l => l.stage === stage.key).length;
    return acc;
  }, {});

  // Generate dynamic alerts based on lead status
  const getDynamicAlerts = () => {
    const alerts = [];
    const pendingPayment = leads.filter(l => l.stage === 'Confirmed Lead');
    const inProduction = leads.filter(l => l.stage === 'In Production');

    if (pendingPayment.length > 0) {
      alerts.push({
        id: 1,
        type: 'warning',
        title: 'Payment Pending Gate',
        message: `${pendingPayment[0].name} (₹${parseFloat(pendingPayment[0].budget).toLocaleString('en-IN')}) — 10% advance verification pending.`,
        action: 'Verify Now',
        route: `/leads/${pendingPayment[0].id}`
      });
    } else {
      alerts.push({
        id: 1,
        type: 'info',
        title: 'Payments Up-to-Date',
        message: 'No pending advance payments requiring immediate verification.',
        action: 'View Gate',
        route: '/payments'
      });
    }

    alerts.push({
      id: 2,
      type: 'info',
      title: 'AI Voice Queue',
      message: '7 new enquiry callbacks queued for today',
      action: 'View Queue',
      route: '/dialer'
    });


    if (inProduction.length > 0) {
      alerts.push({
        id: 3,
        type: 'success',
        title: 'Factory Order Released',
        message: `${inProduction[0].name} order released to manufacturing floor.`,
        action: 'Track',
        route: '/bookings'
      });
    }

    return alerts;
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading dashboard data...</div>;
  }

  return (
    <div style={s.container}>

      {/* ─── ANALYTICS VIEW ────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={s.page}>

          {/* Hero Banner */}
          <div style={s.heroCard}>
            <div style={s.heroLeft}>
              <h1 style={s.heroTitle}>Automated Lead Insights</h1>
              <div style={s.heroStatsRow}>
                <div style={s.heroStatChip}>
                  <span style={s.heroStatVal}>{leads.length}</span>
                  <span style={s.heroStatLbl}>Active Pipeline Leads</span>
                </div>
                <div style={s.heroStatChip}>
                  <span style={s.heroStatVal}>₹{leads.reduce((acc, l) => acc + (parseFloat(l.budget) || 0), 0).toLocaleString('en-IN')}</span>
                  <span style={s.heroStatLbl}>Total Pipeline Value</span>
                </div>
                <div style={s.heroStatChip}>
                  <span style={{ ...s.heroStatVal, color: '#09090b' }}>100%</span>
                  <span style={s.heroStatLbl}>Tally Gate Clearance</span>
                </div>
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
                  <div style={s.locHead}>
                    <span>Top Region</span>
                    <span
                      className="card-arrow-btn"
                      onClick={() => navigate('/crm')}
                      style={{ color: '#09090b', cursor: 'pointer', padding: '0 4px', borderRadius: 4, transition: 'all 0.15s ease' }}
                      title="Open Regional Leads in CRM"
                    >
                      ↗
                    </span>
                  </div>
                  {[['#a855f7','Maharashtra','47%'],['#c084fc','Gujarat','33%'],['#c084fc','Delhi NCR','20%']].map(([clr,nm,pct])=>(
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
            {INTEGRATIONS.map(int => {
              const routeMap = { CRM: '/crm', ERP: '/bookings', Dialer: '/dialer', Tally: '/tally' };
              return (
                <div
                  key={int.name}
                  style={{ ...s.intCard, cursor: 'pointer' }}
                  onClick={() => navigate(routeMap[int.name] || '/dashboard')}
                  title={`Open ${int.name} Module`}
                >
                  <div style={s.intLeft}>
                    <div style={{ ...s.intIcon, backgroundColor: int.iconBg, color: int.color }}>{int.svg}</div>
                    <div>
                      <div style={s.intName}>{int.name}</div>
                      <div style={s.intRole}>{int.role}</div>
                    </div>
                  </div>
                  <div style={{...s.intBadge, color: int.color, borderColor: `${int.color}35`, background: int.iconBg }}>
                    {int.status}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overview Header */}
          <div style={s.secHead}>
            <h2 style={s.secTitle}>Overview</h2>
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
                <span
                  className="card-arrow-btn"
                  style={s.cardArrow}
                  onClick={() => navigate('/crm')}
                  title="Open Lead Pipeline in CRM"
                >
                  ↗
                </span>
              </div>
              <div style={s.barChart}>
                {[
                  [stageCounts['Enquiry'] || 0, 'Enquiry', 'linear-gradient(180deg, #64748b 0%, #334155 100%)', 'rgba(100,116,139,0.2)'],
                  [stageCounts['Qualified'] || 0, 'Qualified', 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', 'rgba(59,130,246,0.25)'],
                  [stageCounts['Booked'] || 0, 'Booked', 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)', 'rgba(168,85,247,0.25)'],
                  [stageCounts['Confirmed Lead'] || 0, 'Confirmed', 'linear-gradient(180deg, #10b981 0%, #047857 100%)', 'rgba(16,185,129,0.25)']
                ].map(([val, lbl, bg, shd]) => {
                  const maxCount = Math.max(...Object.values(stageCounts), 1);
                  const h = Math.max(40, (val / maxCount) * 150);
                  return (
                    <div key={lbl} style={s.barCol}>
                      <div style={s.barVal}>{val}</div>
                      <div style={{...s.bar, height: h, background: bg, boxShadow: `0 4px 12px ${shd}`}}>
                        <div style={s.barSheen}/>
                      </div>
                      <div style={s.barLbl}>{lbl}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2 — Call Channel Stats */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.cardTitle}>Call Channel Stats</div>
                  <div style={s.cardSub}>CTR comparison for telecallers vs Voice AI agent</div>
                </div>
                <span
                  className="card-arrow-btn"
                  style={s.cardArrow}
                  onClick={() => navigate('/voice')}
                  title="Open Voice AI Agent & Dialer"
                >
                  ↗
                </span>
              </div>
              <div style={s.ctrBody}>
                <div style={s.ctrRow}>
                  <div>
                    <div style={{ ...s.ctrBig, color: '#475569' }}>0.04%</div>
                    <div style={s.ctrLbl}>CTR — Telecaller</div>
                  </div>
                  <div style={s.ctrDivider}/>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ ...s.ctrBig, color: '#059669' }}>0.08%</div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 10, background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0' }}>+100%</span>
                    </div>
                    <div style={s.ctrLbl}>CTR — Voice AI Agent</div>
                  </div>
                </div>
                <div>
                  <div style={s.progBar}>
                    <div style={{ ...s.progA, background: '#64748b' }}/>
                    <div style={{ ...s.progB, background: 'linear-gradient(90deg, #34d399, #10b981)' }}/>
                  </div>
                </div>
                <div style={{ ...s.ctrNote, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span>Voice AI Agent converts 2× better than human telecallers</span>
                </div>
              </div>

            </div>

            {/* Card 3 — APS AI Assistant Dedicated Page Launcher */}
            <div style={{ ...s.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
              <div>
                <div style={{ ...s.cardTop, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z"/>
                        <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ ...s.cardTitle, fontSize: '0.92rem' }}>APS AI Assistant</div>
                      <div style={{ fontSize: '0.66rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}/>
                        Online
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/ai')}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Open Page ↗
                  </button>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 0.8rem 0' }}>
                  Ask questions about pipeline stages, August revenue, team KPIs, or pending payment gates.
                </p>

                {/* Suggested Queries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '1rem' }}>
                  {[
                    { label: 'Show hot leads needing follow-up', q: 'Show me hot leads' },
                    { label: 'Leads awaiting 10% Tally advance', q: 'Which leads are awaiting payment?' },
                    { label: 'Complete lead pipeline distribution', q: 'Give me a pipeline breakdown' },
                    { label: 'Top performing employee ranking', q: 'Who is the top performing employee?' }
                  ].map((chip, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(`/ai?q=${encodeURIComponent(chip.q)}`)}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: '0.73rem',
                        color: '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f0fdf4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <span>{chip.label}</span>
                      <span style={{ color: '#2563eb', fontWeight: 800 }}>›</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Input & Launch Button */}
              <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = chatInput.trim();
                    navigate(q ? `/ai?q=${encodeURIComponent(q)}` : '/ai');
                  }}
                  style={{ display: 'flex', gap: 6, marginBottom: 8 }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type query to open in AI page…"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      outline: 'none',
                      background: '#fff',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Ask</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => navigate('/ai')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 10,
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span>Launch Full APS AI Workspace</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Two-Column: Activity + Alerts */}
          <div style={s.grid2}>
            {/* Recent Activity */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>Recent Activity Log</div>
                <div style={{...s.filterPill, fontSize:'0.7rem', cursor: 'pointer'}} onClick={() => navigate('/activity')}>View All →</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {activityLogs.slice(0, 5).map(act => {
                  const empName = act.employeeId === 'e1' ? 'Animesh' : act.employeeId === 'e2' ? 'Bhavya' : act.employeeId === 'e3' ? 'Aaditya' : 'System';
                  const empColor = empName === 'Animesh' ? '#3b82f6' : empName === 'Bhavya' ? '#a855f7' : empName === 'Aaditya' ? '#10b981' : '#f59e0b';
                  const empBg = empName === 'Animesh' ? '#eff6ff' : empName === 'Bhavya' ? '#f3e8ff' : empName === 'Aaditya' ? '#ecfdf5' : '#fffbeb';
                  return (
                    <div key={act.id} style={s.actRow}>
                      <div style={{ ...s.actIcon, backgroundColor: empBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={empColor} strokeWidth="2.2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{ ...s.actName, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{empName}</span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: empBg, color: empColor }}>
                            {empName === 'System' ? 'Automation' : 'Operator'}
                          </span>
                        </div>
                        <div style={s.actDesc}>{act.action}</div>
                      </div>
                      <div style={s.actTime}>{new Date(act.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                  );
                })}
                {activityLogs.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No recent activities.</div>
                )}
              </div>
            </div>

            {/* Alerts & Predictions */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>Alerts & Predictions</div>
                <div style={{...s.intBadge, color:'#a855f7',borderColor:'#a855f7',background:'#a855f715',fontSize:'0.7rem'}}>AI Powered</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {getDynamicAlerts().map(alert => {
                  const bg = alert.type === 'warning' ? '#fffbeb' : alert.type === 'success' ? '#ecfdf5' : '#eff6ff';
                  const borderClr = alert.type === 'warning' ? '#fde68a' : alert.type === 'success' ? '#a7f3d0' : '#bfdbfe';
                  const leftClr = alert.type === 'warning' ? '#f59e0b' : alert.type === 'success' ? '#10b981' : '#2563eb';
                  const titleClr = alert.type === 'warning' ? '#78350f' : alert.type === 'success' ? '#047857' : '#1e3a8a';
                  const msgClr = alert.type === 'warning' ? '#92400e' : alert.type === 'success' ? '#065f46' : '#1e40af';
                  const btnClr = alert.type === 'warning' ? '#d97706' : alert.type === 'success' ? '#059669' : '#2563eb';

                  return (
                    <div key={alert.id} style={{ ...s.alertCard, backgroundColor: bg, borderColor: borderClr, borderLeftColor: leftClr }}>
                      <div style={{ ...s.alertTitle, color: titleClr }}>{alert.title}</div>
                      <div style={{ ...s.alertMsg, color: msgClr }}>{alert.message}</div>
                      <button 
                        onClick={() => navigate(alert.route)} 
                        style={{ ...s.alertBtn, color: btnClr, fontWeight: 700 }}
                      >
                        {alert.action} →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─── PIPELINE VIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <CRMLeads />
      )}

      {/* ── Add Lead Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Add New Lead to System Pipeline</h3>
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

      {/* ── Filter Options Modal ───────────────────────────────────────── */}
      {filterModalOpen && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Analytics Filter Settings</h3>
              <button onClick={() => setFilterModalOpen(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={s.label}>Date Range Filter</label>
                <select style={s.modalInput} value={selDate} onChange={e => setSelDate(e.target.value)}>
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last Month">Last Month</option>
                  <option value="Year to Date">Year to Date</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Campaign Source</label>
                <select style={s.modalInput} value={selCampaign} onChange={e => setSelCampaign(e.target.value)}>
                  <option value="All Campaigns">All Campaigns</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Voice Telecaller">Voice Telecaller</option>
                  <option value="Direct Web">Direct Web</option>
                </select>
              </div>

              <div>
                <label style={s.label}>Geography / Region</label>
                <select style={s.modalInput} value={selGeo} onChange={e => setSelGeo(e.target.value)}>
                  <option value="Global">Global</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                </select>
              </div>
            </div>
            <div style={s.modalActions}>
              <button onClick={() => setFilterModalOpen(false)} style={s.cancelBtn}>Cancel</button>
              <button
                onClick={() => {
                  setActiveFilters([selDate, selCampaign, selGeo]);
                  setFilterModalOpen(false);
                }}
                style={s.submitBtn}
              >
                Apply Filters
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
  container: { padding:'2rem', fontFamily:'var(--font-body)', backgroundColor:'var(--bg-primary)', minHeight:'calc(100vh - 70px)', boxSizing:'border-box' },
  page: { display:'flex', flexDirection:'column', gap:'1.5rem' },

  // Hero
  heroCard: { backgroundColor:'#fff', borderRadius:24, padding:'1.75rem 2.25rem', border:'1px solid #e2e8f0', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center', minHeight:170, position:'relative', overflow:'hidden' },
  heroLeft: { flex:'1 1 55%', display:'flex', flexDirection:'column', justifyContent:'center', gap:'1rem', zIndex:2 },
  heroTitle: { fontSize:'2.2rem', fontWeight:800, fontFamily:'var(--font-heading)', letterSpacing:'-1px', color:'#08060d', margin:0 },
  heroStatsRow: { display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' },
  heroStatChip: { backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'8px 14px', display:'flex', flexDirection:'column', gap:2 },
  heroStatVal: { fontSize:'1.05rem', fontWeight:800, color:'#08060d' },
  heroStatLbl: { fontSize:'0.65rem', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' },
  heroSub: { fontSize:'0.95rem', lineHeight:1.6, color:'#64748b', maxWidth:500, margin:0 },
  heroTag: { display:'inline-flex', alignItems:'center', gap:6, backgroundColor:'#08060d', color:'#fff', padding:'6px 14px', borderRadius:20, width:'fit-content', fontSize:'0.8rem', fontWeight:700 },
  heroRight: { flex:'1 1 45%', display:'flex', justifyContent:'flex-end', alignItems:'center', position:'relative' },

  // Circles
  circleWrap: { position:'relative', width:300, height:220 },
  circleBig: { position:'absolute', width:190, height:190, borderRadius:'50%', background:'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(147,51,234,0.08) 100%)', boxShadow:'0 0 45px rgba(168,85,247,0.15)', top:5, right:15 },
  circleSmall: { position:'absolute', width:130, height:130, borderRadius:'50%', background:'linear-gradient(135deg, rgba(243,232,255,0.75) 0%, rgba(216,180,254,0.35) 100%)', border:'1px solid rgba(168,85,247,0.3)', top:55, right:115, boxShadow:'0 8px 24px rgba(168,85,247,0.12)', backdropFilter:'blur(4px)' },
  metricFloat: { position:'absolute' },
  mVal: { fontSize:'0.95rem', fontWeight:800, color:'#09090b' },
  mLbl: { fontSize:'0.65rem', color:'#71717a', fontWeight:600 },
  locCard: { position:'absolute', top:8, right:0, backgroundColor:'#fff', border:'1px solid #e4e4e7', borderRadius:14, padding:'0.8rem 1rem', width:140, boxShadow:'0 8px 20px rgba(0,0,0,0.04)' },
  locHead: { display:'flex', justifyContent:'space-between', fontSize:'0.72rem', fontWeight:700, color:'#09090b', marginBottom:6 },
  locRow: { display:'flex', alignItems:'center', fontSize:'0.68rem', fontWeight:600, marginBottom:4 },
  locDot: { width:6, height:6, borderRadius:'50%', marginRight:6 },
  locName: { color:'#71717a', flexGrow:1, textAlign:'left' },
  locPct: { color:'#09090b', fontWeight:700 },

  // Integration Bar
  intBar: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' },
  intCard: { backgroundColor:'#fff', borderRadius:16, padding:'1rem 1.25rem', border:'1px solid #e4e4e7', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.02)' },
  intLeft: { display:'flex', alignItems:'center', gap:'0.75rem' },
  intIcon: { fontSize:'1.4rem', width:38, height:38, borderRadius:10, backgroundColor:'#f4f4f5', display:'flex', alignItems:'center', justifyContent:'center' },
  intName: { fontWeight:800, fontSize:'0.9rem', color:'#09090b', fontFamily:'var(--font-heading)' },
  intRole: { fontSize:'0.7rem', color:'#71717a', fontWeight:500 },
  intBadge: { fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid' },

  // Overview Header
  secHead: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  secTitle: { fontSize:'2rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#09090b', margin:0 },
  filterRow: { display:'flex', gap:'0.5rem', alignItems:'center' },
  filterPill: { backgroundColor:'#fff', border:'1px solid #e4e4e7', padding:'5px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, color:'#09090b', display:'flex', alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.02)' },
  filterIcon: { width:32, height:32, borderRadius:'50%', backgroundColor:'#fff', border:'1px solid #e4e4e7', color:'#09090b', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },

  // Cards
  grid3: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem' },
  grid2: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'1.25rem' },
  card: { backgroundColor:'#fff', borderRadius:24, padding:'1.75rem', border:'1px solid #e4e4e7', boxShadow:'0 2px 4px rgba(0,0,0,0.02)', display:'flex', flexDirection:'column', gap:'1rem' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  cardTitle: { fontSize:'1rem', fontWeight:800, color:'#09090b', fontFamily:'var(--font-heading)', margin:0 },
  cardSub: { fontSize:'0.72rem', color:'#71717a', marginTop:2 },
  cardArrow: { color:'#09090b', fontWeight:800, fontSize:'1.1rem' },

  // Bar Chart
  barChart: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', height:200, paddingTop:'0.5rem' },
  barCol: { display:'flex', flexDirection:'column', alignItems:'center', flexGrow:1 },
  barVal: { fontSize:'0.75rem', fontWeight:800, color:'#09090b', marginBottom:6 },
  bar: { width:44, background:'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius:'8px 8px 0 0', position:'relative', overflow:'hidden', boxShadow:'0 4px 12px rgba(37,99,235,0.2)' },
  barSheen: { position:'absolute', inset:0, backgroundImage:'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize:'10px 10px' },
  barLbl: { fontSize:'0.72rem', color:'#52525b', fontWeight:700, marginTop:8, textAlign:'center' },

  // CTR
  ctrBody: { display:'flex', flexDirection:'column', justifyContent:'space-between', flex:1, paddingTop:'0.25rem' },
  aiPrompt: { fontSize:'0.78rem', fontWeight:600, color:'#52525b', backgroundColor:'#f4f4f5', padding:'6px 12px', borderRadius:20, width:'fit-content' },
  ctrRow: { display:'flex', justifyContent:'space-around', alignItems:'center', backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16, padding:'1rem 0.8rem' },
  ctrBig: { fontSize:'1.85rem', fontWeight:800, color:'#09090b', fontFamily:'var(--font-heading)' },
  ctrLbl: { fontSize:'0.68rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginTop:2 },
  ctrDivider: { width:1, height:42, backgroundColor:'#e2e8f0' },
  progBar: { display:'flex', height:20, borderRadius:10, overflow:'hidden', backgroundColor:'#f1f5f9', border:'1px solid #e2e8f0' },
  progA: { width:'40%', background:'linear-gradient(90deg, #3b82f6, #1d4ed8)' },
  progB: { width:'60%', background:'#dbeafe' },
  ctrNote: { fontSize:'0.75rem', color:'#1d4ed8', fontWeight:700, backgroundColor:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 },

  // Chatbot
  chatWrap: { display:'flex', flexDirection:'column', flex:1, minHeight:200 },
  chatArea: { flexGrow:1, maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'0.75rem' },
  bubble: { display:'flex', gap:'0.5rem', padding:'0.65rem 0.9rem', borderRadius:16, fontSize:'0.78rem', lineHeight:1.4, width:'fit-content', maxWidth:'90%' },
  bubbleAi: { backgroundColor:'#f4f4f5', color:'#09090b', alignSelf:'flex-start', borderTopLeftRadius:2 },
  bubbleUser: { backgroundColor:'#09090b', color:'#fff', alignSelf:'flex-end', borderTopRightRadius:2 },
  aiAvatar: { width:18, height:18, borderRadius:'50%', backgroundColor:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.08)', flexShrink:0, fontSize:10 },
  aiLabel: { fontSize:'0.6rem', fontWeight:700, color:'#71717a', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 },
  bubbleText: { fontWeight:600 },
  chatForm: { border:'1px solid #e4e4e7', borderRadius:14, padding:'0.4rem', backgroundColor:'#f4f4f5' },
  chatInput: { width:'100%', border:'none', backgroundColor:'transparent', outline:'none', padding:'4px 8px', fontSize:'0.78rem', fontFamily:'var(--font-body)', fontWeight:500, color:'#09090b' },
  chatFoot: { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.35rem', borderTop:'1px solid #e4e4e7', paddingTop:'0.3rem' },
  chatAttach: { border:'none', backgroundColor:'transparent', color:'#71717a', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' },
  chatCircle: { width:22, height:22, borderRadius:'50%', border:'none', backgroundColor:'transparent', cursor:'pointer', fontSize:'0.72rem' },
  chatSend: { width:22, height:22, borderRadius:'50%', border:'none', backgroundColor:'#09090b', color:'#fff', cursor:'pointer', fontSize:'0.72rem', display:'flex', alignItems:'center', justifyContent:'center' },

  // Activity
  actRow: { display:'flex', alignItems:'flex-start', gap:'0.75rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f4f4f5' },
  actIcon: { fontSize:'1.1rem', width:32, height:32, backgroundColor:'#f4f4f5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  actName: { fontSize:'0.8rem', fontWeight:700, color:'#09090b' },
  actDesc: { fontSize:'0.72rem', color:'#52525b', lineHeight:1.4 },
  actTime: { fontSize:'0.68rem', color:'#71717a', fontWeight:600, whiteSpace:'nowrap' },

  // Alerts
  alertCard: { padding:'0.9rem 1rem', borderRadius:12, backgroundColor:'#f8fafc', borderLeft:'3px solid #09090b', display:'flex', flexDirection:'column', gap:'0.25rem' },
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
  leadBudget: { fontSize:'0.75rem', fontWeight:700, color:'#09090b' },
  leadSource: { fontSize:'0.65rem', color:'#71717a', fontWeight:600 },
  empty: { fontSize:'0.72rem', color:'#71717a', textAlign:'center', padding:'1rem 0' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 500, padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e4e4e7' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#71717a' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.8rem', fontWeight: 700, color: '#3f3f46', display: 'block', marginBottom: '6px' },
  modalInput: { width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid #e4e4e7', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: '#09090b' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #e4e4e7', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#52525b' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 20, border: 'none', background: '#09090b', color: '#fff', cursor: 'pointer', fontWeight: 700 }
};
