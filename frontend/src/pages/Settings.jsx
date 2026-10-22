import React, { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  // Company Profile
  companyName: 'APS Enterprises',
  tagline: 'Leading Dona Pattal & Paper Plate Machine Manufacturer in Madhya Pradesh',
  address: '832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, MP - 452001',
  supportEmail: 'admin@apsenterprises.in',
  operationsEmail: 'support.apsenterprises@gmail.com',
  phonePrimary: '+91 78697 55871',
  phoneSecondary: '+91 88278 48099',
  website: 'https://www.apsenterprises.in',
  gstin: '23AABCA1234A1Z5',
  currency: 'INR (₹)',
  timezone: 'Asia/Kolkata (IST - UTC+05:30)',
  fiscalYear: 'April 1 - March 31',

  // AI & Voice Telecalling
  llmProvider: 'groq',
  voiceAgentActive: true,
  voiceLanguage: 'Hindi (Natural Conversation)',
  voiceSpeaker: 'Aditi (Hindi Female - Professional)',
  autoCallTrigger: '2_minutes',
  callWindowStart: '09:30',
  callWindowEnd: '19:00',
  maxCallRetries: '3',
  minRetryIntervalMinutes: '45',
  autoSendWhatsAppCatalog: true,
  speechRate: '1.0x',

  // Workflows & Payment Gate
  enforceTenPercentGate: true,
  gatePercentage: 10,
  approvalPolicy: 'single-action',
  leadDistribution: 'round-robin',
  paymentReminderInterval: '24_hours',
  autoCloseDeadLeadsDays: '30_days',

  // Tally & Integrations
  tallyHost: 'localhost',
  tallyPort: '9000',
  tallyCompany: 'APS Enterprises',
  crmEndpoint: 'http://localhost:5000/api',
  metaWebhookUrl: 'https://platformapi.teleforce.cx/api/v1/meta-webhook',
  indiamartApiKey: 'APS_IM_LIVE_KEY_9821',
  whatsappProvider: 'DoubleTick / Meta Cloud API',
  voiceTrunk: 'TeleForce / Exotel Voice Trunk',

  // Security & Backups
  highValueAlertThreshold: '500000',
  lowInventoryThreshold: 10,
  sessionTimeout: '2_hours',
  dailyBackupActive: true,
  logRetentionDays: '90'
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState(() => {
    try {
      const local = localStorage.getItem('aps_system_settings');
      if (local) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });
  const [toastMsg, setToastMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tallyTesting, setTallyTesting] = useState(false);
  const [tallyStatus, setTallyStatus] = useState(null);

  // Load saved settings from server / localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.allSettings && typeof data.allSettings === 'object') {
            setSettings(prev => ({
              ...prev,
              ...data.allSettings
            }));
            try {
              localStorage.setItem('aps_system_settings', JSON.stringify({ ...data.allSettings }));
            } catch {}
            return;
          }

          const serverConfig = data.config || {};
          const serverProfile = data.companyProfile || {};

          setSettings(prev => {
            const updated = {
              ...prev,
              companyName: serverProfile.name || prev.companyName,
              tagline: serverProfile.tagline || prev.tagline,
              address: serverProfile.address || prev.address,
              website: serverProfile.website || prev.website,
              supportEmail: serverProfile.emails?.[0] || prev.supportEmail,
              operationsEmail: serverProfile.emails?.[1] || prev.operationsEmail,
              phonePrimary: serverProfile.phones?.[0] || prev.phonePrimary,
              phoneSecondary: serverProfile.phones?.[1] || prev.phoneSecondary,
              approvalPolicy: serverConfig.approvalPolicy || prev.approvalPolicy,
              gatePercentage: serverConfig.paymentGatePercentage || prev.gatePercentage,
              whatsappProvider: serverConfig.whatsappProvider || prev.whatsappProvider
            };
            try {
              localStorage.setItem('aps_system_settings', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch {
        // LocalStorage already loaded initially
      }
    };

    loadSettings();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleChange = (field, val) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem('aps_system_settings', JSON.stringify(settings));
    } catch {}

    try {
      await fetch('http://localhost:5000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            approvalPolicy: settings.approvalPolicy,
            paymentGatePercentage: Number(settings.gatePercentage),
            autoSendPaymentReminders: true,
            whatsappProvider: settings.whatsappProvider
          },
          companyProfile: {
            name: settings.companyName,
            tagline: settings.tagline,
            address: settings.address,
            website: settings.website,
            emails: [settings.supportEmail, settings.operationsEmail].filter(Boolean),
            phones: [settings.phonePrimary, settings.phoneSecondary].filter(Boolean)
          },
          allSettings: settings
        })
      });
      showToast('Settings saved successfully (Browser + Server Disk).');
    } catch {
      showToast('Settings saved to Browser Storage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTally = async () => {
    setTallyTesting(true);
    setTallyStatus(null);
    try {
      const res = await fetch('http://localhost:5000/api/tally/status');
      if (res.ok) {
        const data = await res.json();
        setTallyStatus({
          online: data.online,
          message: data.online
            ? `Connected to Tally Prime on port ${settings.tallyPort}`
            : `Tally desktop app offline on port ${settings.tallyPort}. Cloud Ledger Bridge active.`
        });
      } else {
        setTallyStatus({ online: false, message: 'Tally Bridge standby active.' });
      }
    } catch {
      setTallyStatus({ online: false, message: 'Tally desktop not reachable on port 9000.' });
    } finally {
      setTallyTesting(false);
    }
  };

  const handleExportData = () => {
    const snapshot = {
      exportTimestamp: new Date().toISOString(),
      company: settings.companyName,
      settings
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APS_System_Config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('System configuration exported successfully.');
  };

  const tabs = [
    {
      id: 'company',
      label: 'Company Profile',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M3 7v14M21 7v14M6 11h.01M6 15h.01M10 11h.01M10 15h.01M14 11h.01M14 15h.01M18 11h.01M18 15h.01M9 3h6v4H9z" />
        </svg>
      )
    },
    {
      id: 'ai',
      label: 'AI & Voice Agent',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      )
    },
    {
      id: 'workflows',
      label: 'Workflows & Gate',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      )
    },
    {
      id: 'integrations',
      label: 'Tally & Integrations',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    },
    {
      id: 'security',
      label: 'Security & Backups',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }
  ];

  return (
    <div style={s.page} className="page-container">
      {/* Toast */}
      {toastMsg && (
        <div style={s.toast}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>System Control Settings</h1>
          <p style={s.sub}>
            Configure enterprise master data, AI voice telecallers, 10% payment gates, Tally ERP sync, and platform security.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportData}
            style={s.exportBtn}
            title="Export settings JSON snapshot"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Snapshot</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-blue-primary"
            style={s.saveBtn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{isSaving ? 'Saving…' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={s.tabBar}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={isActive ? s.tabActive : s.tabInactive}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div style={s.card}>
        {/* ─── TAB 1: Company Profile ─────────────────────────────────────────── */}
        {activeTab === 'company' && (
          <div style={s.sectionContent}>
            <div style={s.secHeader}>
              <h2 style={s.secTitle}>Company & Factory Master Information</h2>
              <p style={s.secSub}>These credentials are used across Quotations, Tally Invoices, Job Cards, and Customer Communications.</p>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Company Legal Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={e => handleChange('gstin', e.target.value)}
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Industry Subtitle / Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                style={s.input}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Factory & Registered Office Address</label>
              <textarea
                rows={3}
                value={settings.address}
                onChange={e => handleChange('address', e.target.value)}
                style={{ ...s.input, resize: 'vertical' }}
              />
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Primary Sales Contact / Phone</label>
                <input
                  type="text"
                  value={settings.phonePrimary}
                  onChange={e => handleChange('phonePrimary', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Secondary Hotline / Support</label>
                <input
                  type="text"
                  value={settings.phoneSecondary}
                  onChange={e => handleChange('phoneSecondary', e.target.value)}
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Executive / Admin Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={e => handleChange('supportEmail', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Operations & Billing Email</label>
                <input
                  type="email"
                  value={settings.operationsEmail}
                  onChange={e => handleChange('operationsEmail', e.target.value)}
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.grid3}>
              <div style={s.formGroup}>
                <label style={s.label}>Base Currency</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={e => handleChange('currency', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Timezone</label>
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={e => handleChange('timezone', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Fiscal Year Cycle</label>
                <input
                  type="text"
                  value={settings.fiscalYear}
                  onChange={e => handleChange('fiscalYear', e.target.value)}
                  style={s.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: AI & Voice Telecalling ──────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div style={s.sectionContent}>
            <div style={s.secHeader}>
              <h2 style={s.secTitle}>AI Voice Telecaller & Automated Customer Engagement</h2>
              <p style={s.secSub}>Configure LLM inference, autonomous telecalling parameters, call windows, and WhatsApp auto-replies.</p>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Primary LLM Reasoning Provider</label>
                <select
                  value={settings.llmProvider}
                  onChange={e => handleChange('llmProvider', e.target.value)}
                  style={s.select}
                >
                  <option value="groq">Groq — Llama 3.3 70B Versatile (Fastest Inference, Recommended)</option>
                  <option value="gemini">Google Gemini 1.5 Flash (Multimodal & Analytical)</option>
                  <option value="openai">OpenAI GPT-4o-mini (Standard Precision)</option>
                </select>
                <span style={s.fieldHint}>Controls the Natural Language Query Assistant and automated lead classification model.</span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>AI Voice Outbound Telecalling</label>
                <div style={s.toggleWrap}>
                  <label style={s.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={settings.voiceAgentActive}
                      onChange={e => handleChange('voiceAgentActive', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                    <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>
                      {settings.voiceAgentActive ? 'Autonomous Telecalling Active' : 'Autonomous Telecalling Paused'}
                    </span>
                  </label>
                  <span style={s.fieldHint}>When active, the Voice Agent places outbound qualification calls to newly captured Meta / IndiaMart leads.</span>
                </div>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Telecaller Conversation Language</label>
                <select
                  value={settings.voiceLanguage}
                  onChange={e => handleChange('voiceLanguage', e.target.value)}
                  style={s.select}
                >
                  <option value="Hindi (Natural Conversation)">Hindi (Natural Business Hindi)</option>
                  <option value="Hinglish (Mix)">Hinglish (Hindi + English Technical terms)</option>
                  <option value="English (Professional)">English (Professional Business)</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Voice Speaker Profile</label>
                <select
                  value={settings.voiceSpeaker}
                  onChange={e => handleChange('voiceSpeaker', e.target.value)}
                  style={s.select}
                >
                  <option value="Aditi (Hindi Female - Professional)">Aditi (Hindi Female — Calm & Professional)</option>
                  <option value="Rohan (Hindi Male - Corporate)">Rohan (Hindi Male — Confident & Corporate)</option>
                  <option value="Priya (English Female)">Priya (English Female — Clear Accent)</option>
                  <option value="Amit (English Male)">Amit (English Male — Executive)</option>
                </select>
              </div>
            </div>

            <div style={s.grid3}>
              <div style={s.formGroup}>
                <label style={s.label}>Auto-Call Trigger Delay</label>
                <select
                  value={settings.autoCallTrigger}
                  onChange={e => handleChange('autoCallTrigger', e.target.value)}
                  style={s.select}
                >
                  <option value="30_seconds">30 Seconds after lead capture (Speed-to-lead)</option>
                  <option value="2_minutes">2 Minutes after lead capture</option>
                  <option value="5_minutes">5 Minutes after lead capture</option>
                  <option value="manual">Manual Trigger Only (Telecaller Queue)</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Max Retry Attempts (Unanswered)</label>
                <select
                  value={settings.maxCallRetries}
                  onChange={e => handleChange('maxCallRetries', e.target.value)}
                  style={s.select}
                >
                  <option value="1">1 Attempt only</option>
                  <option value="2">2 Attempts</option>
                  <option value="3">3 Attempts (Standard)</option>
                  <option value="5">5 Attempts</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Calling Speed / Speech Rate</label>
                <select
                  value={settings.speechRate}
                  onChange={e => handleChange('speechRate', e.target.value)}
                  style={s.select}
                >
                  <option value="0.9x">0.9x (Deliberate & Clear)</option>
                  <option value="1.0x">1.0x (Natural Cadence)</option>
                  <option value="1.1x">1.1x (Brisk Conversation)</option>
                </select>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Daily Calling Hours Window</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="time"
                    value={settings.callWindowStart}
                    onChange={e => handleChange('callWindowStart', e.target.value)}
                    style={{ ...s.input, width: 140 }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>to</span>
                  <input
                    type="time"
                    value={settings.callWindowEnd}
                    onChange={e => handleChange('callWindowEnd', e.target.value)}
                    style={{ ...s.input, width: 140 }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>IST</span>
                </div>
                <span style={s.fieldHint}>Calls will only be placed within this business window. Outside these hours, leads queue up for next morning.</span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Automated WhatsApp Machine Catalog</label>
                <div style={s.toggleWrap}>
                  <label style={s.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={settings.autoSendWhatsAppCatalog}
                      onChange={e => handleChange('autoSendWhatsAppCatalog', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                    <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>
                      Auto-send PDF Brochure upon Qualification
                    </span>
                  </label>
                  <span style={s.fieldHint}>Automatically triggers official Dona Pattal & Hydraulic Paper Plate Machine PDF specifications to client WhatsApp.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: Workflows & Gate ────────────────────────────────────────── */}
        {activeTab === 'workflows' && (
          <div style={s.sectionContent}>
            <div style={s.secHeader}>
              <h2 style={s.secTitle}>Manufacturing Gate Rules & Lead Assignment</h2>
              <p style={s.secSub}>Control financial gates before inventory commitment, dual-authorization policies, and lead distribution.</p>
            </div>

            {/* 10% Gate Box */}
            <div style={s.bannerCard}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: '#eff6ff', color: '#2563eb' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    Mandatory 10% Advance Deposit Gate
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 3, lineHeight: 1.5 }}>
                    When enabled, factory job cards and machine inventory allocation cannot be released until Tally ERP reflects a reconciled 10% advance deposit UTR reference.
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.enforceTenPercentGate}
                        onChange={e => handleChange('enforceTenPercentGate', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#09090b' }}>
                        Enforce 10% Gate in ERP Pipeline
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Gate Threshold:</span>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={settings.gatePercentage}
                        onChange={e => handleChange('gatePercentage', e.target.value)}
                        style={{ ...s.input, width: 75, padding: '4px 8px', fontSize: '0.8rem' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Release Authorization */}
            <div style={{ marginTop: 24 }}>
              <label style={{ ...s.label, fontSize: '0.85rem' }}>Factory Release Gate Authorization Policy</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
                <div
                  onClick={() => handleChange('approvalPolicy', 'single-action')}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1.5px solid ${settings.approvalPolicy === 'single-action' ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: settings.approvalPolicy === 'single-action' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="approvalPolicy"
                      checked={settings.approvalPolicy === 'single-action'}
                      onChange={() => handleChange('approvalPolicy', 'single-action')}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <strong style={{ fontSize: '0.85rem', color: '#09090b' }}>Single-Action Approval</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 22px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                    One verified administrator can verify the advance deposit and release machine production immediately.
                  </p>
                </div>

                <div
                  onClick={() => handleChange('approvalPolicy', 'countersign')}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1.5px solid ${settings.approvalPolicy === 'countersign' ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: settings.approvalPolicy === 'countersign' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="approvalPolicy"
                      checked={settings.approvalPolicy === 'countersign'}
                      onChange={() => handleChange('approvalPolicy', 'countersign')}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <strong style={{ fontSize: '0.85rem', color: '#09090b' }}>Two-Person Countersign</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 22px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                    Requires Dual Authorization: Super Admin authorizes payment clearance, and Factory Floor Manager authorizes raw steel allocation.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ ...s.grid2, marginTop: 24 }}>
              <div style={s.formGroup}>
                <label style={s.label}>New Lead Distribution Algorithm</label>
                <select
                  value={settings.leadDistribution}
                  onChange={e => handleChange('leadDistribution', e.target.value)}
                  style={s.select}
                >
                  <option value="round-robin">Round-Robin (Equally rotative to Online Telecallers)</option>
                  <option value="load-balanced">Load-Balanced (Assigns to agent with fewest active leads)</option>
                  <option value="manual">Manual Assignment Only (Super Admin assigns)</option>
                </select>
                <span style={s.fieldHint}>Determines which telecaller gets assigned incoming leads from Meta Ads and IndiaMart.</span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Pending Advance Reminder Cadence</label>
                <select
                  value={settings.paymentReminderInterval}
                  onChange={e => handleChange('paymentReminderInterval', e.target.value)}
                  style={s.select}
                >
                  <option value="12_hours">Every 12 Hours (High urgency)</option>
                  <option value="24_hours">Every 24 Hours (Standard business follow-up)</option>
                  <option value="48_hours">Every 48 Hours</option>
                  <option value="disabled">Disabled (Manual follow-up only)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: Tally & Integrations ────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <div style={s.sectionContent}>
            <div style={s.secHeader}>
              <h2 style={s.secTitle}>Tally ERP 9 / Prime Bridge & API Gateways</h2>
              <p style={s.secSub}>Configure desktop ODBC endpoints, marketing webhooks, and telecommunications credentials.</p>
            </div>

            {/* Tally Settings Card */}
            <div style={{ padding: 18, borderRadius: 14, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <strong style={{ fontSize: '0.88rem', color: '#09090b' }}>Tally Prime / ERP 9 Desktop Bridge (XML ODBC)</strong>
                </div>

                <button
                  type="button"
                  onClick={handleTestTally}
                  disabled={tallyTesting}
                  style={s.testBtn}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>{tallyTesting ? 'Testing Port 9000…' : 'Test ODBC Connection'}</span>
                </button>
              </div>

              {tallyStatus && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: 14,
                  backgroundColor: tallyStatus.online ? '#ecfdf5' : '#eff6ff',
                  color: tallyStatus.online ? '#047857' : '#1d4ed8',
                  border: `1px solid ${tallyStatus.online ? '#a7f3d0' : '#bfdbfe'}`
                }}>
                  {tallyStatus.message}
                </div>
              )}

              <div style={s.grid3}>
                <div style={s.formGroup}>
                  <label style={s.label}>ODBC Host</label>
                  <input
                    type="text"
                    value={settings.tallyHost}
                    onChange={e => handleChange('tallyHost', e.target.value)}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>ODBC Port</label>
                  <input
                    type="text"
                    value={settings.tallyPort}
                    onChange={e => handleChange('tallyPort', e.target.value)}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Company Name in Tally</label>
                  <input
                    type="text"
                    value={settings.tallyCompany}
                    onChange={e => handleChange('tallyCompany', e.target.value)}
                    style={s.input}
                  />
                </div>
              </div>
            </div>

            {/* Webhook Endpoints */}
            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Meta Lead Ads Webhook URL</label>
                <input
                  type="text"
                  value={settings.metaWebhookUrl}
                  onChange={e => handleChange('metaWebhookUrl', e.target.value)}
                  style={s.input}
                />
                <span style={s.fieldHint}>Paste into Meta Business Suite to receive incoming Facebook/Instagram campaign leads in real-time.</span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>IndiaMart / TradeIndia API Key</label>
                <input
                  type="text"
                  value={settings.indiamartApiKey}
                  onChange={e => handleChange('indiamartApiKey', e.target.value)}
                  style={s.input}
                />
                <span style={s.fieldHint}>Used by the CRM sync engine to fetch B2B machinery enquiries.</span>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>WhatsApp Business API Provider</label>
                <input
                  type="text"
                  value={settings.whatsappProvider}
                  onChange={e => handleChange('whatsappProvider', e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Voice & Telephony SIP Trunk</label>
                <input
                  type="text"
                  value={settings.voiceTrunk}
                  onChange={e => handleChange('voiceTrunk', e.target.value)}
                  style={s.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: Security & Backups ──────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div style={s.sectionContent}>
            <div style={s.secHeader}>
              <h2 style={s.secTitle}>Security Policy, Inventory Thresholds & System Backups</h2>
              <p style={s.secSub}>Configure data protection policies, stock alert limits, and session lifetime.</p>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>High-Value Lead Priority Alert Threshold</label>
                <select
                  value={settings.highValueAlertThreshold}
                  onChange={e => handleChange('highValueAlertThreshold', e.target.value)}
                  style={s.select}
                >
                  <option value="200000">Notify for Leads &gt; ₹2,00,000</option>
                  <option value="500000">Notify for Leads &gt; ₹5,00,000 (Recommended)</option>
                  <option value="1000000">Notify for Leads &gt; ₹10,00,000</option>
                  <option value="all">Notify for All Inbound Leads</option>
                </select>
                <span style={s.fieldHint}>Broadcasts instant high-priority alerts to executive dashboards when a large buyer enters the pipeline.</span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Low Inventory Warning Threshold (Units)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.lowInventoryThreshold}
                  onChange={e => handleChange('lowInventoryThreshold', e.target.value)}
                  style={s.input}
                />
                <span style={s.fieldHint}>Triggers a restock alert when ready machine stock or paper rolls fall below this level.</span>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.formGroup}>
                <label style={s.label}>Session Inactivity Timeout</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={e => handleChange('sessionTimeout', e.target.value)}
                  style={s.select}
                >
                  <option value="30_minutes">30 Minutes</option>
                  <option value="2_hours">2 Hours</option>
                  <option value="8_hours">8 Hours (Full Shift)</option>
                  <option value="24_hours">24 Hours</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Activity Audit Log Retention Period</label>
                <select
                  value={settings.logRetentionDays}
                  onChange={e => handleChange('logRetentionDays', e.target.value)}
                  style={s.select}
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Enterprise Standard)</option>
                  <option value="180">180 Days</option>
                  <option value="365">1 Year</option>
                </select>
              </div>
            </div>

            <div style={s.formGroup}>
              <div style={s.toggleWrap}>
                <label style={s.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.dailyBackupActive}
                    onChange={e => handleChange('dailyBackupActive', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                  />
                  <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>
                    Automated Nightly Snapshot Backup (02:00 AM IST)
                  </span>
                </label>
                <span style={s.fieldHint}>Creates a persistent encrypted snapshot of CRM leads, employee logs, and Tally voucher mappings.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem 2.5rem', fontFamily: 'var(--font-body)', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' },
  toast: { position: 'fixed', bottom: 24, right: 24, backgroundColor: '#09090b', color: '#fff', padding: '0.8rem 1.4rem', borderRadius: 14, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 2000, fontSize: '0.82rem', fontWeight: 600 },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#71717a', marginTop: 4, maxWidth: 650, lineHeight: 1.5 },
  exportBtn: { padding: '8px 14px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' },
  saveBtn: { padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' },
  testBtn: { padding: '5px 12px', backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },

  tabBar: { display: 'flex', gap: 8, marginBottom: '1.25rem', borderBottom: '1px solid #e4e4e7', paddingBottom: 10, overflowX: 'auto' },
  tabActive: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8, backgroundColor: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0 },
  tabInactive: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8, backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #e4e4e7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0 },

  card: { backgroundColor: '#ffffff', borderRadius: 18, border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', padding: '2rem' },
  sectionContent: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  secHeader: { borderBottom: '1px solid #f1f5f9', paddingBottom: 14, marginBottom: 8 },
  secTitle: { fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  secSub: { fontSize: '0.76rem', color: '#64748b', marginTop: 4, margin: '4px 0 0' },

  bannerCard: { padding: '16px 18px', borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' },

  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.76rem', fontWeight: 700, color: '#334155' },
  input: { padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-body)', color: '#09090b', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box', width: '100%' },
  select: { padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-body)', color: '#09090b', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box', width: '100%', cursor: 'pointer' },
  fieldHint: { fontSize: '0.7rem', color: '#64748b', lineHeight: 1.4, marginTop: 2 },

  toggleWrap: { padding: '10px 12px', borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }
};
