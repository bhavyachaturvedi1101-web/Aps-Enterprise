import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_LEADS } from '../mockData';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? 'http://localhost:5000/api' : '/api';

const STAGES = [
  'Enquiry',
  'Qualified',
  'Booked',
  'Confirmed Lead',
  'Client (Paid)',
  'In Production',
  'Dispatched'
];

const VALID_NEXT = {
  Enquiry: 'Qualified',
  Qualified: 'Booked',
  Booked: 'Confirmed Lead',
  'Confirmed Lead': 'Client (Paid)',
  'Client (Paid)': 'In Production',
  'In Production': 'Dispatched'
};

const STAGE_META = {
  Enquiry: {
    color: '#475569',
    borderTop: '#64748b',
    bg: '#ffffff',
    pillBg: '#f1f5f9',
    pillClr: '#475569',
    idx: 0
  },
  Qualified: {
    color: '#1d4ed8',
    borderTop: '#3b82f6',
    bg: '#ffffff',
    pillBg: '#eff6ff',
    pillClr: '#1d4ed8',
    idx: 1
  },
  Booked: {
    color: '#7c3aed',
    borderTop: '#a855f7',
    bg: '#ffffff',
    pillBg: '#f3e8ff',
    pillClr: '#7c3aed',
    idx: 2
  },
  'Confirmed Lead': {
    color: '#047857',
    borderTop: '#10b981',
    bg: '#ffffff',
    pillBg: '#ecfdf5',
    pillClr: '#047857',
    idx: 3
  },
  'Client (Paid)': {
    color: '#0f766e',
    borderTop: '#0d9488',
    bg: '#ffffff',
    pillBg: '#ccfbf1',
    pillClr: '#0f766e',
    idx: 4
  },
  'In Production': {
    color: '#4338ca',
    borderTop: '#6366f1',
    bg: '#ffffff',
    pillBg: '#e0e7ff',
    pillClr: '#4338ca',
    idx: 5
  },
  Dispatched: {
    color: '#b45309',
    borderTop: '#f59e0b',
    bg: '#ffffff',
    pillBg: '#fffbeb',
    pillClr: '#b45309',
    idx: 6
  }
};

const PRIORITY_THEMES = {
  Hot: { bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' },
  Warm: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Cold: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
};

const SOURCE_THEMES = {
  WhatsApp: { bg: '#ecfdf5', color: '#047857' },
  'Meta Ads': { bg: '#eff6ff', color: '#1d4ed8' },
  'Facebook Ad': { bg: '#eff6ff', color: '#1d4ed8' },
  'Voice Agent': { bg: '#f3e8ff', color: '#7c3aed' },
  'Inbound Call': { bg: '#e0e7ff', color: '#4338ca' },
  'Direct Web': { bg: '#f1f5f9', color: '#475569' },
  Default: { bg: '#f1f5f9', color: '#475569' }
};

// Custom Enterprise Select Component for CRM
function CustomSelect({ value, options, onChange, minWidth = 140, fullWidth = false, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block', width: fullWidth ? '100%' : 'auto' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.45rem 0.85rem',
          borderRadius: 8,
          border: '1px solid #e4e4e7',
          backgroundColor: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#09090b',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          minWidth: fullWidth ? '100%' : minWidth,
          width: fullWidth ? '100%' : 'auto',
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <span>{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#71717a"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: dropUp ? 'calc(100% + 4px)' : undefined,
            top: dropUp ? undefined : 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e4e4e7',
            boxShadow: dropUp ? '0 -10px 25px -5px rgba(0,0,0,0.12)' : '0 10px 25px -5px rgba(0,0,0,0.12)',
            zIndex: 1050,
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 200,
            overflowY: 'auto'
          }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#ffffff' : '#09090b',
                  backgroundColor: isSelected ? '#2563eb' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                <span>{opt}</span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CRMLeads() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  const [leads, setLeads] = useState(MOCK_LEADS);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCountersignModal, setShowCountersignModal] = useState(false);
  const [targetLead, setTargetLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  // Bulk Import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  const handleDownloadSampleCSV = () => {
    const csvContent = "name,company,phone,email,interest,budget,stage,source,notes\n" +
      "Rajesh Sharma,Apex Engineering Ltd,+919876543210,rajesh@apexeng.com,CNC Milling Machine 5-Axis,85000,Enquiry,Meta Ads,Inquired via Meta Ads for Pune manufacturing unit.\n" +
      "Sunil Verma,Precision Tooling Ltd,+919823456789,sunil@precisiontool.in,Laser Cutting System Pro,120000,Qualified,A1 Voice Agent,Called by A1 voice agent confirmed budget & timeline.\n" +
      "Meera Nair,Southern Industrial Corp,+919811223344,meera@southernind.co.in,Hydraulic Press 200T,45000,Confirmed Lead,WhatsApp,Booking approved. Awaiting 10% advance deposit.";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_leads_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          setParsedRecords(Array.isArray(json) ? json : [json]);
        } catch {
          alert('Invalid JSON file format.');
        }
      } else {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length <= 1) {
          alert('CSV file is empty or missing data lines.');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const records = lines.slice(1).map((line, idx) => {
          const vals = line.split(',').map(v => v.trim());
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || '';
          });
          return {
            name: obj.name || obj.company || `Imported Lead ${idx + 1}`,
            company: obj.company || 'Enterprise Client',
            phone: obj.phone || '+919900000000',
            email: obj.email || 'client@import.com',
            interest: obj.interest || 'CNC Machinery',
            budget: obj.budget || '50000',
            stage: STAGES.includes(obj.stage) ? obj.stage : 'Enquiry',
            source: obj.source || 'Bulk CSV Import',
            notes: obj.notes || 'Imported via CSV Data Import Center'
          };
        });
        setParsedRecords(records);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkImport = async () => {
    if (parsedRecords.length === 0) return;
    setImporting(true);
    try {
      for (const rec of parsedRecords) {
        await fetch(`${API}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec)
        });
      }
      setImporting(false);
      setShowBulkImportModal(false);
      setImportSuccessMsg(`Successfully imported ${parsedRecords.length} records into pipeline!`);
      setParsedRecords([]);
      await fetchLeads();
      setTimeout(() => setImportSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setImporting(false);
      alert('Error importing records.');
    }
  };

  // Form states
  const [approvalPolicy, setApprovalPolicy] = useState('single-action');
  const [countersignedBy, setCountersignedBy] = useState('e3');

  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    company: '',
    interest: 'CNC Router Pro v3',
    budget: '35000',
    source: 'WhatsApp',
    stage: 'Enquiry',
    priority: 'Warm',
    notes: 'No pitch yet'
  });

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
    const handleLeadsUpdated = () => {
      fetchLeads();
    };
    window.addEventListener('aps_leads_updated', handleLeadsUpdated);
    return () => window.removeEventListener('aps_leads_updated', handleLeadsUpdated);
  }, []);

  // Arrow Horizontal Scroll Handlers
  const scrollLeft = () => {
    if (boardRef.current) {
      boardRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (boardRef.current) {
      boardRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

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
        alert(`${data.error || 'Transition Failed'}\n${data.reason || data.details || ''}`);
      }
    } catch {
      alert('Backend connection error.');
    } finally {
      setTransitioning(null);
      setShowCountersignModal(false);
      setTargetLead(null);
    }
  };

  const handleTransitionClick = (lead, explicitStage = null) => {
    const toStage = explicitStage || VALID_NEXT[lead.stage];
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

  // Open Quick Add Modal for a specific column
  const handleOpenAddForStage = (stage) => {
    setNewLead(prev => ({ ...prev, stage }));
    setShowAddModal(true);
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
        setNewLead({
          name: '',
          phone: '',
          company: '',
          interest: 'CNC Router Pro v3',
          budget: '35000',
          source: 'WhatsApp',
          stage: 'Enquiry',
          priority: 'Warm',
          notes: 'No pitch yet'
        });
        await fetchLeads();
      } else {
        alert('Failed to add lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating lead.');
    }
  };

  // Edit Lead
  const handleOpenEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead({ ...lead });
    setShowEditModal(true);
  };

  const handleEditLeadSubmit = async (e) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      const res = await fetch(`${API}/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLead)
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingLead(null);
        await fetchLeads();
      } else {
        alert('Failed to update lead');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating lead.');
    }
  };

  // Delete Lead
  const handleDeleteLead = async (lead, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) return;
    try {
      const res = await fetch(`${API}/leads/${lead.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchLeads();
      } else {
        alert('Failed to delete lead');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting lead.');
    }
  };

  // Filter leads by search & source
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch =
        (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || '').includes(search) ||
        (l.interest || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.company || '').toLowerCase().includes(search.toLowerCase());

      const matchSource = selectedSource === 'All' || l.source === selectedSource;
      return matchSearch && matchSource;
    });
  }, [leads, search, selectedSource]);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const map = {};
    STAGES.forEach(s => { map[s] = []; });
    filteredLeads.forEach(l => {
      if (map[l.stage]) {
        map[l.stage].push(l);
      } else {
        map['Enquiry'].push(l);
      }
    });
    return map;
  }, [filteredLeads]);

  // Format date & time helper
  const formatDate = (d) => {
    if (!d) return '19 Aug 2026, 02:30 PM';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '19 Aug 2026, 02:30 PM';
    }
  };

  if (loading) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Loading CRM Lead Pipeline…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* ── Top Header Control Bar ──────────────────────────────────── */}
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={s.pageTitle}>CRM / Lead Pipeline</h1>
            <div style={s.leadCountChip}>
              {leads.length} Total Leads
            </div>
          </div>
        </div>

        {/* Action Controls & Arrow Buttons */}
        <div style={s.topBarRight}>
          {/* Arrow Navigation Scroll Controls */}
          <div style={s.arrowControls}>
            <button
              onClick={scrollLeft}
              style={s.arrowBtn}
              title="Scroll Kanban Left"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={s.arrowDivider} />
            <button
              onClick={scrollRight}
              style={s.arrowBtn}
              title="Scroll Kanban Right"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Search Box */}
          <div style={s.searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone or product…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={s.searchInput}
            />
            {search && (
              <button onClick={() => setSearch('')} style={s.clearSearchBtn}>✕</button>
            )}
          </div>

          {/* Source Filter */}
          <CustomSelect
            value={selectedSource === 'All' ? 'All Sources' : selectedSource}
            options={['All Sources', 'WhatsApp', 'Meta Ads', 'Facebook Ad', 'Voice Agent', 'Inbound Call', 'Direct Web']}
            onChange={val => setSelectedSource(val === 'All Sources' ? 'All' : val)}
            minWidth={135}
          />


          {/* Bulk Import CSV / JSON Button */}
          <button
            onClick={() => setShowBulkImportModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Bulk Import CSV</span>
          </button>

          {/* Add New Lead Button */}
          <button onClick={() => setShowAddModal(true)} className="btn-blue-primary" style={s.addLeadBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {importSuccessMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {importSuccessMsg}
        </div>
      )}

      {/* ── Main Kanban Swimlane Columns (Horizontally Scrollable) ─── */}
      <div ref={boardRef} style={s.kanbanBoard}>
        {STAGES.map(stage => {
          const meta = STAGE_META[stage];
          const columnLeads = leadsByStage[stage] || [];
          const count = columnLeads.length;

          return (
            <div key={stage} style={s.kanbanColumn}>
              {/* Column Top Header */}
              <div style={s.columnHeader}>
                <div style={s.columnTitleRow}>
                  <div style={s.columnTitleLeft}>
                    <span style={s.columnTitle}>{stage}</span>
                    {/* Numbers Display (e.g. "Doing 11") */}
                    <span style={s.columnCountBadge}>
                      {count}
                    </span>
                  </div>
                  {/* Quick Add Button in Header */}
                  <button
                    onClick={() => handleOpenAddForStage(stage)}
                    style={s.columnAddBtn}
                    title={`Add new lead to ${stage}`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Column Cards Container */}
              <div style={s.columnBody}>
                {columnLeads.map((lead) => {
                  const priorityStyle = PRIORITY_THEMES[lead.priority] || PRIORITY_THEMES['Warm'];
                  const sourceStyle = SOURCE_THEMES[lead.source] || SOURCE_THEMES['Default'];
                  const nextStage = VALID_NEXT[lead.stage];
                  const isTransitioning = transitioning === lead.id;

                  return (
                    <div
                      key={lead.id}
                      style={s.leadCard}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {/* Top Row: Lead Name + Edit/Delete Icons */}
                      <div style={s.cardHeadRow}>
                        <div style={s.cardLeadName}>{lead.name}</div>
                        <div style={s.cardActions} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEdit(lead, e)}
                            style={s.actionIconBtn}
                            title="Edit Lead"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteLead(lead, e)}
                            style={{ ...s.actionIconBtn, color: '#ef4444' }}
                            title="Delete Lead"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Phone Number Row (Show Numbers) */}
                      <div style={s.phoneRow}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
                        </svg>
                        <span style={s.phoneText}>
                          {lead.phone ? lead.phone.replace(/^\+91/, '') : '9988776655'}
                        </span>
                      </div>

                      {/* Tags Row: Priority (Warm) + Source (WhatsApp / Facebook Ad) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                        <span style={{ color: priorityStyle.color, fontWeight: 700, fontSize: '0.78rem' }}>
                          {lead.priority || 'Warm'}
                        </span>
                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>•</span>
                        <span style={{ color: sourceStyle.color, fontWeight: 700, fontSize: '0.78rem' }}>
                          {lead.source || 'WhatsApp'}
                        </span>
                      </div>

                      {/* Product Interest / Note & Date Row */}
                      <div style={s.metaRow}>
                        <span style={s.notesText}>
                          {lead.notes && lead.notes !== 'No pitch yet' ? lead.notes : (lead.interest || 'No pitch yet')}
                        </span>
                        <span style={s.dateText}>
                          {formatDate(lead.createdAt)}
                        </span>
                      </div>

                      {/* Quick Stage Transition Buttons */}
                      <div style={s.transitionRow} onClick={e => e.stopPropagation()}>
                        {nextStage ? (
                          <button
                            disabled={isTransitioning}
                            onClick={() => handleTransitionClick(lead)}
                            style={s.quickNextBtn}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                            <span>{isTransitioning ? 'Moving…' : `→ ${nextStage}`}</span>
                          </button>
                        ) : (
                          <div style={s.completedBadge}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Dispatched / Completed</span>
                          </div>
                        )}
                      </div>

                      {/* Tally Hard Gate Warning */}
                      {lead.stage === 'Confirmed Lead' && (
                        <div style={s.tallyGateTag}>
                          <span>10% Advance Deposit Required</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {columnLeads.length === 0 && (
                  <div style={s.emptyColumn}>
                    <div style={s.emptyColumnPlus}>+</div>
                    <div style={s.emptyColumnText}>No leads in {stage}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Add New Lead ─────────────────────────────────────── */}
      {showAddModal && (
        <div style={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)} style={s.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleAddLeadSubmit} style={s.modalForm}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Client / Lead Name *</label>
                  <input
                    required
                    style={s.formInput}
                    placeholder="Name"
                    value={newLead.name}
                    onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Phone Number *</label>
                  <input
                    required
                    style={s.formInput}
                    placeholder="e.g. 9988776655"
                    value={newLead.phone}
                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Initial Pipeline Stage</label>
                  <CustomSelect
                    value={newLead.stage}
                    options={STAGES}
                    onChange={st => setNewLead({ ...newLead, stage: st })}
                    fullWidth={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Priority / Warmth</label>
                  <CustomSelect
                    value={newLead.priority}
                    options={['Warm', 'Hot', 'Cold']}
                    onChange={pr => setNewLead({ ...newLead, priority: pr })}
                    fullWidth={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Lead Source</label>
                  <CustomSelect
                    value={newLead.source}
                    options={['WhatsApp', 'Facebook Ad', 'Meta Ads', 'Voice Agent', 'Inbound Call', 'Direct Web']}
                    onChange={src => setNewLead({ ...newLead, source: src })}
                    fullWidth={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Product Interest</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. CNC Router Pro v3"
                    value={newLead.interest}
                    onChange={e => setNewLead({ ...newLead, interest: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Estimated Deal Value (₹)</label>
                  <input
                    type="number"
                    style={s.formInput}
                    placeholder="35000"
                    value={newLead.budget}
                    onChange={e => setNewLead({ ...newLead, budget: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Company / Organization</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. Precision Tools Ltd"
                    value={newLead.company}
                    onChange={e => setNewLead({ ...newLead, company: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={s.formLabel}>Pitch Note / Summary</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. No pitch yet"
                  value={newLead.notes}
                  onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowAddModal(false)} style={s.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={s.modalSubmitBtn}>
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Lead ────────────────────────────────────────── */}
      {showEditModal && editingLead && (
        <div style={s.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Edit Lead: {editingLead.name}</h3>
              <button onClick={() => setShowEditModal(false)} style={s.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleEditLeadSubmit} style={s.modalForm}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Client / Lead Name</label>
                  <input
                    required
                    style={s.formInput}
                    value={editingLead.name}
                    onChange={e => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Phone Number</label>
                  <input
                    style={s.formInput}
                    value={editingLead.phone || ''}
                    onChange={e => setEditingLead({ ...editingLead, phone: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Pipeline Stage</label>
                  <CustomSelect
                    value={editingLead.stage}
                    options={STAGES}
                    onChange={st => setEditingLead({ ...editingLead, stage: st })}
                    fullWidth={true}
                    dropUp={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Priority / Warmth</label>
                  <CustomSelect
                    value={editingLead.priority || 'Warm'}
                    options={['Warm', 'Hot', 'Cold']}
                    onChange={pr => setEditingLead({ ...editingLead, priority: pr })}
                    fullWidth={true}
                    dropUp={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Lead Source</label>
                  <CustomSelect
                    value={editingLead.source || 'WhatsApp'}
                    options={['WhatsApp', 'Facebook Ad', 'Meta Ads', 'Voice Agent', 'Inbound Call', 'Direct Web']}
                    onChange={src => setEditingLead({ ...editingLead, source: src })}
                    fullWidth={true}
                    dropUp={true}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Product Interest</label>
                  <input
                    style={s.formInput}
                    value={editingLead.interest || ''}
                    onChange={e => setEditingLead({ ...editingLead, interest: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Deal Budget (₹)</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={editingLead.budget || ''}
                    onChange={e => setEditingLead({ ...editingLead, budget: e.target.value })}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.formLabel}>Company</label>
                  <input
                    style={s.formInput}
                    value={editingLead.company || ''}
                    onChange={e => setEditingLead({ ...editingLead, company: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={s.formLabel}>Pitch Note</label>
                <input
                  style={s.formInput}
                  value={editingLead.notes || ''}
                  onChange={e => setEditingLead({ ...editingLead, notes: e.target.value })}
                />
              </div>

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} style={s.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={s.modalSubmitBtn}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Dual Countersign Approval ────────────────────────── */}
      {showCountersignModal && targetLead && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalBox, borderTop: '4px solid #f59e0b' }}>
            <div style={s.modalHead}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706' }}>DUAL APPROVAL POLICY</div>
                <h3 style={s.modalTitle}>Countersign Authorization Required</h3>
              </div>
              <button onClick={() => setShowCountersignModal(false)} style={s.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                Lead <strong>{targetLead.name} ({targetLead.id})</strong> is transitioning to <strong>{VALID_NEXT[targetLead.stage]}</strong>.
                Please assign a second officer to countersign this transition.
              </p>

              <div style={{ marginTop: 12 }}>
                <label style={s.formLabel}>Initiating Officer</label>
                <input disabled value="Super Admin (Primary Admin)" style={{ ...s.formInput, backgroundColor: '#f1f5f9' }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={s.formLabel}>Countersigning Officer</label>
                <select
                  style={s.formSelect}
                  value={countersignedBy}
                  onChange={e => setCountersignedBy(e.target.value)}
                >
                  <option value="e3">Aaditya (Operations Manager)</option>
                  <option value="e1">Animesh (Senior Sales Lead)</option>
                </select>
              </div>
            </div>

            <div style={s.modalActions}>
              <button onClick={() => setShowCountersignModal(false)} style={s.modalCancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => executeTransitionCall(targetLead, VALID_NEXT[targetLead.stage], countersignedBy)}
                style={{ ...s.modalSubmitBtn, backgroundColor: '#f59e0b' }}
              >
                Sign & Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Data Import Modal (CSV & JSON) ────────────────── */}
      {showBulkImportModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalBox, maxWidth: 680, backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={s.modalHead}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Bulk Import Leads & CRM Data
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Upload CSV or JSON dataset to populate historical leads across all pipeline stages.
                </div>
              </div>
              <button onClick={() => { setShowBulkImportModal(false); setParsedRecords([]); }} style={s.modalCloseBtn}>
                ✕
              </button>
            </div>

            {/* Template Download & File Select Row */}
            <div style={{ display: 'flex', gap: '12px', margin: '16px 0', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Download Sample CSV Template
              </button>

              <label
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <polyline points="9 14 12 11 15 14" />
                </svg>
                Select CSV / JSON File
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Live Parsing Preview */}
            {parsedRecords.length > 0 ? (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {parsedRecords.length} Records Parsed & Validated
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ready to Import</span>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textIndent: '8px' }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', color: '#334155', height: '30px', textAlign: 'left' }}>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Interest</th>
                        <th>Budget</th>
                        <th>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', height: '28px', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td>{r.company}</td>
                          <td>{r.interest}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>₹{Number(r.budget || 0).toLocaleString('en-IN')}</td>
                          <td><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{r.stage}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRecords.length > 10 && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px', textAlign: 'center' }}>
                    + {parsedRecords.length - 10} more records in batch queue...
                  </div>
                )}
              </div>
            ) : (
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#64748b', margin: '14px 0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#09090b' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                      <path d="M12 12v9" />
                      <path d="m16 16-4-4-4 4" />
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Drag & Drop or Select CSV / JSON File</div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>Supports name, company, phone, email, interest, budget, stage, source, notes fields</div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={s.modalActions}>
              <button onClick={() => { setShowBulkImportModal(false); setParsedRecords([]); }} style={s.modalCancelBtn}>
                Cancel
              </button>
              <button
                disabled={parsedRecords.length === 0 || importing}
                onClick={handleConfirmBulkImport}
                style={{
                  ...s.modalSubmitBtn,
                  opacity: parsedRecords.length === 0 || importing ? 0.5 : 1,
                  cursor: parsedRecords.length === 0 || importing ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? 'Importing Batch Records...' : `Confirm & Import ${parsedRecords.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: '1.25rem 1.75rem',
    fontFamily: 'var(--font-body, "Inter", sans-serif)',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 0',
    color: '#64748b'
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 14
  },
  loadingText: {
    fontSize: '0.9rem',
    fontWeight: 600
  },

  // Top Bar
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: '1.25rem'
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px'
  },
  leadCountChip: {
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    border: '1px solid #e4e4e7',
    padding: '3px 10px',
    borderRadius: 20
  },

  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },

  // Arrow Controls
  arrowControls: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    overflow: 'hidden'
  },
  arrowBtn: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    cursor: 'pointer',
    color: '#09090b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
  },
  arrowDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e4e4e7'
  },

  // Search
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: 10,
    padding: '6px 12px',
    width: 260,
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.82rem',
    color: '#09090b',
    width: '100%',
    background: 'transparent'
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: 0
  },

  sourceSelect: {
    padding: '7px 12px',
    borderRadius: 10,
    border: '1px solid #e4e4e7',
    backgroundColor: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#09090b',
    outline: 'none',
    cursor: 'pointer'
  },

  // Policy
  policyToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  policyLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#71717a'
  },
  policyBadge: {
    padding: '6px 12px',
    borderRadius: 20,
    border: '1px solid',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },

  addLeadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    transition: 'all 0.15s ease'
  },

  // Kanban Board Container
  kanbanBoard: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '2rem',
    alignItems: 'flex-start',
    scrollBehavior: 'smooth',
    flex: 1
  },

  // Kanban Column
  kanbanColumn: {
    width: '280px',
    minWidth: '280px',
    maxWidth: '280px',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    border: '1px solid #e4e4e7',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },

  columnHeader: {
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderBottom: '1px solid #e4e4e7'
  },
  columnTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  columnTitleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  columnTitle: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: '#09090b'
  },
  columnCountBadge: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#09090b',
    backgroundColor: '#f4f4f5',
    padding: '2px 8px',
    borderRadius: 12
  },
  columnAddBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#71717a',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
    transition: 'color 0.15s ease'
  },

  columnBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxHeight: 'calc(100vh - 210px)',
    overflowY: 'auto'
  },

  // Lead Card
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e4e4e7',
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  cardHeadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardLeadName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#09090b',
    letterSpacing: '-0.2px'
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    opacity: 0.8
  },

  phoneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#52525b',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  phoneText: {
    color: '#09090b',
    fontWeight: 600
  },

  tagsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  tagPill: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid transparent'
  },

  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.72rem',
    color: '#71717a',
    paddingTop: 4,
    borderTop: '1px solid #f4f4f5'
  },
  notesText: {
    fontWeight: 500,
    color: '#52525b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '150px'
  },
  dateText: {
    fontWeight: 500,
    color: '#71717a'
  },

  transitionRow: {
    marginTop: 2
  },
  quickNextBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    color: '#09090b',
    border: '1px solid #e4e4e7',
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
  },
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#09090b',
    padding: '4px 0'
  },
  tallyGateTag: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#09090b',
    backgroundColor: '#f4f4f5',
    border: '1px dashed #d4d4d8',
    padding: '3px 6px',
    borderRadius: 6,
    textAlign: 'center'
  },

  emptyColumn: {
    padding: '2rem 1rem',
    textAlign: 'center',
    border: '2px dashed #cbd5e1',
    borderRadius: 10,
    color: '#94a3b8'
  },
  emptyColumnPlus: {
    fontSize: '1.4rem',
    lineHeight: 1,
    marginBottom: 4
  },
  emptyColumnText: {
    fontSize: '0.75rem',
    fontWeight: 600
  },

  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: 540,
    padding: '1.75rem',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f1f5f9'
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  formLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#475569'
  },
  formInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.82rem',
    color: '#0f172a',
    outline: 'none'
  },
  formSelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.82rem',
    color: '#0f172a',
    outline: 'none',
    backgroundColor: '#ffffff'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f1f5f9'
  },
  modalCancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  modalSubmitBtn: {
    padding: '8px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer'
  }
};
