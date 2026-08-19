import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function WhatsAppAutomation() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'sequences' | 'templates' | 'broadcast'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

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
      setLoading(true);
      const [msgRes, seqRes, tplRes, anaRes, leadRes] = await Promise.all([
        fetch(`${API}/whatsapp/messages`),
        fetch(`${API}/whatsapp/sequences`),
        fetch(`${API}/whatsapp/templates`),
        fetch(`${API}/whatsapp/analytics`),
        fetch(`${API}/leads`)
      ]);

      const msgData = await msgRes.json();
      const seqData = await seqRes.json();
      const tplData = await tplRes.json();
      const anaData = await anaRes.json();
      const leadData = await leadRes.json();

      setMessages(msgData.messages || []);
      setSequences(seqData.sequences || []);
      setTemplates(tplData.templates || []);
      setAnalytics(anaData.analytics || null);
      setLeads(leadData.leads || []);

      if (leadData.leads?.length > 0 && !broadcastData.leadId) {
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
    } catch (err) {
      console.error('Error loading A5 WhatsApp data:', err);
    } finally {
      setLoading(false);
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

  const handleSendCustomBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);
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
        setActiveTab('messages');
      }
    } catch (err) {
      console.error('Error sending WhatsApp broadcast:', err);
    } finally {
      setSending(false);
    }
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

  // Selected template object for live preview
  const activeTemplateObj = useMemo(() => {
    return templates.find(t => t.id === broadcastData.templateId) || templates[0];
  }, [templates, broadcastData.templateId]);

  if (loading) {
    return (
      <div style={s.centerContainer}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Initializing A5 WhatsApp Automation Engine & WABA Bridge…</div>
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
          <div style={s.badgeModule}>MODULE A5 • WHATSAPP AUTOMATION</div>
          <h1 style={s.title}>WhatsApp AI Automation & Lifecycle Messaging</h1>
          <p style={s.subtitle}>
            Event-driven messaging synced directly to A2 pipeline transitions: payment gate reminders, Tally order release, and production tracking.
          </p>
        </div>
        <div style={s.headerActions}>
          <div style={s.wabaBadge}>
            <span style={s.wabaDot} />
            <span style={s.wabaText}>Meta Cloud API v20.0 (WABA Live)</span>
          </div>
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
              <span style={{ ...s.kpiIconWrap, background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>💬</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.totalMessagesSent?.toLocaleString('en-IN')}</span>
              <span style={s.kpiTrendBadge}>+14.2% wk</span>
            </div>
            <div style={s.kpiSub}>Automated event triggers across A2 state changes</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Handset Delivery Rate</span>
              <span style={{ ...s.kpiIconWrap, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>✓✓</span>
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
              <span style={{ ...s.kpiIconWrap, background: 'rgba(170,59,255,0.12)', color: '#aa3bff' }}>👁️</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{analytics.readRate}</span>
              <span style={{ ...s.kpiTrendBadge, background: 'rgba(170,59,255,0.1)', color: '#aa3bff' }}>92.4% Avg</span>
            </div>
            <div style={s.kpiSub}>Read receipts verified via Meta webhook callbacks</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Active Lifecycle Sequences</span>
              <span style={{ ...s.kpiIconWrap, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>⚡</span>
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
              <option value="Delivered">Delivered (✓✓)</option>
              <option value="Read">Read (✓✓ Blue)</option>
              <option value="Sent">Sent (✓)</option>
              <option value="Failed">Failed (✕)</option>
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
              <p style={s.sectionSub}>Automated notifications dispatched by A5 module based on A2 state machine events</p>
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
              {filteredMessages.map(msg => {
                const isRead = msg.status === 'Read';
                const isDelivered = msg.status === 'Delivered';
                return (
                  <tr key={msg.messageId} style={s.trHover}>
                    <td style={{ ...s.td, fontWeight: 700, color: '#64748b' }}>{msg.messageId}</td>
                    <td style={s.td}>
                      <div style={s.recipientName}>{msg.leadName}</div>
                      <div style={s.recipientPhone}>{msg.phone} • {msg.leadId}</div>
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
                    <td style={{ ...s.td, fontWeight: 700, color: '#aa3bff' }}>
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
                        View Chat Bubble 💬
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
                      {seq.delayHours === 0 ? '⚡ Instantaneous (0h)' : `⏱️ After ${seq.delayHours} Hours dwell`}
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
                    <div style={{ ...s.seqStatVal, color: '#aa3bff' }}>{seq.conversionRate}</div>
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
                <span style={s.tplTriggerInfo}>⚡ {tpl.delayDescription}</span>
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
            <p style={s.sectionSub}>Select a lead from the A2 database or enter custom parameters to fire live WhatsApp notifications</p>

            <form onSubmit={handleSendCustomBroadcast} style={s.form}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Select Lead Record (A2 Database)</label>
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
                {sending ? 'Delivering via Meta WABA Cloud…' : ' Send WhatsApp Notification Now'}
              </button>
            </form>
          </div>

          {/* Live Preview Panel */}
          <div style={s.previewCard}>
            <div style={s.previewHeader}>
              <div style={s.waHeaderAvatar}>APS</div>
              <div>
                <div style={s.waHeaderName}>APS Enterprise Verified</div>
                <div style={s.waHeaderStatus}>Official Business Account ✓</div>
              </div>
            </div>

            <div style={s.previewBody}>
              <div style={s.waLiveBubble}>
                <div style={s.waLiveHeader}>{activeTemplateObj?.header}</div>
                <div style={s.waLiveText}>
                  {activeTemplateObj?.bodyText
                    ?.replace('{{1}}', broadcastData.recipientName || 'John Doe')
                    ?.replace('{{2}}', broadcastData.product || 'CNC Machine v2')
                    ?.replace('{{3}}', '₹42,000')
                    ?.replace('{{4}}', `₹${broadcastData.amount || '4,200'}`)
                    ?.replace('{{5}}', '2 business days')}
                </div>
                <div style={s.waLiveTime}>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: '#53bdeb' }}>✓✓</span>
                </div>
              </div>

              {activeTemplateObj?.buttons?.map((btn, idx) => (
                <div key={idx} style={s.previewActionBtn}>
                  {btn}
                </div>
              ))}
            </div>

            <div style={s.previewFooter}>
              <span style={s.lockIcon}>🔒</span> End-to-end encrypted via Meta Business Cloud API
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
    backgroundColor: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37,211,102,0.3)'
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
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
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
    color: '#64748b',
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
    color: '#08060d',
    letterSpacing: '-0.5px'
  },
  kpiTrendBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    backgroundColor: 'rgba(37,211,102,0.12)',
    color: '#16a34a'
  },
  kpiSubTag: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#64748b'
  },
  kpiSub: {
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
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
    color: '#08060d',
    borderBottom: '2.5px solid #25D366',
    cursor: 'pointer'
  },
  tabInactive: {
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
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
    border: '1px solid #cbd5e1',
    fontSize: '0.78rem',
    width: 200,
    outline: 'none',
    backgroundColor: '#fff'
  },
  selectFilter: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.78rem',
    backgroundColor: '#fff',
    color: '#0f172a',
    outline: 'none',
    cursor: 'pointer'
  },
  messagesCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
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
    color: '#08060d',
    margin: 0
  },
  sectionSub: {
    fontSize: '0.76rem',
    color: '#64748b',
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
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 700,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#08060d'
  },
  trHover: {
    transition: 'background 0.15s'
  },
  recipientName: {
    fontWeight: 800,
    fontSize: '0.84rem'
  },
  recipientPhone: {
    fontSize: '0.68rem',
    color: '#64748b',
    marginTop: 2
  },
  prodName: {
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  prodSub: {
    fontSize: '0.68rem',
    color: '#94a3b8'
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
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
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
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
    color: '#64748b'
  },
  seqName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#08060d',
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
    color: '#64748b',
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
    border: '1px solid #f1f5f9'
  },
  seqDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem'
  },
  seqDetailLbl: {
    color: '#64748b',
    fontWeight: 600
  },
  seqDetailVal: {
    color: '#08060d',
    fontWeight: 700
  },
  seqDetailCode: {
    fontFamily: 'monospace',
    color: '#4f46e5',
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
    backgroundColor: 'transparent',
    color: '#25D366',
    border: '1px solid rgba(37,211,102,0.4)',
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
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
    color: '#64748b',
    textTransform: 'uppercase'
  },
  tplName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#08060d',
    margin: '2px 0 0 0'
  },
  tplId: {
    fontSize: '0.66rem',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  approvedBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    backgroundColor: 'rgba(37,211,102,0.12)',
    color: '#16a34a',
    borderRadius: 12
  },
  waBubbleWrapper: {
    backgroundColor: '#e5ddd5',
    backgroundImage: 'radial-gradient(#cfc5b8 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '1rem',
    flex: 1
  },
  waBubble: {
    backgroundColor: '#fff',
    borderRadius: '8px 8px 8px 0',
    padding: '0.75rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    maxWidth: '92%'
  },
  waHeader: {
    fontWeight: 800,
    fontSize: '0.78rem',
    color: '#08060d',
    marginBottom: 4
  },
  waBody: {
    fontSize: '0.74rem',
    color: '#334155',
    lineHeight: 1.45
  },
  waTimeRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.6rem',
    color: '#94a3b8',
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
    color: '#25D366',
    fontWeight: 700,
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  tplFooter: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem'
  },
  tplTriggerInfo: {
    fontSize: '0.7rem',
    color: '#64748b',
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
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  previewCard: {
    backgroundColor: '#128C7E',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(18,140,126,0.2)',
    border: '1px solid #0d7367'
  },
  previewHeader: {
    backgroundColor: '#075E54',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  waHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#25D366',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  waHeaderName: {
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.9rem'
  },
  waHeaderStatus: {
    color: '#a7f3d0',
    fontSize: '0.68rem'
  },
  previewBody: {
    backgroundColor: '#efeae2',
    backgroundImage: 'radial-gradient(#cfc5b8 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    padding: '1.5rem 1.25rem',
    minHeight: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem'
  },
  waLiveBubble: {
    backgroundColor: '#dcf8c6',
    borderRadius: '10px 10px 0 10px',
    padding: '0.85rem 1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    marginLeft: 'auto',
    maxWidth: '88%'
  },
  waLiveHeader: {
    fontWeight: 800,
    fontSize: '0.82rem',
    color: '#08060d',
    marginBottom: 4
  },
  waLiveText: {
    fontSize: '0.78rem',
    color: '#1f2937',
    lineHeight: 1.5
  },
  waLiveTime: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.62rem',
    color: '#6b7280',
    marginTop: 6
  },
  previewActionBtn: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#25D366',
    fontWeight: 700,
    fontSize: '0.76rem',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    marginLeft: 'auto',
    width: '88%'
  },
  previewFooter: {
    backgroundColor: '#075E54',
    padding: '0.65rem',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.66rem'
  },
  lockIcon: {
    fontSize: '0.7rem'
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
