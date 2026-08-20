import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const DEFAULT_MESSAGES = [
  {
    id: 'msg-001',
    leadId: 'LEAD-004',
    recipientName: 'Global Tech (Vikram Singhal)',
    phone: '+91 98112 33445',
    templateId: 'payment_reminder_advance_10pct',
    sequenceType: 'Payment Reminder (10% Advance)',
    product: 'Hydraulic Press 200T',
    advanceAmount: '₹4,200',
    status: 'Delivered',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    responseRate: 'Opened & Read'
  },
  {
    id: 'msg-002',
    leadId: 'LEAD-001',
    recipientName: 'Acme Machinery (Rajesh Kumar)',
    phone: '+91 98223 44556',
    templateId: 'order_booking_confirmation',
    sequenceType: 'Booking & Dispatch Confirmation',
    product: 'CNC Milling Center 5-Axis',
    advanceAmount: '₹25,000',
    status: 'Read',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    responseRate: 'Acknowledged'
  },
  {
    id: 'msg-003',
    leadId: 'LEAD-003',
    recipientName: 'Tata Motors Vendor (Sunil Patil)',
    phone: '+91 99334 55667',
    templateId: 'factory_production_release',
    sequenceType: 'Factory Dispatch & Milestone Sync',
    product: 'VMC Machining Center',
    advanceAmount: '₹18,500',
    status: 'Delivered',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    responseRate: 'Scheduled'
  },
  {
    id: 'msg-004',
    leadId: 'LEAD-008',
    recipientName: 'Reliance Automation (Deepak Verma)',
    phone: '+91 98445 66778',
    templateId: 'lead_qualification_outreach',
    sequenceType: 'Lead Follow-up & Inquiry Verification',
    product: 'Laser Sheet Cutting Machine',
    advanceAmount: '₹12,000',
    status: 'Sent',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    responseRate: 'In Progress'
  }
];

const DEFAULT_SEQUENCES = [
  {
    id: 'seq-01',
    name: '10% Advance Deposit Payment Sequence',
    triggerStage: 'Confirmed Lead',
    delay: '24 Hours after Confirmation',
    status: 'Active',
    successRate: '92%',
    activeLeadsCount: 4,
    description: 'Sends Meta-approved WhatsApp payment reminder with instant UPI/Bank links.'
  },
  {
    id: 'seq-02',
    name: 'Order Confirmation & Dual Sign-off Sequence',
    triggerStage: 'Booked Deal',
    delay: 'Instant on Dual Approval',
    status: 'Active',
    successRate: '98%',
    activeLeadsCount: 6,
    description: 'Dispatches signed booking confirmation & technical specification PDF.'
  },
  {
    id: 'seq-03',
    name: 'Factory Production Release & Milestone Updates',
    triggerStage: 'Paid / Advance Verified',
    delay: '4 Hours after Tally Reconciliation',
    status: 'Active',
    successRate: '100%',
    activeLeadsCount: 3,
    description: 'Notifies factory floor & sends live tracking batch number to client.'
  }
];

const DEFAULT_TEMPLATES = [
  {
    id: 'payment_reminder_advance_10pct',
    name: 'Payment Reminder (10% Advance)',
    category: 'UTILITY',
    language: 'en_IN',
    status: 'APPROVED',
    bodyPreview: 'Dear {{1}}, your order for {{2}} has been confirmed. Please deposit 10% advance ({{3}}) to release factory production.',
    lastUsed: '1 hour ago'
  },
  {
    id: 'order_booking_confirmation',
    name: 'Order Booking Confirmation',
    category: 'TRANSACTIONAL',
    language: 'en_IN',
    status: 'APPROVED',
    bodyPreview: 'Hello {{1}}, your booking for {{2}} is confirmed. Approved by Admin & Sales Lead. View specifications here.',
    lastUsed: '4 hours ago'
  },
  {
    id: 'factory_production_release',
    name: 'Factory Production Release',
    category: 'TRANSACTIONAL',
    language: 'en_IN',
    status: 'APPROVED',
    bodyPreview: 'Greetings {{1}}, 10% advance received! Machine {{2}} has entered active manufacturing queue at APS Plant.',
    lastUsed: '12 hours ago'
  }
];

const DEFAULT_ANALYTICS = {
  totalSent: 342,
  deliveryRate: '99.4%',
  readRate: '94.8%',
  advanceRecoveryRate: '88.5%',
  totalRevenueRecovered: '₹4,85,000'
};

export default function WhatsAppAutomation() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [sequences, setSequences] = useState(DEFAULT_SEQUENCES);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'sequences' | 'templates' | 'broadcast'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Live 2-Way Chat Simulator State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'chat-1',
      sender: 'business',
      senderName: 'APS Enterprise Verified',
      header: 'APS Enterprise — Order Advance Notice',
      text: 'Hello John Doe, your booking for CNC Machine v2 (Total ₹42,000) is approved! To release your machine order to the manufacturing queue, please confirm the 10% advance payment of ₹1,500. Click the payment link below or reply to this message.',
      buttons: ['Verify & Pay Advance', 'Speak to Account Manager'],
      time: '11:51 AM',
      status: 'read'
    },
    {
      id: 'chat-2',
      sender: 'customer',
      senderName: 'John Doe (Customer)',
      text: 'Hello APS Team, I have initiated the 10% advance (₹1,500) via HDFC UPI Ref #UPI-982143. Kindly verify.',
      time: '11:53 AM'
    },
    {
      id: 'chat-3',
      sender: 'business',
      senderName: 'APS Enterprise Verified',
      text: 'Payment received & verified via Tally ERP Sync! Production Job Card #MFG-8821 generated for CNC Machine v2. Estimated dispatch: 4 business days.',
      time: '11:54 AM',
      status: 'read'
    }
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatSenderRole, setChatSenderRole] = useState('customer'); // 'customer' | 'business'

  // Manual Trigger & Broadcast Form State
  const [broadcastData, setBroadcastData] = useState({
    leadId: '',
    phone: '',
    recipientName: '',
    templateId: 'payment_reminder_advance_10pct',
    product: '',
    amount: '',
    customNote: ''
  });
  const [sending, setSending] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [msgRes, seqRes, tplRes, anaRes, leadRes] = await Promise.all([
        fetch(`${API}/whatsapp/messages`).catch(() => null),
        fetch(`${API}/whatsapp/sequences`).catch(() => null),
        fetch(`${API}/whatsapp/templates`).catch(() => null),
        fetch(`${API}/whatsapp/analytics`).catch(() => null),
        fetch(`${API}/leads`).catch(() => null)
      ]);

      if (msgRes && msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData.messages?.length > 0) setMessages(msgData.messages);
      }
      if (seqRes && seqRes.ok) {
        const seqData = await seqRes.json();
        if (seqData.sequences?.length > 0) setSequences(seqData.sequences);
      }
      if (tplRes && tplRes.ok) {
        const tplData = await tplRes.json();
        if (tplData.templates?.length > 0) setTemplates(tplData.templates);
      }
      if (anaRes && anaRes.ok) {
        const anaData = await anaRes.json();
        if (anaData.analytics) setAnalytics(anaData.analytics);
      }
      if (leadRes && leadRes.ok) {
        const leadData = await leadRes.json();
        if (leadData.leads?.length > 0) {
          setLeads(leadData.leads);
          if (!broadcastData.leadId) {
            const firstLead = leadData.leads[0];
            setBroadcastData(prev => ({
              ...prev,
              leadId: firstLead.id,
              recipientName: firstLead.name,
              phone: firstLead.phone || '+91 99887 76655',
              product: firstLead.interest || 'CNC Machinery Unit',
              amount: (parseFloat(firstLead.budget || 20000) * 0.1).toLocaleString('en-IN')
            }));
          }
        }
      }
    } catch (err) {
      console.error('Error loading WhatsApp automation data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeadSelectChange = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const advance = (parseFloat(lead.budget || 20000) * 0.1).toLocaleString('en-IN');
    setBroadcastData(prev => ({
      ...prev,
      leadId: lead.id,
      recipientName: lead.name,
      phone: lead.phone || '+91 99887 76655',
      product: lead.interest || 'Machinery Unit',
      amount: advance
    }));
  };

  const handleToggleSequence = async (seqId) => {
    try {
      const res = await fetch(`${API}/whatsapp/sequences/${seqId}/toggle`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Sequence "${data.sequence.name}" is now ${data.sequence.status}!`);
        setSequences(prev => prev.map(s => s.id === seqId ? data.sequence : s));
      }
    } catch (err) {
      console.error('Failed to toggle sequence:', err);
    }
  };

  const handleSendReminder = async (leadId, leadName) => {
    try {
      const res = await fetch(`${API}/whatsapp/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Payment reminder sequence dispatched to ${leadName}!`);
        loadData();
      }
    } catch (err) {
      console.error('Failed to trigger reminder:', err);
    }
  };

  // Selected template object for live preview
  const activeTemplateObj = useMemo(() => {
    return templates.find(t => t.id === broadcastData.templateId) || templates[0];
  }, [templates, broadcastData.templateId]);

  const handleSendCustomBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);

    const dynamicText = activeTemplateObj?.bodyText
      ?.replace('{{1}}', broadcastData.recipientName || 'John Doe')
      ?.replace('{{2}}', broadcastData.product || 'CNC Machine v2')
      ?.replace('{{3}}', '₹42,000')
      ?.replace('{{4}}', `₹${broadcastData.amount || '4,200'}`)
      ?.replace('{{5}}', '2 business days') || `Dear ${broadcastData.recipientName}, your notification for ${broadcastData.product} has been delivered.`;

    const newChatMsg = {
      id: `chat-${Date.now()}`,
      sender: 'business',
      senderName: 'APS Enterprise Verified',
      header: activeTemplateObj?.header || 'APS Enterprise — Notification',
      text: dynamicText,
      buttons: activeTemplateObj?.buttons || ['Verify & Pay Advance', 'Speak to Account Manager'],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setChatMessages(prev => [...prev, newChatMsg]);

    try {
      const res = await fetch(`${API}/whatsapp/send-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`WhatsApp message delivered to ${broadcastData.recipientName} (${broadcastData.phone})!`);
        loadData();
      }
    } catch (err) {
      console.error('Error sending WhatsApp broadcast:', err);
      showToast(`Message added to live chat simulator!`);
    } finally {
      setSending(false);
    }
  };

  // Send interactive 2-way message from chat input
  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim()) return;

    const newMsg = {
      id: `chat-${Date.now()}`,
      sender: chatSenderRole,
      senderName: chatSenderRole === 'business' ? 'APS Enterprise Verified' : `${broadcastData.recipientName || 'John Doe'} (Customer)`,
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInputText('');
    showToast(`New ${chatSenderRole === 'business' ? 'Sender (APS Enterprise)' : 'Receiver (Customer)'} message added!`);
  };

  // Quick reply simulator helper
  const handleSimulateQuickReply = (quickText) => {
    const newMsg = {
      id: `chat-${Date.now()}`,
      sender: 'customer',
      senderName: `${broadcastData.recipientName || 'John Doe'} (Customer)`,
      text: quickText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    showToast(`Simulated customer response received!`);
  };

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const matchesSearch = (m.leadName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.sequenceType || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'ALL') return matchesSearch;
      return matchesSearch && m.status.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [messages, searchQuery, statusFilter]);


  if (loading) {
    return (
      <div style={s.centerContainer}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Initializing WhatsApp Automation Engine & WABA Bridge…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={s.toast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>WhatsApp AI Automation & Lifecycle Messaging</h1>
        </div>
        <div style={s.headerActions}>
          <button onClick={() => setActiveTab('broadcast')} style={s.newMsgBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Send Notification
          </button>
        </div>
      </div>

      {/* Top Overview Metric KPI Cards */}
      {analytics && (
        <div style={s.kpiGrid}>
          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Total Messages Dispatched</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.totalMessagesSent?.toLocaleString('en-IN')}</span>
              <span style={s.kpiTrendBadge}>+14.2% wk</span>
            </div>
            <div style={s.kpiSub}>Automated event triggers across lead state changes</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Handset Delivery Rate</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.deliveryRate}</span>
              <span style={s.kpiSubTag}>Verified WABA</span>
            </div>
            <div style={s.kpiSub}>{analytics.deliveredCount?.toLocaleString('en-IN')} delivered to WhatsApp clients</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Message Read & Open Rate</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.readRate}</span>
              <span style={{ ...s.kpiTrendBadge, background: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7' }}>92.4% Avg</span>
            </div>
            <div style={s.kpiSub}>Read receipts verified via Meta webhook callbacks</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Active Lifecycle Sequences</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.activeSequencesCount} / {analytics.totalSequencesCount} Active</span>
              <span style={s.kpiSubTag}>Automated</span>
            </div>
            <div style={s.kpiSub}>10% advance reminders, order confirmation & dispatch</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={s.tabsContainer}>
        <div style={s.tabsLeft}>
          {[
            { key: 'messages', label: ` Dispatched Message Stream (${messages.length})` },
            { key: 'sequences', label: ` Automation Sequences (${sequences.length})` },
            { key: 'templates', label: ` Meta Approved Templates (${templates.length})` },
            { key: 'broadcast', label: ` Manual Trigger & Simulator` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? s.tabActive : s.tabInactive}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'messages' && (
          <div style={s.filtersRight}>
            <input
              type="text"
              placeholder="Search lead or phone…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={s.selectFilter}
            >
              <option value="ALL">All Delivery States</option>
              <option value="Delivered">Delivered</option>
              <option value="Read">Read</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        )}
      </div>

      {/* ── TAB 1: DISPATCHED MESSAGE STREAM ── */}
      {activeTab === 'messages' && (
        <div style={s.messagesCard}>
          <div style={s.sectionHeader}>
            <div>
              <h3 style={s.sectionTitle}>Live WhatsApp Audit & Dispatch Log</h3>
              <p style={s.sectionSub}>Automated notifications dispatched by WhatsApp Automation based on pipeline state machine events</p>
            </div>

          </div>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Message ID</th>
                <th style={s.th}>Recipient & Phone</th>
                <th style={s.th}>Sequence Type</th>
                <th style={s.th}>Product / Machinery</th>
                <th style={s.th}>10% Advance Amount</th>
                <th style={s.th}>Delivery Status</th>
                <th style={s.th}>Timestamp</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => {
                const isRead = msg.status === 'Read';
                const isDelivered = msg.status === 'Delivered';
                const messageKey = msg.id || msg.messageId || `msg-${idx}`;
                return (
                  <tr key={messageKey} style={s.trHover}>
                    <td style={{ ...s.td, fontWeight: 700, color: '#64748b' }}>{msg.messageId || msg.id || `MSG-00${idx + 1}`}</td>
                    <td style={s.td}>
                      <div style={s.recipientName}>{msg.leadName || msg.recipientName}</div>
                      <div style={s.recipientPhone}>{msg.phone} {msg.leadId ? `• ${msg.leadId}` : ''}</div>
                    </td>

                    <td style={s.td}>
                      <span
                        style={{
                          ...s.badge,
                          backgroundColor: msg.sequenceType === 'PAYMENT_REMINDER' ? 'rgba(245,158,11,0.12)' :
                            msg.sequenceType === 'ORDER_CONFIRMATION' ? 'rgba(16,185,129,0.12)' :
                              msg.sequenceType === 'PRODUCTION_UPDATE' ? 'rgba(6,182,212,0.12)' :
                                'rgba(99,102,241,0.12)',
                          color: msg.sequenceType === 'PAYMENT_REMINDER' ? '#d97706' :
                            msg.sequenceType === 'ORDER_CONFIRMATION' ? '#059669' :
                              msg.sequenceType === 'PRODUCTION_UPDATE' ? '#0891b2' :
                                '#4f46e5'
                        }}
                      >
                        {msg.sequenceType}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.prodName}>{msg.product || 'Machinery'}</div>
                      <div style={s.prodSub}>Total: ₹{msg.totalBudget || '—'}</div>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#09090b' }}>
                      {msg.advanceAmount ? `₹${msg.advanceAmount}` : '—'}
                    </td>
                    <td style={s.td}>
                      <div style={s.statusCell}>
                        <span
                          style={{
                            ...s.deliveryIndicator,
                            backgroundColor: isRead ? '#3b82f6' : isDelivered ? '#10b981' : '#f59e0b'
                          }}
                        />
                        <span style={{ fontWeight: 600, color: isRead ? '#2563eb' : isDelivered ? '#059669' : '#d97706' }}>
                          {isRead ? '✓✓ Read' : isDelivered ? '✓✓ Delivered' : '✓ Sent'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.72rem', color: '#94a3b8' }}>
                      {new Date(msg.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={s.td}>
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        style={s.viewBubbleBtn}
                      >
                        View Chat Bubble
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 2: AUTOMATION SEQUENCES ── */}
      {activeTab === 'sequences' && (
        <div style={s.sequencesGrid}>
          {sequences.map((seq, idx) => {
            const isActive = seq.status === 'Active';
            return (
              <div key={seq.id} style={{ ...s.seqCard, borderTop: isActive ? '3px solid #25D366' : '3px solid #cbd5e1' }}>
                <div style={s.seqHeader}>
                  <div>
                    <span style={s.seqId}>{seq.id}</span>
                    <h4 style={s.seqName}>{seq.name}</h4>
                  </div>
                  <button
                    onClick={() => handleToggleSequence(seq.id)}
                    style={{
                      ...s.toggleBtn,
                      backgroundColor: isActive ? 'rgba(37,211,102,0.15)' : 'rgba(100,116,139,0.15)',
                      color: isActive ? '#059669' : '#64748b'
                    }}
                  >
                    {isActive ? '● Active Running' : '○ Paused'}
                  </button>
                </div>

                <p style={s.seqDesc}>{seq.description}</p>

                <div style={s.seqDetailsBox}>
                  <div style={s.seqDetailRow}>
                    <span style={s.seqDetailLbl}>Trigger Stage:</span>
                    <span style={s.seqDetailVal}>
                      <span style={{ ...s.badge, background: '#f1f5f9', color: '#08060d' }}>
                        {seq.triggerStage}
                      </span>
                    </span>
                  </div>
                  <div style={s.seqDetailRow}>
                    <span style={s.seqDetailLbl}>Delay Schedule:</span>
                    <span style={s.seqDetailVal}>
                      {seq.delayHours === 0 ? 'Instantaneous (0h)' : `After ${seq.delayHours} Hours dwell`}
                    </span>
                  </div>
                  <div style={s.seqDetailRow}>
                    <span style={s.seqDetailLbl}>Template Key:</span>
                    <span style={s.seqDetailCode}>{seq.templateId}</span>
                  </div>
                </div>

                {/* Performance Stats */}
                <div style={s.seqStatsRow}>
                  <div style={s.seqStat}>
                    <div style={s.seqStatVal}>{seq.sentCount}</div>
                    <div style={s.seqStatLbl}>Dispatched</div>
                  </div>
                  <div style={s.seqStat}>
                    <div style={{ ...s.seqStatVal, color: '#25D366' }}>{seq.readRate}</div>
                    <div style={s.seqStatLbl}>Read Rate</div>
                  </div>
                  <div style={s.seqStat}>
                    <div style={{ ...s.seqStatVal, color: '#09090b' }}>{seq.conversionRate}</div>
                    <div style={s.seqStatLbl}>Gate Pass Rate</div>
                  </div>
                </div>

                <div style={s.seqFooter}>
                  <button
                    onClick={() => {
                      setBroadcastData(prev => ({ ...prev, templateId: seq.templateId }));
                      setActiveTab('broadcast');
                    }}
                    style={s.testSeqBtn}
                  >
                    Test Sequence on Sample Lead →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 3: APPROVED TEMPLATES ── */}
      {activeTab === 'templates' && (
        <div style={s.templatesGrid}>
          {templates.map(tpl => (
            <div key={tpl.id} style={s.templateCard}>
              <div style={s.templateHeader}>
                <div>
                  <div style={s.tplCategoryTag}>{tpl.category} • {tpl.language}</div>
                  <h4 style={s.tplName}>{tpl.name}</h4>
                  <div style={s.tplId}>{tpl.id}</div>
                </div>
                <span style={s.approvedBadge}>✓ Meta Approved</span>
              </div>

              {/* WhatsApp Mock Chat Bubble */}
              <div style={s.waBubbleWrapper}>
                <div style={s.waBubble}>
                  <div style={s.waHeader}>{tpl.header}</div>
                  <div style={s.waBody}>{tpl.bodyText}</div>
                  <div style={s.waTimeRow}>
                    <span>10:45 AM</span>
                    <span style={{ color: '#53bdeb' }}>✓✓</span>
                  </div>
                </div>

                {/* WhatsApp Quick Reply Buttons */}
                {tpl.buttons?.length > 0 && (
                  <div style={s.waButtonsWrap}>
                    {tpl.buttons.map((btnText, i) => (
                      <div key={i} style={s.waBtnChip}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span>{btnText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={s.tplFooter}>
                <span style={s.tplTriggerInfo}>{tpl.delayDescription}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 4: MANUAL TRIGGER & BROADCAST SIMULATOR ── */}
      {activeTab === 'broadcast' && (
        <div style={s.broadcastContainer}>
          <div style={s.broadcastFormCard}>
            <h3 style={s.sectionTitle}>Manual WhatsApp Dispatch & Live Sandbox</h3>
            <p style={s.sectionSub}>Select a lead from the CRM database or enter custom parameters to fire live WhatsApp notifications</p>

            <form onSubmit={handleSendCustomBroadcast} style={s.form}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Select Lead Record (CRM Database)</label>

                <select
                  value={broadcastData.leadId}
                  onChange={e => handleLeadSelectChange(e.target.value)}
                  style={s.formSelect}
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.name} ({l.interest}) • Stage: {l.stage}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Recipient Contact Number</label>
                  <input
                    type="text"
                    required
                    value={broadcastData.phone}
                    onChange={e => setBroadcastData({ ...broadcastData, phone: e.target.value })}
                    style={s.formInput}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Customer / Company Name</label>
                  <input
                    type="text"
                    required
                    value={broadcastData.recipientName}
                    onChange={e => setBroadcastData({ ...broadcastData, recipientName: e.target.value })}
                    style={s.formInput}
                  />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Select WhatsApp HSM Template</label>
                <select
                  value={broadcastData.templateId}
                  onChange={e => setBroadcastData({ ...broadcastData, templateId: e.target.value })}
                  style={s.formSelect}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Product / Machine Model</label>
                  <input
                    type="text"
                    value={broadcastData.product}
                    onChange={e => setBroadcastData({ ...broadcastData, product: e.target.value })}
                    style={s.formInput}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>10% Advance Amount (₹)</label>
                  <input
                    type="text"
                    value={broadcastData.amount}
                    onChange={e => setBroadcastData({ ...broadcastData, amount: e.target.value })}
                    style={s.formInput}
                  />
                </div>
              </div>

              <button type="submit" disabled={sending} style={s.sendSubmitBtn}>
                {sending ? 'Delivering via Meta WABA Cloud…' : 'Send WhatsApp Notification Now'}
              </button>
            </form>
          </div>

          {/* Live 2-Way WhatsApp Chat Simulator Panel */}
          <div style={s.chatSimContainer}>
            {/* WhatsApp Header */}
            <div style={s.chatSimHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={s.waHeaderAvatar}>
                  <span>APS</span>
                  <span style={s.waOnlineDot} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={s.waHeaderName}>APS Enterprise Verified</span>
                    {/* Meta Verified Green Checkmark */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div style={s.waHeaderStatus}>Official Business Account • Online</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#a1a1aa' }}>
                {/* Phone Call Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {/* Video Call Icon */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer' }}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                {/* More Dots Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ cursor: 'pointer' }}><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </div>
            </div>

            {/* WhatsApp Chat Body Stream */}
            <div style={s.chatSimBody}>
              {/* Date & Encryption Pills */}
              <div style={{ textAlign: 'center', margin: '2px 0 8px 0' }}>
                <span style={s.chatDatePill}>TODAY</span>
              </div>
              <div style={s.chatEncryptNotice}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read them.</span>
              </div>

              {/* Messages Thread (Sender & Receiver 2-Way) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {chatMessages.map(msg => {
                  const isBusiness = msg.sender === 'business';
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isBusiness ? 'flex-end' : 'flex-start' }}>
                      <div style={isBusiness ? s.waOutgoingBubble : s.waIncomingBubble}>
                        {/* Sender Tag */}
                        <div style={isBusiness ? s.waSenderTagBiz : s.waSenderTagCust}>
                          {msg.senderName}
                        </div>

                        {/* Header if template */}
                        {msg.header && (
                          <div style={s.waMsgHeaderTitle}>{msg.header}</div>
                        )}

                        {/* Message Content */}
                        <div style={s.waMsgText}>{msg.text}</div>

                        {/* Action Buttons if template */}
                        {msg.buttons?.length > 0 && (
                          <div style={s.waMsgButtonsCol}>
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => {
                                  if (btn.includes('Pay') || btn.includes('Advance')) {
                                    handleSimulateQuickReply(`I clicked "${btn}" and transferred 10% advance (₹${broadcastData.amount || '4,200'}) via UPI. Please confirm.`);
                                  } else {
                                    handleSimulateQuickReply(`I clicked "${btn}". Please connect me with our dedicated account manager.`);
                                  }
                                }}
                                style={s.waMsgInteractiveBtn}
                              >
                                <span>{btn}</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timestamp and Read Status */}
                        <div style={s.waMsgFooterTime}>
                          <span>{msg.time}</span>
                          {isBusiness && (
                            <span style={{ color: '#53bdeb', fontWeight: 800, fontSize: '0.68rem' }}>✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Simulate Customer Reply Pills */}
            <div style={s.quickSimSection}>
              <span style={s.quickSimLabel}>Quick Customer Responses:</span>
              <div style={s.quickSimPillsWrap}>
                <button
                  type="button"
                  onClick={() => handleSimulateQuickReply(`Payment of 10% advance (₹${broadcastData.amount || '4,200'}) completed via UPI. Reference #UPI-994821.`)}
                  style={s.quickSimBtn}
                >
                  ✓ "Payment Done via UPI"
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateQuickReply(`Please share the technical layout drawing and warranty terms for ${broadcastData.product || 'machine'}.`)}
                  style={s.quickSimBtn}
                >
                  📄 "Request Warranty PDF"
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateQuickReply(`Can we schedule delivery and site installation for next week?`)}
                  style={s.quickSimBtn}
                >
                  🚚 "Delivery Schedule Query"
                </button>
              </div>
            </div>

            {/* Live 2-Way Chat Input Box */}
            <form onSubmit={handleSendChatMessage} style={s.chatInputForm}>
              {/* Role Toggle Button */}
              <button
                type="button"
                onClick={() => setChatSenderRole(chatSenderRole === 'customer' ? 'business' : 'customer')}
                style={{
                  ...s.roleSwitchBtn,
                  backgroundColor: chatSenderRole === 'customer' ? '#ffffff' : '#dcfce7',
                  color: chatSenderRole === 'customer' ? '#09090b' : '#15803d',
                  borderColor: chatSenderRole === 'customer' ? '#e4e4e7' : '#86efac'
                }}
                title="Click to switch sender role"
              >
                {chatSenderRole === 'customer' ? '👤 Customer' : '🏢 APS Admin'}
              </button>

              <input
                type="text"
                placeholder={chatSenderRole === 'customer' ? `Type message as ${broadcastData.recipientName || 'Customer'}…` : 'Type reply as APS Enterprise…'}
                value={chatInputText}
                onChange={e => setChatInputText(e.target.value)}
                style={s.chatInputField}
              />

              <button
                type="submit"
                style={s.chatSendBtn}
                title="Send message in live chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>

            <div style={s.previewFooter}>
              <span style={s.lockIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span> End-to-end encrypted via Meta Business Cloud API
            </div>
          </div>
        </div>
      )}


      {/* ── MODAL: VIEW CHAT BUBBLE DETAILS ── */}
      {selectedMessage && (
        <div style={s.modalOverlay} onClick={() => setSelectedMessage(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>WhatsApp Message Payload ({selectedMessage.messageId})</h3>
                <div style={s.modalSub}>Dispatched to {selectedMessage.leadName} ({selectedMessage.phone})</div>
              </div>
              <button onClick={() => setSelectedMessage(null)} style={s.closeModalBtn}>✕</button>
            </div>

            <div style={s.waPreviewModal}>
              <div style={s.waBubbleModal}>
                <div style={s.waBodyModal}>{selectedMessage.preview}</div>
                <div style={s.waTimeRow}>
                  <span>{new Date(selectedMessage.sentAt).toLocaleTimeString()}</span>
                  <span style={{ color: '#53bdeb' }}>✓✓</span>
                </div>
              </div>
            </div>

            <div style={s.modalMetaBox}>
              <div style={s.metaRow}>
                <span style={s.metaLbl}>Delivery State:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedMessage.lastEvent || 'Delivered'}</span>
              </div>
              <div style={s.metaRow}>
                <span style={s.metaLbl}>Sequence Module:</span>
                <span>{selectedMessage.sequenceType}</span>
              </div>
              <div style={s.metaRow}>
                <span style={s.metaLbl}>Template ID:</span>
                <span style={s.seqDetailCode}>{selectedMessage.template}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: '2rem 2.5rem',
    fontFamily: 'var(--font-body)',
    maxWidth: 1440,
    margin: '0 auto'
  },
  centerContainer: {
    padding: '6rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  spinner: {
    width: 38,
    height: 38,
    border: '3px solid #e2e8f0',
    borderTopColor: '#25D366',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: 600
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    backgroundColor: '#08060d',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    zIndex: 1000,
    fontSize: '0.85rem',
    fontWeight: 600
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.75rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  badgeModule: {
    display: 'inline-block',
    padding: '3px 9px',
    backgroundColor: 'rgba(37,211,102,0.1)',
    color: '#16a34a',
    borderRadius: 6,
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
    marginBottom: '0.4rem'
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 800,
    fontFamily: 'var(--font-heading)',
    color: '#08060d',
    letterSpacing: '-0.5px',
    margin: 0
  },
  subtitle: {
    fontSize: '0.82rem',
    color: '#64748b',
    marginTop: 4,
    maxWidth: 700
  },
  headerActions: {
    display: 'flex',
    gap: '0.85rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  wabaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  wabaDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#25D366'
  },
  wabaText: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#0f172a'
  },
  newMsgBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem'
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '1.35rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem'
  },
  kpiValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.6rem',
    marginBottom: '0.35rem'
  },
  kpiMainValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    letterSpacing: '-0.5px'
  },
  kpiTrendBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    color: '#09090b'
  },
  kpiSubTag: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#71717a'
  },
  kpiSub: {
    fontSize: '0.7rem',
    color: '#71717a'
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e4e4e7',
    marginBottom: '1.75rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  tabsLeft: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  tabActive: {
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#09090b',
    borderBottom: '2.5px solid #09090b',
    cursor: 'pointer'
  },
  tabInactive: {
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#71717a',
    borderBottom: '2.5px solid transparent',
    cursor: 'pointer'
  },
  filtersRight: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center'
  },
  searchInput: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid #e4e4e7',
    fontSize: '0.78rem',
    width: 200,
    outline: 'none',
    backgroundColor: '#fff',
    color: '#09090b'
  },
  selectFilter: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #e4e4e7',
    fontSize: '0.78rem',
    backgroundColor: '#fff',
    color: '#09090b',
    outline: 'none',
    cursor: 'pointer'
  },
  messagesCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem'
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    fontFamily: 'var(--font-heading)',
    color: '#09090b',
    margin: 0
  },
  sectionSub: {
    fontSize: '0.76rem',
    color: '#71717a',
    marginTop: 3
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem'
  },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    borderBottom: '1px solid #e4e4e7',
    color: '#71717a',
    fontWeight: 700,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #f4f4f5',
    color: '#09090b'
  },
  trHover: {
    transition: 'background 0.15s'
  },
  recipientName: {
    fontWeight: 800,
    fontSize: '0.84rem',
    color: '#09090b'
  },
  recipientPhone: {
    fontSize: '0.68rem',
    color: '#71717a',
    marginTop: 2
  },
  prodName: {
    fontWeight: 600,
    fontSize: '0.8rem',
    color: '#09090b'
  },
  prodSub: {
    fontSize: '0.68rem',
    color: '#71717a'
  },
  badge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    display: 'inline-block'
  },
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  deliveryIndicator: {
    width: 7,
    height: 7,
    borderRadius: '50%'
  },
  viewBubbleBtn: {
    padding: '5px 10px',
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  sequencesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1.5rem'
  },
  seqCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '1.5rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column'
  },
  seqHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem'
  },
  seqId: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: '#71717a'
  },
  seqName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#09090b',
    margin: '2px 0 0 0'
  },
  toggleBtn: {
    padding: '4px 10px',
    borderRadius: 12,
    border: 'none',
    fontSize: '0.7rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  seqDesc: {
    fontSize: '0.76rem',
    color: '#52525b',
    lineHeight: 1.4,
    marginBottom: '1rem'
  },
  seqDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
    border: '1px solid #e4e4e7'
  },
  seqDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem'
  },
  seqDetailLbl: {
    color: '#71717a',
    fontWeight: 600
  },
  seqDetailVal: {
    color: '#09090b',
    fontWeight: 700
  },
  seqDetailCode: {
    fontFamily: 'monospace',
    color: '#09090b',
    fontWeight: 700,
    fontSize: '0.68rem'
  },
  seqStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    textAlign: 'center',
    marginBottom: '1.25rem'
  },
  seqStat: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: '0.5rem',
    border: '1px solid #e2e8f0'
  },
  seqStatVal: {
    fontSize: '0.95rem',
    fontWeight: 800
  },
  seqStatLbl: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    marginTop: 2
  },
  seqFooter: {
    marginTop: 'auto'
  },
  testSeqBtn: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: '#ffffff',
    color: '#09090b',
    border: '1px solid #e4e4e7',
    borderRadius: 8,
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem'
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.5rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column'
  },
  templateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  tplCategoryTag: {
    fontSize: '0.62rem',
    fontWeight: 700,
    color: '#71717a',
    textTransform: 'uppercase'
  },
  tplName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#09090b',
    margin: '2px 0 0 0'
  },
  tplId: {
    fontSize: '0.66rem',
    color: '#71717a',
    fontFamily: 'monospace'
  },
  approvedBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    borderRadius: 12
  },
  waBubbleWrapper: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '1rem',
    flex: 1
  },
  waBubble: {
    backgroundColor: '#fff',
    borderRadius: '8px 8px 8px 0',
    padding: '0.75rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    maxWidth: '92%',
    border: '1px solid #e4e4e7'
  },
  waHeader: {
    fontWeight: 800,
    fontSize: '0.78rem',
    color: '#09090b',
    marginBottom: 4
  },
  waBody: {
    fontSize: '0.74rem',
    color: '#52525b',
    lineHeight: 1.45
  },
  waTimeRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.6rem',
    color: '#71717a',
    marginTop: 4
  },
  waButtonsWrap: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  waBtnChip: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: '0.72rem',
    color: '#09090b',
    fontWeight: 700,
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e4e4e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  tplFooter: {
    borderTop: '1px solid #f4f4f5',
    paddingTop: '0.75rem'
  },
  tplTriggerInfo: {
    fontSize: '0.7rem',
    color: '#71717a',
    fontWeight: 600
  },
  broadcastContainer: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
    alignItems: 'start'
  },
  broadcastFormCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '2rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  chatSimContainer: {
    backgroundColor: '#09090b',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
    border: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column'
  },
  chatSimHeader: {
    backgroundColor: '#18181b',
    padding: '0.85rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #27272a'
  },
  waHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#27272a',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  waOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: '#25D366',
    borderRadius: '50%',
    border: '2px solid #18181b'
  },
  waHeaderName: {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.88rem'
  },
  waHeaderStatus: {
    color: '#a1a1aa',
    fontSize: '0.66rem'
  },
  chatSimBody: {
    backgroundColor: '#efeae2',
    padding: '1.25rem 1rem',
    minHeight: 340,
    maxHeight: 440,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
    backgroundSize: '16px 16px'
  },
  chatDatePill: {
    backgroundColor: '#ffffff',
    color: '#54656f',
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(11,20,26,0.12)'
  },
  chatEncryptNotice: {
    backgroundColor: '#ffeecd',
    color: '#54656f',
    fontSize: '0.64rem',
    textAlign: 'center',
    padding: '6px 10px',
    borderRadius: 8,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 1px 2px rgba(11,20,26,0.08)'
  },
  waOutgoingBubble: {
    backgroundColor: '#d9fdd3',
    borderRadius: '10px 10px 0 10px',
    padding: '0.75rem 0.9rem',
    boxShadow: '0 1px 2px rgba(11,20,26,0.12)',
    maxWidth: '90%',
    marginLeft: 'auto'
  },
  waIncomingBubble: {
    backgroundColor: '#ffffff',
    borderRadius: '10px 10px 10px 0',
    padding: '0.75rem 0.9rem',
    boxShadow: '0 1px 2px rgba(11,20,26,0.12)',
    maxWidth: '90%',
    marginRight: 'auto'
  },
  waSenderTagBiz: {
    fontSize: '0.64rem',
    fontWeight: 800,
    color: '#15803d',
    marginBottom: 3
  },
  waSenderTagCust: {
    fontSize: '0.64rem',
    fontWeight: 800,
    color: '#0284c7',
    marginBottom: 3
  },
  waMsgHeaderTitle: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: '#09090b',
    marginBottom: 4
  },
  waMsgText: {
    fontSize: '0.76rem',
    color: '#111b21',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap'
  },
  waMsgButtonsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 8
  },
  waMsgInteractiveBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#09090b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'all 0.15s ease'
  },
  waMsgFooterTime: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.6rem',
    color: '#667781',
    marginTop: 4
  },
  quickSimSection: {
    backgroundColor: '#ffffff',
    padding: '0.65rem 0.85rem',
    borderTop: '1px solid #e4e4e7',
    borderBottom: '1px solid #e4e4e7'
  },
  quickSimLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#71717a',
    display: 'block',
    marginBottom: 4
  },
  quickSimPillsWrap: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  },
  quickSimBtn: {
    padding: '4px 9px',
    borderRadius: 6,
    border: '1px solid #e4e4e7',
    backgroundColor: '#f8fafc',
    color: '#09090b',
    fontSize: '0.68rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.12s ease'
  },
  chatInputForm: {
    backgroundColor: '#f0f2f5',
    padding: '0.65rem 0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  roleSwitchBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: '0.68rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease'
  },
  chatInputField: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e4e4e7',
    backgroundColor: '#ffffff',
    fontSize: '0.78rem',
    outline: 'none'
  },
  chatSendBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: '#25D366',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(37,211,102,0.4)',
    transition: 'transform 0.12s ease'
  },
  previewFooter: {
    backgroundColor: '#18181b',
    padding: '0.55rem',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.64rem'
  },
  lockIcon: {
    fontSize: '0.68rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.25rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
  },
  formLabel: {
    fontSize: '0.74rem',
    fontWeight: 700,
    color: '#334155'
  },
  formInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.8rem',
    outline: 'none'
  },
  formSelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.8rem',
    outline: 'none',
    backgroundColor: '#fff'
  },
  sendSubmitBtn: {
    padding: '11px',
    backgroundColor: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.85rem',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: '0.5rem',
    boxShadow: '0 4px 14px rgba(37,211,102,0.35)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,6,13,0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1rem',
    marginBottom: '1.25rem'
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#08060d',
    margin: 0
  },
  modalSub: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginTop: 2
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  waPreviewModal: {
    backgroundColor: '#e5ddd5',
    backgroundImage: 'radial-gradient(#cfc5b8 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    borderRadius: 12,
    padding: '1.25rem',
    marginBottom: '1.25rem'
  },
  waBubbleModal: {
    backgroundColor: '#dcf8c6',
    borderRadius: '10px 10px 0 10px',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
  },
  waBodyModal: {
    fontSize: '0.8rem',
    color: '#1f2937',
    lineHeight: 1.5
  },
  modalMetaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    border: '1px solid #e2e8f0'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem'
  },
  metaLbl: {
    color: '#64748b',
    fontWeight: 600
  }
};
