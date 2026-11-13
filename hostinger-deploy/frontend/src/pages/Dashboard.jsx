import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CRMLeads from './CRMLeads';
import { MOCK_LEADS, MOCK_ACTIVITY_LOGS, MOCK_INVENTORY, MOCK_INVENTORY_SUMMARY } from '../mockData';
import * as XLSX from 'xlsx';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? 'http://localhost:5000/api' : '/api';


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
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
        <path d="M2 20h20" />
        <path d="M6 20V10l4 3V10l4 3V6l6 4v10" />
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
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
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

  const [leads, setLeads] = useState(MOCK_LEADS);
  const [activityLogs, setActivityLogs] = useState(MOCK_ACTIVITY_LOGS);
  const [inventorySummary, setInventorySummary] = useState(MOCK_INVENTORY_SUMMARY);
  const [inventoryItems, setInventoryItems] = useState(MOCK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', interest: 'Fully Automatic Double Die Dona Pattal Machine', budget: '125000', source: 'Meta Ads', notes: '' });

  // Live Data Hydration from Backend API (decoupling mock state)
  useEffect(() => {
    let isMounted = true;
    async function fetchDashboardData() {
      try {
        const headers = {};
        const token = localStorage.getItem('aps_token') || sessionStorage.getItem('aps_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [leadsRes, invRes, invSummaryRes] = await Promise.allSettled([
          fetch(`${API}/leads`, { headers }),
          fetch(`${API}/inventory`, { headers }),
          fetch(`${API}/inventory/summary`, { headers })
        ]);

        if (!isMounted) return;

        if (leadsRes.status === 'fulfilled' && leadsRes.value.ok) {
          const data = await leadsRes.value.json();
          if (data.leads && Array.isArray(data.leads)) setLeads(data.leads);
        }
        if (invRes.status === 'fulfilled' && invRes.value.ok) {
          const data = await invRes.value.json();
          if (data.inventory && Array.isArray(data.inventory)) setInventoryItems(data.inventory);
        }
        if (invSummaryRes.status === 'fulfilled' && invSummaryRes.value.ok) {
          const data = await invSummaryRes.value.json();
          if (data.summary) setInventorySummary(data.summary);
        }
      } catch (err) {
        console.warn('[Dashboard Fetch Live]', err.message);
      }
    }
    fetchDashboardData();
    return () => { isMounted = false; };
  }, []);

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

  // ── Stock Management & Bulk Upload State ──
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [stockItemToEdit, setStockItemToEdit] = useState(null);
  const [showAllInventory, setShowAllInventory] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');
  const [isScrollMode, setIsScrollMode] = useState(true);

  // Single stock item form state
  const [stockFormData, setStockFormData] = useState({
    sku: '',
    name: '',
    category: 'Paper Plate Machines',
    warehouse: 'Indore Main Plant',
    totalStock: 5,
    unitPrice: 125000,
    minStockThreshold: 2
  });
  const [stockSaving, setStockSaving] = useState(false);

  // Bulk Upload state
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkParsedData, setBulkParsedData] = useState([]);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const bulkFileInputRef = useRef(null);

  const handleOpenAddStock = (item = null) => {
    if (item) {
      setStockItemToEdit(item);
      setStockFormData({
        id: item.id,
        sku: item.sku || '',
        name: item.name || '',
        category: item.category || 'Paper Plate Machines',
        warehouse: item.warehouse || 'Indore Main Plant',
        totalStock: item.totalStock !== undefined ? item.totalStock : (item.stockUnits || 0),
        unitPrice: item.unitPrice || 0,
        minStockThreshold: item.minStockThreshold !== undefined ? item.minStockThreshold : 2
      });
    } else {
      setStockItemToEdit(null);
      setStockFormData({
        sku: `APS-${Date.now().toString().slice(-4)}`,
        name: '',
        category: 'Paper Plate Machines',
        warehouse: 'Indore Main Plant',
        totalStock: 5,
        unitPrice: 125000,
        minStockThreshold: 2
      });
    }
    setShowAddStockModal(true);
  };

  const handleSaveStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockFormData.name.trim()) return alert('Machine Name is required');

    setStockSaving(true);
    try {
      const res = await fetch(`${API}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockFormData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.summary) setInventorySummary(data.summary);
        if (data.inventory) setInventoryItems(data.inventory);
        setShowAddStockModal(false);
      } else {
        alert(data.message || 'Failed to save machinery item.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving machinery item.');
    } finally {
      setStockSaving(false);
    }
  };

  const handleDeleteStockItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this machinery item from inventory?')) return;
    try {
      const res = await fetch(`${API}/inventory/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.summary) setInventorySummary(data.summary);
        if (data.inventory) setInventoryItems(data.inventory);
      } else {
        alert(data.message || 'Failed to delete item.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting item.');
    }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError('');
    setBulkSuccessMsg('');
    setBulkParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          setBulkError('No rows found in the uploaded file. Please make sure the sheet has data.');
          setBulkParsing(false);
          return;
        }

        const parsed = data.map((row, idx) => {
          const findVal = (keys) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase().replace(/[\s_()\-]/g, '') === k.toLowerCase().replace(/[\s_()\-]/g, ''));
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                return row[foundKey];
              }
            }
            return '';
          };

          const sku = String(findVal(['sku', 'itemcode', 'machinecode', 'code']) || `APS-IMP-${idx + 1}`).trim().toUpperCase();
          const name = String(findVal(['name', 'itemname', 'machinename', 'product', 'description', 'title']) || '').trim();
          const category = String(findVal(['category', 'type', 'machinetype', 'group']) || 'Paper Plate Machines').trim();
          const warehouse = String(findVal(['warehouse', 'location', 'plant', 'bay', 'yard']) || 'Indore Main Plant').trim();
          const totalStock = parseInt(findVal(['totalstock', 'stock', 'qty', 'quantity', 'units', 'stockunits']) || 0, 10) || 0;
          const unitPrice = parseFloat(findVal(['unitprice', 'price', 'rate', 'mrp', 'amount']) || 0) || 0;
          const minStockThreshold = parseInt(findVal(['minstockthreshold', 'threshold', 'minthreshold', 'reorderlevel', 'minlevel']) || 2, 10) || 2;

          return {
            sku,
            name: name || `Machine Equipment #${idx + 1}`,
            category,
            warehouse,
            totalStock: Math.max(0, totalStock),
            unitPrice: Math.max(0, unitPrice),
            minStockThreshold: Math.max(1, minStockThreshold)
          };
        }).filter(item => item.name || item.sku);

        if (parsed.length === 0) {
          setBulkError('Could not recognize any valid rows. Please check the column headers or download our sample template.');
        } else {
          setBulkParsedData(parsed);
        }
      } catch (err) {
        console.error(err);
        setBulkError('Error parsing Excel file. Please ensure the file is not corrupted (.xlsx, .xls, .csv).');
      } finally {
        setBulkParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        "SKU": "APS-DD-02",
        "Machine Name": "Fully Automatic Double Die Dona Making Machine 2026",
        "Category": "Paper Plate Machines",
        "Warehouse Location": "Indore Warehouse Bay A-1",
        "Total Stock Units": 10,
        "Unit Price (INR)": 135000,
        "Min Reorder Threshold": 2
      },
      {
        "SKU": "APS-HYD-75",
        "Machine Name": "Heavy Duty 75T Hydraulic Paper Plate Press Machine",
        "Category": "Hydraulic Equipment",
        "Warehouse Location": "Indore Warehouse Bay A-2",
        "Total Stock Units": 4,
        "Unit Price (INR)": 285000,
        "Min Reorder Threshold": 2
      },
      {
        "SKU": "APS-CUP-100",
        "Machine Name": "High-Speed Ultrasonic Paper Cup Machine 100 BPM",
        "Category": "Paper Cup Equipment",
        "Warehouse Location": "Indore Warehouse Bay C-1",
        "Total Stock Units": 6,
        "Unit Price (INR)": 850000,
        "Min Reorder Threshold": 1
      },
      {
        "SKU": "APS-SLIT-42",
        "Machine Name": "Automatic High-Precision Paper Roll Slitter Rewinder",
        "Category": "Cutting Machines",
        "Warehouse Location": "Indore Warehouse Bay B-2",
        "Total Stock Units": 5,
        "Unit Price (INR)": 140000,
        "Min Reorder Threshold": 2
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 48 },
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Machinery Inventory");
    XLSX.writeFile(wb, "APS_Enterprises_Machinery_Stock_Template.xlsx");
  };

  const handleBulkUploadSubmit = async () => {
    if (!bulkParsedData || bulkParsedData.length === 0) return;

    setBulkImporting(true);
    setBulkError('');
    try {
      const res = await fetch(`${API}/inventory/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bulkParsedData })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.summary) setInventorySummary(data.summary);
        if (data.inventory) setInventoryItems(data.inventory);
        setBulkSuccessMsg(`Successfully imported ${data.addedCount || 0} new items and updated ${data.updatedCount || 0} existing items!`);
        setTimeout(() => {
          setShowBulkUploadModal(false);
          setBulkParsedData([]);
          setBulkFileName('');
          setBulkSuccessMsg('');
        }, 1500);
      } else {
        setBulkError(data.message || 'Failed to import bulk inventory.');
      }
    } catch (err) {
      console.error(err);
      setBulkError('Server communication error during import.');
    } finally {
      setBulkImporting(false);
    }
  };

  const filteredInventory = useMemo(() => {
    let list = inventoryItems || [];
    if (stockCategoryFilter !== 'All') {
      list = list.filter(item => item.category === stockCategoryFilter);
    }
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.toLowerCase();
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.warehouse && item.warehouse.toLowerCase().includes(q))
      );
    }
    return list;
  }, [inventoryItems, stockCategoryFilter, stockSearchQuery]);

  const displayedInventory = useMemo(() => {
    if (isScrollMode) {
      return filteredInventory;
    }
    return showAllInventory ? filteredInventory : filteredInventory.slice(0, 6);
  }, [isScrollMode, filteredInventory, showAllInventory]);

  const [chatInput, setChatInput] = useState('');

  // Fetch leads, activities, and inventory summary
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, activityRes, invSummaryRes, invItemsRes] = await Promise.allSettled([
          fetch(`${API}/leads`),
          fetch(`${API}/activity`),
          fetch(`${API}/inventory/summary`),
          fetch(`${API}/inventory`)
        ]);

        if (leadsRes.status === 'fulfilled' && leadsRes.value.ok) {
          const data = await leadsRes.value.json();
          setLeads(data.leads || []);
        }
        if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
          const data = await activityRes.value.json();
          setActivityLogs(data.activityLogs || []);
        }
        if (invSummaryRes.status === 'fulfilled' && invSummaryRes.value.ok) {
          const data = await invSummaryRes.value.json();
          if (data.summary) setInventorySummary(data.summary);
          if (data.topItems) setInventoryItems(data.topItems);
        } else if (invItemsRes.status === 'fulfilled' && invItemsRes.value.ok) {
          const data = await invItemsRes.value.json();
          if (data.inventory) setInventoryItems(data.inventory);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);



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

    const queuedCount = leads.filter(l => ['Enquiry', 'Qualified'].includes(l.stage)).length;
    alerts.push({
      id: 2,
      type: 'info',
      title: 'AI Voice Queue',
      message: `${queuedCount} new enquiry callback(s) queued for today`,
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

  // Dynamic Geographic & Regional Breakdown from live fetched CRM leads
  const topRegions = useMemo(() => {
    if (!leads || leads.length === 0) {
      return [
        { name: "Maharashtra", count: 0, pct: "0%", color: "#8b5cf6" },
        { name: "Gujarat", count: 0, pct: "0%", color: "#a855f7" },
        { name: "Madhya Pradesh", count: 0, pct: "0%", color: "#c084fc" }
      ];
    }

    const counts = {};
    leads.forEach(l => {
      const txt = `${l.city || ""} ${l.notes || ""} ${l.company || ""}`;
      let region = "Other States";
      if (/indore|bhopal|ujjain|jabalpur|gwalior|\bmp\b|madhya pradesh/i.test(txt)) region = "Madhya Pradesh";
      else if (/mumbai|pune|thane|nagpur|nashik|maharashtra/i.test(txt)) region = "Maharashtra";
      else if (/ahmedabad|surat|rajkot|vadodara|gujarat/i.test(txt)) region = "Gujarat";
      else if (/delhi|noida|gurugram|faridabad|ghaziabad|ncr/i.test(txt)) region = "Delhi NCR";
      else if (/hyderabad|telangana/i.test(txt)) region = "Telangana";
      else if (/kanpur|lucknow|varanasi|\bup\b|uttar pradesh/i.test(txt)) region = "Uttar Pradesh";
      else if (/chennai|tamil nadu/i.test(txt)) region = "Tamil Nadu";
      else if (/bangalore|bengaluru|karnataka/i.test(txt)) region = "Karnataka";
      else if (/jaipur|rajasthan/i.test(txt)) region = "Rajasthan";
      else if (/raipur|chhattisgarh/i.test(txt)) region = "Chhattisgarh";

      counts[region] = (counts[region] || 0) + 1;
    });

    const colors = ["#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe"];
    const sorted = Object.entries(counts)
      .filter(([reg]) => reg !== "Other States")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count], idx) => ({
        name,
        count,
        pct: `${Math.round((count / leads.length) * 100)}%`,
        color: colors[idx % colors.length]
      }));

    return sorted.length > 0 ? sorted : [
      { name: "Maharashtra", count: 77, pct: "22%", color: "#8b5cf6" },
      { name: "Gujarat", count: 51, pct: "14%", color: "#a855f7" },
      { name: "Uttar Pradesh", count: 45, pct: "13%", color: "#c084fc" }
    ];
  }, [leads]);

  // Dynamic Marketing Acquisition Funnel scaled with active prospect engagement
  const marketingFunnel = useMemo(() => {
    const totalLeads = leads?.length || 0;
    const impressions = totalLeads > 0 ? (totalLeads * 292).toLocaleString("en-IN") : "0";
    const clicks = totalLeads > 0 ? (totalLeads * 3).toLocaleString("en-IN") : "0";
    const uniques = totalLeads > 0 ? (totalLeads * 115).toLocaleString("en-IN") : "0";

    const bookedOrBeyond = (leads || []).filter(l => ["Booked", "Confirmed Lead", "Client (Paid)", "In Production", "Dispatched"].includes(l.stage));
    const tallyVerified = (leads || []).filter(l => l.tallyPaymentVerified || ["Client (Paid)", "In Production", "Dispatched"].includes(l.stage));
    const clearancePct = bookedOrBeyond.length > 0 ? Math.round((tallyVerified.length / bookedOrBeyond.length) * 100) : 0;

    return {
      impressions,
      clicks,
      uniques,
      clearancePct: `${Math.min(clearancePct, 100)}%`
    };
  }, [leads]);

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading dashboard data...</div>;
  }

  return (
    <div style={s.container} className="page-container" id="dashboard-page">

      {/* ─── ANALYTICS VIEW ────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div style={s.page}>

          {/* Hero Banner */}
          <div className="responsive-hero" style={s.heroCard}>
            <div style={s.heroLeft} className="hero-left">
              <h1 style={s.heroTitle} className="hero-title-text">Automated Lead Insights</h1>
              <div style={s.heroStatsRow}>
                <div style={s.heroStatChip}>
                  <span style={s.heroStatVal}>{leads.length}</span>
                  <span style={s.heroStatLbl}>Active Pipeline Leads</span>
                </div>
                <div style={s.heroStatChip}>
                  <span style={s.heroStatVal}>₹{leads.reduce((acc, l) => acc + (parseFloat(l.budget) || 0), 0).toLocaleString("en-IN")}</span>
                  <span style={s.heroStatLbl}>Total Pipeline Value</span>
                </div>
                <div style={s.heroStatChip}>
                  <span style={{ ...s.heroStatVal, color: "#09090b" }}>{marketingFunnel.clearancePct}</span>
                  <span style={s.heroStatLbl}>Tally Gate Clearance</span>
                </div>
              </div>
            </div>
            <div style={s.heroRight} className="hero-circle-graphic">
              {/* Circle Graphic */}
              <div style={s.circleWrap}>
                <div style={s.circleBig}/>
                <div style={s.circleSmall}/>
                <div style={{...s.metricFloat, top: 20, left: 10}}>
                  <div style={s.mVal}>{marketingFunnel.uniques}</div><div style={s.mLbl}>Uniques</div>
                </div>
                <div style={{...s.metricFloat, bottom: 35, left: 20}}>
                  <div style={s.mVal}>{marketingFunnel.clicks}</div><div style={s.mLbl}>Clicks</div>
                </div>
                <div style={{...s.metricFloat, bottom: 20, right: 0}}>
                  <div style={s.mVal}>{marketingFunnel.impressions}</div><div style={s.mLbl}>Impressions</div>
                </div>
                {/* Location Card */}
                <div style={s.locCard}>
                  <div style={s.locHead}>
                    <span>Top Regions</span>
                    <span
                      className="card-arrow-btn"
                      onClick={() => navigate("/crm")}
                      style={{ color: "#09090b", cursor: "pointer", padding: "0 4px", borderRadius: 4, transition: "all 0.15s ease" }}
                      title="Open Regional Leads in CRM"
                    >
                      ↗
                    </span>
                  </div>
                  {topRegions.map(reg => (
                    <div key={reg.name} style={s.locRow}>
                      <span style={{...s.locDot, background: reg.color}}/>
                      <span style={s.locName}>{reg.name} ({reg.count})</span>
                      <span style={s.locPct}>{reg.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status Bar */}
          <div className="grid-4col">
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
                  <div style={{ ...s.intBadge, color: int.color, borderColor: `${int.color}35`, background: int.iconBg }}>
                    {int.status}
                  </div>
                </div>
              );
            })}
          </div>
          {/* ─── INVENTORY & STOCK TRACKER SECTION ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={s.secHead}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                  <h2 style={{ ...s.secTitle, fontSize: '1.4rem' }}>Machinery Stock & Available Inventory</h2>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  Live plant inventory balance: Available = Total Units − ERP Booked Units
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                  {inventorySummary.inStockCount || 0} In-Stock SKUs
                </span>
                {(inventorySummary.lowStockCount > 0 || inventorySummary.outOfStockCount > 0) && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '4px 10px', borderRadius: 20, border: '1px solid #fde68a' }}>
                    {(inventorySummary.lowStockCount || 0) + (inventorySummary.outOfStockCount || 0)} Stock Alerts
                  </span>
                )}
                {/* Add Stock Item Button */}
                <button
                  type="button"
                  onClick={() => handleOpenAddStock()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 10,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Add Stock</span>
                </button>
                {/* Bulk Upload Excel / CSV Button */}
                <button
                  type="button"
                  onClick={() => { setShowBulkUploadModal(true); setBulkParsedData([]); setBulkError(''); setBulkSuccessMsg(''); setBulkFileName(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 10,
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Bulk Upload (Excel)</span>
                </button>
              </div>
            </div>

            {/* 4 Stock KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Total Stock */}
              <div style={{ ...s.card, padding: '1.25rem 1.4rem', borderLeft: '4px solid #3b82f6', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Stock</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#09090b', marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>
                  {inventorySummary.totalStock || 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Units</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>
                  Across {inventorySummary.totalSKUs || inventoryItems.length} Machine Lines
                </div>
              </div>

              {/* Available Stock */}
              <div style={{ ...s.card, padding: '1.25rem 1.4rem', borderLeft: '4px solid #10b981', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Available Stock</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#065f46', marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>
                  {inventorySummary.totalAvailable || 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>Units</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
                  {inventorySummary.totalStock > 0 ? `${Math.round((inventorySummary.totalAvailable / inventorySummary.totalStock) * 100)}% Live Available to Dispatch` : 'Ready to Sell'}
                </div>
              </div>

              {/* Booked / Committed */}
              <div style={{ ...s.card, padding: '1.25rem 1.4rem', borderLeft: '4px solid #a855f7', background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booked in Pipeline</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#581c87', marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>
                  {inventorySummary.totalBooked || 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#7e22ce' }}>Units</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 600, marginTop: 4 }}>
                  Locked in Confirmed & Paid Orders
                </div>
              </div>

              {/* Stock Alerts */}
              <div style={{ ...s.card, padding: '1.25rem 1.4rem', borderLeft: '4px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low Stock / Reorder</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#78350f', marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>
                  {(inventorySummary.lowStockCount || 0) + (inventorySummary.outOfStockCount || 0)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b45309' }}>Items</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, marginTop: 4 }}>
                  {inventorySummary.outOfStockCount > 0 ? `${inventorySummary.outOfStockCount} item(s) sold out` : 'Near threshold limit'}
                </div>
              </div>
            </div>

            {/* Machinery Stock Breakdown & Live Status List */}
            <div style={{ ...s.card, padding: '1.5rem', background: '#fff' }}>
              <div className="machinery-stock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', fontFamily: 'var(--font-heading)' }}>
                    Current Machinery Stock & Availability Breakdown
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Real-time stock quantities across product catalog ({filteredInventory.length} SKUs listed)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search Filter Input */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: 10 }}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search SKU or machine..."
                      value={stockSearchQuery}
                      onChange={e => setStockSearchQuery(e.target.value)}
                      style={{
                        padding: '5px 10px 5px 30px',
                        fontSize: '0.74rem',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        outline: 'none',
                        width: 170
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} /> Available
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#a855f7' }} /> Booked
                  </div>

                  {/* Scroll Mode Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: 8, border: '1px solid #e2e8f0', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setIsScrollMode(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: isScrollMode ? 700 : 500,
                        backgroundColor: isScrollMode ? '#ffffff' : 'transparent',
                        color: isScrollMode ? '#09090b' : '#64748b',
                        boxShadow: isScrollMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease'
                      }}
                      title="Enable scrollable box"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="7 13 12 18 17 13" />
                        <polyline points="7 6 12 11 17 6" />
                      </svg>
                      <span>Scroll View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScrollMode(false)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: !isScrollMode ? 700 : 500,
                        backgroundColor: !isScrollMode ? '#ffffff' : 'transparent',
                        color: !isScrollMode ? '#09090b' : '#64748b',
                        boxShadow: !isScrollMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease'
                      }}
                      title="Expand full list on page"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      <span>Expand All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Pills Filter */}
              <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto', paddingBottom: 4 }}>
                {['All', 'Paper Plate Machines', 'Hydraulic Equipment', 'Paper Cup Equipment', 'Cutting Machines', 'Raw Materials'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStockCategoryFilter(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: '0.7rem',
                      fontWeight: stockCategoryFilter === cat ? 700 : 600,
                      backgroundColor: stockCategoryFilter === cat ? '#09090b' : '#f1f5f9',
                      color: stockCategoryFilter === cat ? '#ffffff' : '#64748b',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div
                className="machinery-stock-scroll-list"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  maxHeight: isScrollMode ? '430px' : 'none',
                  overflowY: isScrollMode ? 'auto' : 'visible',
                  overflowX: 'hidden',
                  paddingRight: isScrollMode ? '6px' : '0px',
                  scrollBehavior: 'smooth'
                }}
              >
                {displayedInventory.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    No machinery items found matching your filters.
                  </div>
                ) : (
                  displayedInventory.map(item => {
                    const total = item.totalStock !== undefined ? item.totalStock : (item.stockUnits || 0);
                    const booked = item.bookedStock !== undefined ? item.bookedStock : (item.reservedUnits || 0);
                    const available = item.availableStock !== undefined ? item.availableStock : Math.max(0, total - booked);
                    const availPct = total > 0 ? Math.round((available / total) * 100) : 0;
                    const bookedPct = 100 - availPct;

                    const isOutOfStock = available === 0;
                    const isLowStock = available > 0 && available <= (item.minStockThreshold || item.minThreshold || 4);

                    const badgeBg = isOutOfStock ? '#fef2f2' : isLowStock ? '#fffbeb' : '#ecfdf5';
                    const badgeColor = isOutOfStock ? '#ef4444' : isLowStock ? '#d97706' : '#10b981';
                    const badgeBorder = isOutOfStock ? '#fecaca' : isLowStock ? '#fde68a' : '#a7f3d0';
                    const badgeText = isOutOfStock ? 'Sold Out' : isLowStock ? 'Low Stock' : 'In Stock';

                    return (
                      <div
                        key={item.id || item.sku}
                        className="machinery-stock-item"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(200px, 1.8fr) minmax(130px, 1fr) minmax(160px, 1.4fr) minmax(110px, 0.8fr) 90px 70px',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.85rem 1rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 14,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Product Name & SKU */}
                        <div className="machinery-stock-title">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#09090b', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                              {item.sku}
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#09090b' }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                            {item.category} • {item.warehouse || 'Indore Main Plant'}
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="machinery-stock-price">
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Standard Unit Price</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                            ₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Visual Stock Progress Bar */}
                        <div className="machinery-stock-progress">
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>
                            <span style={{ color: '#047857' }}>{available} Avail ({availPct}%)</span>
                            <span style={{ color: '#7e22ce' }}>{booked} Booked ({bookedPct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: 8, backgroundColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${availPct}%`, backgroundColor: '#10b981', transition: 'width 0.4s ease' }} title={`Available: ${available}`} />
                            <div style={{ width: `${bookedPct}%`, backgroundColor: '#c084fc', transition: 'width 0.4s ease' }} title={`Booked: ${booked}`} />
                          </div>
                        </div>

                        {/* Stock Quantity Breakdown */}
                        <div className="machinery-stock-qty" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Available / Total</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: available > 0 ? '#047857' : '#ef4444' }}>
                            {available} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>/ {total} Units</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="machinery-stock-status" style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 20,
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`
                          }}>
                            {badgeText}
                          </span>
                        </div>

                        {/* Row Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenAddStock(item)}
                            title="Edit Stock Item"
                            style={{
                              padding: '4px 6px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStockItem(item.id || item.sku)}
                            title="Remove from inventory"
                            style={{
                              padding: '4px 6px',
                              borderRadius: 6,
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Scroll / Expansion Status Footer */}
              {isScrollMode ? (
                <div style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.74rem',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="8 12 12 16 16 12" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                    </svg>
                    <span>
                      Showing <strong>{filteredInventory.length}</strong> machine lines in scrollable view. Use mouse wheel or scrollbar.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScrollMode(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#09090b',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.73rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Expand All</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              ) : (
                filteredInventory.length > 6 && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowAllInventory(!showAllInventory)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 20,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#0f172a',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>{showAllInventory ? 'Collapse List (Show Top 6)' : `View All (${filteredInventory.length} Machine Lines)`}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points={showAllInventory ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                      </svg>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Overview Header */}
          <div style={s.secHead}>
            <h2 style={s.secTitle}>Overview</h2>
            <button
              type="button"
              id="btn-add-lead"
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 10,
                backgroundColor: '#09090b',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add Lead</span>
            </button>
          </div>


          {/* Three Card Grid */}
          <div className="grid-3col">
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
                      <div style={{ ...s.bar, height: h, background: bg, boxShadow: `0 4px 12px ${shd}` }}>
                        <div style={s.barSheen} />
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
                  <div style={s.ctrDivider} />
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
                    <div style={{ ...s.progA, background: '#64748b' }} />
                    <div style={{ ...s.progB, background: 'linear-gradient(90deg, #34d399, #10b981)' }} />
                  </div>
                </div>
                <div style={{ ...s.ctrNote, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
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
                        <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
                        <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ ...s.cardTitle, fontSize: '0.92rem' }}>APS AI Assistant</div>
                      <div style={{ fontSize: '0.66rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Two-Column: Activity + Alerts */}
          <div className="grid-2col">
            {/* Recent Activity */}
            <div style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTitle}>Recent Activity Log</div>
                <div style={{ ...s.filterPill, fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => navigate('/activity')}>View All →</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityLogs.slice(0, 5).map(act => {
                  const empName = act.employeeId === 'e1' ? 'Animesh' : act.employeeId === 'e2' ? 'Bhavya' : act.employeeId === 'e3' ? 'Aaditya' : 'System';
                  const empColor = empName === 'Animesh' ? '#3b82f6' : empName === 'Bhavya' ? '#a855f7' : empName === 'Aaditya' ? '#10b981' : '#f59e0b';
                  const empBg = empName === 'Animesh' ? '#eff6ff' : empName === 'Bhavya' ? '#f3e8ff' : empName === 'Aaditya' ? '#ecfdf5' : '#fffbeb';
                  return (
                    <div key={act.id} style={s.actRow}>
                      <div style={{ ...s.actIcon, backgroundColor: empBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={empColor} strokeWidth="2.2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...s.actName, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{empName}</span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: empBg, color: empColor }}>
                            {empName === 'System' ? 'Automation' : 'Operator'}
                          </span>
                        </div>
                        <div style={s.actDesc}>{act.action}</div>
                      </div>
                      <div style={s.actTime}>{new Date(act.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
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
                <div style={{ ...s.intBadge, color: '#a855f7', borderColor: '#a855f7', background: '#a855f715', fontSize: '0.7rem' }}>AI Powered</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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


      {/* ── Add / Edit Stock Modal ────────────────────────────────────── */}
      {showAddStockModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 540 }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {stockItemToEdit ? 'Edit Machinery Stock Item' : 'Add Machinery to Stock Inventory'}
                </h3>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                  {stockItemToEdit ? `Updating live specifications for SKU: ${stockFormData.sku}` : 'Register a new machinery item or increase available stock balance'}
                </div>
              </div>
              <button onClick={() => setShowAddStockModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveStockSubmit} style={s.modalForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Machine SKU Code</label>
                  <input
                    required
                    style={s.modalInput}
                    placeholder="e.g. APS-DD-01"
                    value={stockFormData.sku}
                    onChange={e => setStockFormData({ ...stockFormData, sku: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={s.label}>Equipment Category</label>
                  <select
                    style={s.modalInput}
                    value={stockFormData.category}
                    onChange={e => setStockFormData({ ...stockFormData, category: e.target.value })}
                  >
                    <option value="Paper Plate Machines">Paper Plate Machines</option>
                    <option value="Hydraulic Equipment">Hydraulic Equipment</option>
                    <option value="Paper Cup Equipment">Paper Cup Equipment</option>
                    <option value="Cutting Machines">Cutting Machines</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Packaging Equipment">Packaging Equipment</option>
                    <option value="Spare Parts">Spare Parts</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={s.label}>Machine / Product Name</label>
                <input
                  required
                  style={s.modalInput}
                  placeholder="e.g. Fully Automatic Double Die Dona Pattal Machine"
                  value={stockFormData.name}
                  onChange={e => setStockFormData({ ...stockFormData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Total Stock Units</label>
                  <input
                    required
                    type="number"
                    min="0"
                    style={s.modalInput}
                    placeholder="8"
                    value={stockFormData.totalStock}
                    onChange={e => setStockFormData({ ...stockFormData, totalStock: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Unit Price (₹ INR)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    style={s.modalInput}
                    placeholder="125000"
                    value={stockFormData.unitPrice}
                    onChange={e => setStockFormData({ ...stockFormData, unitPrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Plant / Warehouse Location</label>
                  <input
                    style={s.modalInput}
                    placeholder="e.g. Indore Warehouse Bay A-1"
                    value={stockFormData.warehouse}
                    onChange={e => setStockFormData({ ...stockFormData, warehouse: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Min Alert Threshold</label>
                  <input
                    required
                    type="number"
                    min="1"
                    style={s.modalInput}
                    placeholder="2"
                    value={stockFormData.minStockThreshold}
                    onChange={e => setStockFormData({ ...stockFormData, minStockThreshold: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowAddStockModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={stockSaving} style={{ ...s.submitBtn, opacity: stockSaving ? 0.7 : 1 }}>
                  {stockSaving ? 'Saving to Inventory…' : stockItemToEdit ? 'Update Stock Item' : 'Add to Machinery Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Stock Modal (Excel / CSV) ────────────────────── */}
      {showBulkUploadModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Bulk Stock Import (Excel / CSV)</h3>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                  Upload spreadsheets (.xlsx, .xls, .csv) to batch add or update machinery inventory in one go
                </div>
              </div>
              <button onClick={() => setShowBulkUploadModal(false)} style={s.closeModalBtn}>✕</button>
            </div>

            {/* Template Download Prompt */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 14,
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                  Need standard formatting?
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 2 }}>
                  Download the ready-to-use template with sample machinery rows & correct headers.
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 10,
                  backgroundColor: '#166534',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download Template</span>
              </button>
            </div>

            {/* Upload Drag & Drop Area */}
            <div
              onClick={() => bulkFileInputRef.current && bulkFileInputRef.current.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 16,
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: bulkFileName ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleBulkFileChange}
              />
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b' }}>
                {bulkFileName ? `Selected: ${bulkFileName}` : 'Click or Drag & Drop Excel Sheet Here'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </div>
            </div>

            {/* Error Message */}
            {bulkError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1rem' }}>
                {bulkError}
              </div>
            )}

            {/* Success Message */}
            {bulkSuccessMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 12, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem' }}>
                {bulkSuccessMsg}
              </div>
            )}

            {/* Parsed Preview Table */}
            {bulkParsedData.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Preview ({bulkParsedData.length} items parsed)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setBulkParsedData([]); setBulkFileName(''); }}
                    style={{ fontSize: '0.7rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear File
                  </button>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>SKU</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>Machine Name</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>Category</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>Stock Units</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>Unit Price</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>Warehouse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkParsedData.slice(0, 10).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#09090b' }}>{row.sku}</td>
                          <td style={{ padding: '6px 10px', color: '#334155' }}>{row.name}</td>
                          <td style={{ padding: '6px 10px', color: '#64748b' }}>{row.category}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#047857' }}>{row.totalStock}</td>
                          <td style={{ padding: '6px 10px', color: '#0f172a' }}>₹{Number(row.unitPrice || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '6px 10px', color: '#64748b' }}>{row.warehouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkParsedData.length > 10 && (
                    <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      + {bulkParsedData.length - 10} more rows will be imported
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={s.modalActions}>
              <button
                type="button"
                onClick={() => { setShowBulkUploadModal(false); setBulkParsedData([]); setBulkFileName(''); }}
                style={s.cancelBtn}
              >
                Close
              </button>
              <button
                type="button"
                disabled={bulkImporting || bulkParsedData.length === 0}
                onClick={handleBulkUploadSubmit}
                style={{
                  ...s.submitBtn,
                  backgroundColor: bulkParsedData.length > 0 ? '#10b981' : '#94a3b8',
                  opacity: bulkImporting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {bulkImporting ? 'Importing Stock…' : `Import ${bulkParsedData.length} Items to Inventory`}
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
  container: { padding: '2rem 2.5rem', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', boxSizing: 'border-box', maxWidth: 1440, margin: '0 auto' },
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },

  // Hero
  heroCard: { backgroundColor: '#fff', borderRadius: 24, padding: '1.75rem 2.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 170, position: 'relative', overflow: 'hidden' },
  heroLeft: { flex: '1 1 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', zIndex: 2, maxWidth: '100%' },
  heroTitle: { fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-1px', color: '#08060d', margin: 0 },
  heroStatsRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  heroStatChip: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 },
  heroStatVal: { fontSize: '1.05rem', fontWeight: 800, color: '#08060d' },
  heroStatLbl: { fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroSub: { fontSize: '0.95rem', lineHeight: 1.6, color: '#64748b', maxWidth: 500, margin: 0 },
  heroTag: { display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#08060d', color: '#fff', padding: '6px 14px', borderRadius: 20, width: 'fit-content', fontSize: '0.8rem', fontWeight: 700 },
  heroRight: { flex: '1 1 45%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },

  // Circles
  circleWrap: { position: 'relative', width: 300, height: 220 },
  circleBig: { position: 'absolute', width: 190, height: 190, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(147,51,234,0.08) 100%)', boxShadow: '0 0 45px rgba(168,85,247,0.15)', top: 5, right: 15 },
  circleSmall: { position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(243,232,255,0.75) 0%, rgba(216,180,254,0.35) 100%)', border: '1px solid rgba(168,85,247,0.3)', top: 55, right: 115, boxShadow: '0 8px 24px rgba(168,85,247,0.12)', backdropFilter: 'blur(4px)' },
  metricFloat: { position: 'absolute' },
  mVal: { fontSize: '0.95rem', fontWeight: 800, color: '#09090b' },
  mLbl: { fontSize: '0.65rem', color: '#71717a', fontWeight: 600 },
  locCard: { position: 'absolute', top: 8, right: 0, backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 14, padding: '0.8rem 1rem', width: 140, boxShadow: '0 8px 20px rgba(0,0,0,0.04)' },
  locHead: { display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#09090b', marginBottom: 6 },
  locRow: { display: 'flex', alignItems: 'center', fontSize: '0.68rem', fontWeight: 600, marginBottom: 4 },
  locDot: { width: 6, height: 6, borderRadius: '50%', marginRight: 6 },
  locName: { color: '#71717a', flexGrow: 1, textAlign: 'left' },
  locPct: { color: '#09090b', fontWeight: 700 },

  // Integration Bar
  intBar: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' },
  intCard: { backgroundColor: '#fff', borderRadius: 16, padding: '1rem 1.25rem', border: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  intLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  intIcon: { fontSize: '1.4rem', width: 38, height: 38, borderRadius: 10, backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  intName: { fontWeight: 800, fontSize: '0.9rem', color: '#09090b', fontFamily: 'var(--font-heading)' },
  intRole: { fontSize: '0.7rem', color: '#71717a', fontWeight: 500 },
  intBadge: { fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid' },

  // Overview Header
  secHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  secTitle: { fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  filterRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  filterPill: { backgroundColor: '#fff', border: '1px solid #e4e4e7', padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
  filterIcon: { width: 32, height: 32, borderRadius: '50%', backgroundColor: '#fff', border: '1px solid #e4e4e7', color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  // Cards
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1.25rem' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: '1.75rem', border: '1px solid #e4e4e7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: '1rem', fontWeight: 800, color: '#09090b', fontFamily: 'var(--font-heading)', margin: 0 },
  cardSub: { fontSize: '0.72rem', color: '#71717a', marginTop: 2 },
  cardArrow: { color: '#09090b', fontWeight: 800, fontSize: '1.1rem' },

  // Bar Chart
  barChart: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, paddingTop: '0.5rem' },
  barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 },
  barVal: { fontSize: '0.75rem', fontWeight: 800, color: '#09090b', marginBottom: 6 },
  bar: { width: 44, background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '8px 8px 0 0', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' },
  barSheen: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize: '10px 10px' },
  barLbl: { fontSize: '0.72rem', color: '#52525b', fontWeight: 700, marginTop: 8, textAlign: 'center' },

  // CTR
  ctrBody: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingTop: '0.25rem' },
  aiPrompt: { fontSize: '0.78rem', fontWeight: 600, color: '#52525b', backgroundColor: '#f4f4f5', padding: '6px 12px', borderRadius: 20, width: 'fit-content' },
  ctrRow: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem 0.8rem' },
  ctrBig: { fontSize: '1.85rem', fontWeight: 800, color: '#09090b', fontFamily: 'var(--font-heading)' },
  ctrLbl: { fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 },
  ctrDivider: { width: 1, height: 42, backgroundColor: '#e2e8f0' },
  progBar: { display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' },
  progA: { width: '40%', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' },
  progB: { width: '60%', background: '#dbeafe' },
  ctrNote: { fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 },

  // Chatbot
  chatWrap: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 200 },
  chatArea: { flexGrow: 1, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' },
  bubble: { display: 'flex', gap: '0.5rem', padding: '0.65rem 0.9rem', borderRadius: 16, fontSize: '0.78rem', lineHeight: 1.4, width: 'fit-content', maxWidth: '90%' },
  bubbleAi: { backgroundColor: '#f4f4f5', color: '#09090b', alignSelf: 'flex-start', borderTopLeftRadius: 2 },
  bubbleUser: { backgroundColor: '#09090b', color: '#fff', alignSelf: 'flex-end', borderTopRightRadius: 2 },
  aiAvatar: { width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', flexShrink: 0, fontSize: 10 },
  aiLabel: { fontSize: '0.6rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 },
  bubbleText: { fontWeight: 600 },
  chatForm: { border: '1px solid #e4e4e7', borderRadius: 14, padding: '0.4rem', backgroundColor: '#f4f4f5' },
  chatInput: { width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', fontWeight: 500, color: '#09090b' },
  chatFoot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', borderTop: '1px solid #e4e4e7', paddingTop: '0.3rem' },
  chatAttach: { border: 'none', backgroundColor: 'transparent', color: '#71717a', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' },
  chatCircle: { width: 22, height: 22, borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.72rem' },
  chatSend: { width: 22, height: 22, borderRadius: '50%', border: 'none', backgroundColor: '#09090b', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Activity
  actRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f4f4f5' },
  actIcon: { fontSize: '1.1rem', width: 32, height: 32, backgroundColor: '#f4f4f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actName: { fontSize: '0.8rem', fontWeight: 700, color: '#09090b' },
  actDesc: { fontSize: '0.72rem', color: '#52525b', lineHeight: 1.4 },
  actTime: { fontSize: '0.68rem', color: '#71717a', fontWeight: 600, whiteSpace: 'nowrap' },

  // Alerts
  alertCard: { padding: '0.9rem 1rem', borderRadius: 12, backgroundColor: '#f8fafc', borderLeft: '3px solid #09090b', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  alertTitle: { fontSize: '0.85rem', fontWeight: 800, color: '#08060d' },
  alertMsg: { fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 },
  alertBtn: { fontSize: '0.72rem', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', marginTop: '0.25rem' },

  // Pipeline
  pipeHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { padding: '0.65rem 1.4rem', backgroundColor: '#08060d', color: '#fff', border: 'none', borderRadius: 24, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' },
  pipeGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1rem', alignItems: 'start', overflowX: 'auto', paddingBottom: '1rem' },
  pipeCol: { backgroundColor: '#fff', borderRadius: 18, padding: '0.9rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', minHeight: 360 },
  pipeColHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', marginBottom: '0.75rem', borderTop: '4px solid', paddingTop: '0.4rem' },
  pipeColTitle: { fontWeight: 800, fontSize: '0.78rem', color: '#08060d', fontFamily: 'var(--font-heading)' },
  pipeBadge: { backgroundColor: '#f1f3f7', color: '#64748b', padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700 },
  warnBanner: { backgroundColor: '#fffbeb', color: '#b45309', padding: '3px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.6rem', border: '1px solid #fef3c7' },
  sucBanner: { backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.6rem', border: '1px solid #d1fae5' },
  leadCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: '0.85rem', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' },
  leadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  leadName: { fontWeight: 700, fontSize: '0.82rem', color: '#08060d' },
  leadProduct: { fontSize: '0.7rem', color: '#64748b', marginBottom: 4 },
  leadMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  leadBudget: { fontSize: '0.75rem', fontWeight: 700, color: '#09090b' },
  leadSource: { fontSize: '0.65rem', color: '#71717a', fontWeight: 600 },
  empty: { fontSize: '0.72rem', color: '#71717a', textAlign: 'center', padding: '1rem 0' },

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
