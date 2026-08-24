// Team KPIs & Performance Dashboard
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const ROLE_OPTIONS = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'Telecaller / Qualification', value: 'Telecaller' },
  { label: 'Field & Direct Sales', value: 'Sales' },
  { label: 'Assembly Supervisor', value: 'Assembly' },
  { label: 'Machine Fitter', value: 'Fitter' },
  { label: 'Quality Testing', value: 'Testing' },
  { label: 'Dispatch & Logistics', value: 'Dispatch' },
  { label: 'Accounts & ERP Admin', value: 'Admin' },
  { label: 'Spare Parts & Service', value: 'Spare' }
];

function CustomSelect({ value, options, onChange, minWidth = 160 }) {
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

  const selectedOpt = options.find(o => (typeof o === 'object' ? o.value === value : o === value)) || options[0];
  const selectedLabel = typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.5rem 0.85rem',
          borderRadius: 8,
          border: '1px solid #e4e4e7',
          backgroundColor: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#09090b',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          minWidth: minWidth,
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <span>{selectedLabel}</span>
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
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e4e4e7',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
            zIndex: 1050,
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 220,
            overflowY: 'auto'
          }}
        >
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLbl = typeof opt === 'object' ? opt.label : opt;
            const isSelected = optVal === value;
            return (
              <div
                key={optVal}
                onClick={() => {
                  onChange(optVal);
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
                <span>{optLbl}</span>
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

const DEFAULT_EMPLOYEES = [
  { 
    id: 'e1', 
    name: 'Animesh', 
    email: 'animesh@aps-enterprise.com',
    phone: '+91 98201 11223',
    role: 'Voice Operations & Sales Lead', 
    department: 'Voice Operations & Telecalling',
    kpiScore: '94%',
    kpiScoreNum: 94,
    status: 'Active',
    currentActivity: 'Qualifying Inbound Voice Lead (Reliance Automation)',
    tasksCompleted: 48, 
    callsHandled: 124, 
    salesClosed: 8,
    totalRevenue: 248000,
    targetSales: 10,
    conversionRate: '36.8%',
    avgCallDurationSec: 135,
    avgResponseTimeMin: 4.2,
    weeklyKpiHistory: [86, 89, 91, 94],
    stageConversions: { enquiryToQualified: 42, qualifiedToBooked: 28, bookedToConfirmed: 18, confirmedToPaid: 8 },
    activeTask: {
      id: 'task-e1-1',
      title: 'Outbound telecall follow-up for LEAD-008 (Reliance Automation)',
      leadId: 'LEAD-008',
      leadName: 'Reliance Automation',
      priority: 'High',
      type: 'Sales Qualification',
      stage: 'Enquiry',
      dueIn: '20 mins',
      assignedAt: new Date(Date.now() - 1800000)
    },
    taskQueue: [
      {
        id: 'task-e1-2',
        title: 'Voice Agent call analysis & qualification review for LEAD-002 (Jane Smith)',
        leadId: 'LEAD-002',
        leadName: 'Jane Smith',
        priority: 'Normal',
        type: 'Voice Review',
        stage: 'Qualified'
      }
    ]
  },
  { 
    id: 'e2', 
    name: 'Sneha', 
    email: 'sneha@aps-enterprise.com',
    phone: '+91 98202 22334',
    role: 'Admin Cockpit Operator & Operations Lead', 
    department: 'Central Operations & Admin',
    kpiScore: '96%',
    kpiScoreNum: 96,
    status: 'Active',
    currentActivity: 'Dual-Approval Review for LEAD-004 (Global Tech)',
    tasksCompleted: 62, 
    callsHandled: 88, 
    salesClosed: 11,
    totalRevenue: 385000,
    targetSales: 12,
    conversionRate: '41.2%',
    avgCallDurationSec: 92,
    avgResponseTimeMin: 2.8,
    weeklyKpiHistory: [88, 90, 93, 96],
    stageConversions: { enquiryToQualified: 55, qualifiedToBooked: 40, bookedToConfirmed: 26, confirmedToPaid: 11 },
    activeTask: {
      id: 'task-e2-1',
      title: 'Countersign Dual-Approval Booking Sheet for LEAD-004 (Global Tech)',
      leadId: 'LEAD-004',
      leadName: 'Global Tech',
      priority: 'Urgent',
      type: 'Order Approval',
      stage: 'Booked',
      dueIn: '15 mins',
      assignedAt: new Date(Date.now() - 900000)
    },
    taskQueue: [
      {
        id: 'task-e2-2',
        title: 'Reconcile Tally 10% advance receipt ledger for LEAD-001 (Acme Machinery)',
        leadId: 'LEAD-001',
        leadName: 'Acme Machinery',
        priority: 'Normal',
        type: 'Payment Verification',
        stage: 'Confirmed Lead'
      }
    ]
  },
  { 
    id: 'e3', 
    name: 'Aaditya', 
    email: 'aaditya@aps-enterprise.com',
    phone: '+91 98203 33445',
    role: 'Performance & Analytics Specialist', 
    department: 'BI & Lifecycle Analytics',
    kpiScore: '91%',
    kpiScoreNum: 91,
    status: 'Active',
    currentActivity: 'Monitoring Confirmed Lead Dwell SLAs & Bottlenecks',
    tasksCompleted: 41, 
    callsHandled: 64, 
    salesClosed: 6,
    totalRevenue: 195000,
    targetSales: 8,
    conversionRate: '29.5%',
    avgCallDurationSec: 110,
    avgResponseTimeMin: 5.1,
    weeklyKpiHistory: [82, 85, 88, 91],
    stageConversions: { enquiryToQualified: 36, qualifiedToBooked: 22, bookedToConfirmed: 14, confirmedToPaid: 6 },
    activeTask: {
      id: 'task-e3-1',
      title: 'Analyze dwell bottleneck on Confirmed Lead (48.5h dwell time alert)',
      leadId: 'LEAD-004',
      leadName: 'Global Tech',
      priority: 'High',
      type: 'Bottleneck Analytics',
      stage: 'Confirmed Lead',
      dueIn: '35 mins',
      assignedAt: new Date(Date.now() - 2400000)
    },
    taskQueue: [
      {
        id: 'task-e3-2',
        title: 'Audit WhatsApp payment reminder delivery & recovery conversion rate',
        leadId: null,
        leadName: 'Campaign BI',
        priority: 'Normal',
        type: 'A5 BI Report',
        stage: 'Automated Outreach'
      }
    ]
  },
  { 
    id: 'e4', 
    name: 'Vikram Singhal', 
    email: 'vikram.s@aps-enterprise.com',
    phone: '+91 98204 44556',
    role: 'ERP & Factory Dispatch Officer', 
    department: 'Manufacturing & ERP Dispatch',
    kpiScore: '89%',
    kpiScoreNum: 89,
    status: 'Active',
    currentActivity: 'Dispatching Job Card for Manufacturing (Tata Motors)',
    tasksCompleted: 35, 
    callsHandled: 42, 
    salesClosed: 5,
    totalRevenue: 160000,
    targetSales: 8,
    conversionRate: '28.0%',
    avgCallDurationSec: 85,
    avgResponseTimeMin: 6.0,
    weeklyKpiHistory: [80, 83, 86, 89],
    stageConversions: { enquiryToQualified: 30, qualifiedToBooked: 18, bookedToConfirmed: 12, confirmedToPaid: 5 },
    activeTask: {
      id: 'task-e4-1',
      title: 'Generate Production Job Card & ERP Batch #MFG-8821 for Tata Motors Vendor',
      leadId: 'LEAD-003',
      leadName: 'Tata Motors Vendor',
      priority: 'High',
      type: 'ERP Factory Release',
      stage: 'In Production',
      dueIn: '40 mins',
      assignedAt: new Date(Date.now() - 3000000)
    },
    taskQueue: [
      {
        id: 'task-e4-2',
        title: 'Verify raw material allocation for CNC Milling batch',
        leadId: 'LEAD-001',
        leadName: 'Acme Machinery',
        priority: 'Normal',
        type: 'Inventory Allocation',
        stage: 'In Production'
      }
    ]
  }
];

const DEFAULT_TIME_IN_STAGE = [
  { stage: 'Enquiry', avgHours: 1.5, targetSlaHours: 2.0, dealsCount: 14, status: 'Within SLA', healthScore: 98 },
  { stage: 'Qualified', avgHours: 5.2, targetSlaHours: 8.0, dealsCount: 9, status: 'Within SLA', healthScore: 92 },
  { stage: 'Booked', avgHours: 11.4, targetSlaHours: 12.0, dealsCount: 6, status: 'Within SLA', healthScore: 88 },
  { stage: 'Confirmed Lead', avgHours: 48.5, targetSlaHours: 24.0, dealsCount: 4, status: 'Critical Warning', healthScore: 42 },
  { stage: 'Paid / Advance Verified', avgHours: 3.1, targetSlaHours: 6.0, dealsCount: 5, status: 'Within SLA', healthScore: 95 },
  { stage: 'In Production', avgHours: 72.0, targetSlaHours: 96.0, dealsCount: 8, status: 'Within SLA', healthScore: 90 }
];

const DEFAULT_ACTIVITY_LOGS = [
  {
    id: 'log-001',
    employeeName: 'Sneha (Admin)',
    action: 'Completed Task: "Countersign Dual-Approval Booking Sheet"',
    details: 'Auto-assigned next task: "Reconcile Tally 10% advance receipt ledger for Acme Machinery"',
    leadName: 'Global Tech',
    leadId: 'LEAD-004',
    createdAt: new Date(Date.now() - 900000)
  },
  {
    id: 'log-002',
    employeeName: 'Animesh (Voice Lead)',
    action: 'Completed Task: "Outbound telecall follow-up for Reliance Automation"',
    details: 'Logged voice call duration 142s and qualified machine spec requirements.',
    leadName: 'Reliance Automation',
    leadId: 'LEAD-008',
    createdAt: new Date(Date.now() - 2700000)
  },
  {
    id: 'log-003',
    employeeName: 'Aaditya (Analytics)',
    action: 'Dispatched automated WhatsApp payment reminder',
    details: 'Sent template payment_reminder_advance_10pct for ₹4,200 advance to Global Tech',
    leadName: 'Global Tech',
    leadId: 'LEAD-004',
    createdAt: new Date(Date.now() - 3600000)
  }
];

export default function TeamKPIs() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES);
  const [summary, setSummary] = useState(null);
  const [timeInStage, setTimeInStage] = useState(DEFAULT_TIME_IN_STAGE);
  const [timeInStageSummary, setTimeInStageSummary] = useState(null);
  const [activityLogs, setActivityLogs] = useState(DEFAULT_ACTIVITY_LOGS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'timeInStage' | 'comparison' | 'audit'
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [newQueueTaskTitle, setNewQueueTaskTitle] = useState('');
  const [newQueueTaskPriority, setNewQueueTaskPriority] = useState('Normal');

  // Form state for adding member
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Voice Operations Specialist',
    department: 'Voice Operations',
    initialTask: ''
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [empRes, tisRes, actRes] = await Promise.all([
        fetch(`${API}/employees`).catch(() => null),
        fetch(`${API}/activity/time-in-stage`).catch(() => null),
        fetch(`${API}/activity`).catch(() => null)
      ]);

      if (empRes && empRes.ok) {
        const empData = await empRes.json();
        if (empData.employees?.length > 0) setEmployees(empData.employees);
        if (empData.summary) setSummary(empData.summary);
      }
      if (tisRes && tisRes.ok) {
        const tisData = await tisRes.json();
        if (tisData.timeInStage?.length > 0) setTimeInStage(tisData.timeInStage);
        if (tisData.summary) setTimeInStageSummary(tisData.summary);
      }
      if (actRes && actRes.ok) {
        const actData = await actRes.json();
        if (actData.activityLogs?.length > 0) setActivityLogs(actData.activityLogs);
      }
    } catch (err) {
      console.error('Error fetching Team KPI data:', err);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  // Fetch detailed employee profile on select
  const handleSelectEmployee = async (emp) => {
    setSelectedEmployee(emp);
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API}/employees/${emp.id}/performance`);
      const data = await res.json();
      setEmployeeDetails(data);
    } catch (err) {
      console.error('Failed to load employee drill-down:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Complete current active task & auto-assign next task from queue
  const handleCompleteTask = async (empId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API}/employees/${empId}/complete-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Task Completed! Next task auto-assigned to ${data.employee.name}`);
        if (selectedEmployee && selectedEmployee.id === empId) {
          setSelectedEmployee(data.employee);
          if (employeeDetails) {
            setEmployeeDetails(prev => ({
              ...prev,
              profile: data.employee,
              activityLogs: [data.log, ...(prev?.activityLogs || [])]
            }));
          }
        }
        loadData();
      } else {
        showToast(data.error || 'Failed to complete task');
      }
    } catch (err) {
      console.error('Error completing task:', err);
      showToast('Network error while completing task.');
    }
  };

  // Queue a new custom task for an employee
  const handleQueueCustomTask = async (empId, e) => {
    if (e) e.preventDefault();
    if (!newQueueTaskTitle.trim()) return;

    try {
      const res = await fetch(`${API}/employees/${empId}/assign-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newQueueTaskTitle.trim(),
          priority: newQueueTaskPriority
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task queued for ${data.employee.name}!`);
        setNewQueueTaskTitle('');
        if (selectedEmployee && selectedEmployee.id === empId) {
          setSelectedEmployee(data.employee);
          if (employeeDetails) {
            setEmployeeDetails(prev => ({ ...prev, profile: data.employee }));
          }
        }
        loadData();
      }
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    try {
      const res = await fetch(`${API}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Team member "${data.employee.name}" successfully added!`);
        setShowAddModal(false);
        setFormData({ name: '', email: '', phone: '', role: 'Voice Operations Specialist', department: 'Voice Operations', initialTask: '' });
        loadData();
      }
    } catch (err) {
      console.error('Error creating member:', err);
    }
  };


  const handleDeleteEmployee = async (empId, empName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove/delete "${empName}" from the team?`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/employees/${empId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Team member "${empName}" deleted successfully!`);
        if (selectedEmployee?.id === empId) {
          setSelectedEmployee(null);
        }
        loadData();
      } else {
        showToast(data.error || 'Failed to delete member');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      showToast('Network error while deleting member.');
    }
  };

  const handleTriggerReminderFromA4 = async (leadId, leadName) => {
    try {
      const res = await fetch(`${API}/whatsapp/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`WhatsApp Payment Reminder sent to ${leadName}!`);

        loadData();
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
    }
  };


  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'timeInStage') {
      csvContent += 'Stage,Avg Hours Dwell,Target SLA Hours,Deals Count,Status,Health Score\n';
      timeInStage.forEach(s => {
        csvContent += `"${s.stage}","${s.avgHours}","${s.targetSlaHours}","${s.dealsCount}","${s.status}","${s.healthScore}%"\n`;
      });
    } else {
      csvContent += 'Employee ID,Name,Role,Department,KPI Score,Tasks Done,Calls Handled,Sales Closed,Total Revenue,Conversion Rate\n';
      employees.forEach(e => {
        csvContent += `"${e.id}","${e.name}","${e.role}","${e.department}","${e.kpiScore}","${e.tasksCompleted}","${e.callsHandled}","${e.salesClosed}","₹${e.totalRevenue}","${e.conversionRate}"\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APS_Enterprise_${activeTab}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report successfully exported to CSV file.');
  };

  // Filtered and sorted employees by highest KPI score (Leaderboard order)
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
        if (roleFilter === 'ALL') return matchesSearch;
        return matchesSearch && emp.role.toLowerCase().includes(roleFilter.toLowerCase());
      })
      .sort((a, b) => {
        const scoreA = a.kpiScoreNum !== undefined ? a.kpiScoreNum : (parseInt(a.kpiScore) || 0);
        const scoreB = b.kpiScoreNum !== undefined ? b.kpiScoreNum : (parseInt(b.kpiScore) || 0);
        return scoreB - scoreA;
      });
  }, [employees, searchQuery, roleFilter]);

  // Highest KPI score across the team
  const maxKpiScore = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    return Math.max(...employees.map(e => (e.kpiScoreNum !== undefined ? e.kpiScoreNum : (parseInt(e.kpiScore) || 0))));
  }, [employees]);


  if (loading) {
    return (
      <div style={s.centerContainer}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Loading Employee Performance Profiles & Time-in-Stage Analytics…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={s.toast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Employee Performance & Time-in-Stage Profiles</h1>
        </div>
        <div style={s.headerActions}>
          <button onClick={exportCSV} style={s.exportBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report (.CSV)
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-blue-primary" style={s.addBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Team Member
          </button>
        </div>
      </div>

      {/* Top Overview Metric KPI Cards */}
      {summary && (
        <div style={s.kpiGrid}>
          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Team Average KPI Score</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{summary.teamAvgKpiScore}</span>
              <span style={s.kpiTrendBadge}>+3.4% this mo</span>
            </div>
            <div style={s.kpiSub}>Calculated across tasks, velocity & closed revenue</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Total Revenue Closed</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>₹{summary.totalRevenueClosed?.toLocaleString('en-IN')}</span>
              <span style={s.kpiSubTag}>{summary.totalSalesClosed} Total Deals</span>
            </div>
            <div style={s.kpiSub}>Pass rate through Tally 10% advance gate: 100%</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Voice & Telecall Velocity</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{summary.totalCallsHandled} Calls</span>
              <span style={s.kpiSubTag}>Avg 112s</span>
            </div>
            <div style={s.kpiSub}>Voice Agent + human telecalling queue sync</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Bottleneck Alert SLA</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={{ ...s.kpiMainValue, color: '#f59e0b' }}>{summary.bottleneckAlertCount} Stage Alert</span>
              <span style={s.kpiSubTag}>48.5h Dwell</span>
            </div>
            <div style={s.kpiSub}>Confirmed Lead dwell requires WhatsApp payment reminder</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={s.tabsContainer}>
        <div style={s.tabsLeft}>
          {[
            { key: 'leaderboard', label: 'Employee Profiles & Leaderboard', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
            { key: 'timeInStage', label: 'Time-in-Stage & Bottleneck Funnel', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
            { key: 'comparison', label: 'Side-by-Side KPI Comparison', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
            { key: 'audit', label: 'Live Activity Audit Stream', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ ...(activeTab === tab.key ? s.tabActive : s.tabInactive), display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'leaderboard' && (
          <div style={s.filtersRight}>
            <input
              type="text"
              placeholder="Search by name or role…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
            <CustomSelect
              value={roleFilter}
              options={ROLE_OPTIONS}
              onChange={setRoleFilter}
              minWidth={180}
            />
          </div>
        )}
      </div>

      {/* ── TAB 1: LEADERBOARD & EMPLOYEE CARDS ── */}
      {activeTab === 'leaderboard' && (
        <div style={s.employeeGrid}>
          {filteredEmployees.map((emp) => {
            const kpiNum = emp.kpiScoreNum !== undefined ? emp.kpiScoreNum : (parseInt(emp.kpiScore) || 0);
            const isTop = kpiNum === maxKpiScore && maxKpiScore > 0;

            const AVATAR_COLORS = {
              e1: 'linear-gradient(135deg, #2563eb, #1d4ed8)', // Animesh - Sapphire Blue
              e2: 'linear-gradient(135deg, #2563eb, #1d4ed8)', // Bhavya - Sapphire Blue
              e3: 'linear-gradient(135deg, #059669, #047857)', // Aaditya - Emerald Green
              e4: 'linear-gradient(135deg, #7c3aed, #6d28d9)', // Rohan - Violet
              e5: 'linear-gradient(135deg, #d97706, #b45309)'  // Pooja - Amber
            };
            const avatarBg = isTop ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : (AVATAR_COLORS[emp.id] || 'linear-gradient(135deg, #334155, #0f172a)');

            return (
              <div key={emp.id} style={{ ...s.empCard, ...(isTop ? s.empCardTop : {}) }}>
                {isTop && (
                  <div style={s.topRibbon}>
                    #1 TOP PERFORMER
                  </div>
                )}

                <div style={s.empCardHeader}>
                  <div style={s.avatarWrap}>
                    <div style={{ ...s.avatar, background: avatarBg, boxShadow: isTop ? '0 4px 12px rgba(37,99,235,0.3)' : '0 2px 6px rgba(0,0,0,0.1)' }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div style={{ ...s.statusDot, backgroundColor: '#10b981' }} />
                  </div>
                  <div style={s.empInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={s.empName}>{emp.name}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isTop ? '#2563eb' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isTop ? '#2563eb' : '#94a3b8' }}/>
                        {emp.department || 'Operations'}
                      </span>
                    </div>
                    <div style={s.empRole}>{emp.role}</div>
                    <div style={s.empContact}>{emp.email} • {emp.phone}</div>
                  </div>
                  <div style={{ ...s.kpiBadge, backgroundColor: isTop ? '#eff6ff' : '#f8fafc', border: isTop ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isTop ? '#2563eb' : '#09090b', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{emp.kpiScore}</div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: isTop ? '#3b82f6' : '#71717a', letterSpacing: '0.5px', marginTop: 3 }}>KPI SCORE</div>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={s.empCardFooter}>
                  <button
                    onClick={() => handleSelectEmployee(emp)}
                    className="edit-btn-hover"
                    style={{ ...s.viewDetailsBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <span>View Deep Profile & Assigned Pipeline</span>
                    <span style={{ color: '#2563eb', fontWeight: 800 }}>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* ── TAB 2: TIME-IN-STAGE & BOTTLENECK FUNNEL ── */}
      {activeTab === 'timeInStage' && (
        <div style={s.tisSection}>
          <div style={s.alertBanner}>
            <div style={s.alertIconBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 1 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={s.alertContent}>
              <div style={s.alertHeaderRow}>
                <span style={s.alertBadgeTag}>CRITICAL SLA ALERT</span>
                <span style={s.alertTitle}>Pipeline Dwell Time Exceeds SLA in Confirmed Lead</span>
              </div>
              <div style={s.alertDesc}>
                Average duration in <strong style={{ color: '#78350f' }}>Confirmed Lead</strong> is <span style={s.dwellHighlight}>48.5 hours</span> against target SLA of <strong style={{ color: '#78350f' }}>24.0 hours</strong>. High risk of lead decay awaiting customer 10% advance deposit.
              </div>
            </div>
            <button
              onClick={() => handleTriggerReminderFromA4('LEAD-004', 'Global Tech')}
              style={s.alertActionBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Dispatch Payment Reminder Sequence</span>
            </button>
          </div>


          {/* Dwell Funnel Grid */}
          <div style={s.funnelCard}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Pipeline Stage Dwell Time & SLA Adherence</h3>
                <p style={s.sectionSub}>Real-time duration tracking calculated from state transitions in activity logs</p>
              </div>
              <span style={s.slaTargetChip}>Target Total Pipeline Dwell: &lt; 96h to Production</span>
            </div>


            <div style={s.stagesTimeline}>
              {timeInStage.map((st, i) => {
                const isOverSLA = st.avgHours > st.targetSlaHours && st.targetSlaHours > 0;
                return (
                  <div key={st.stage} style={s.stageItem}>
                    <div style={s.stageItemHeader}>
                      <span style={s.stageStepNum}>{i + 1}</span>
                      <span style={s.stageName}>{st.stage}</span>
                      <span
                        style={{
                          ...s.stageStatusTag,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isOverSLA ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                          color: isOverSLA ? '#ef4444' : '#10b981'
                        }}
                      >
                        {isOverSLA ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                        <span>{isOverSLA ? 'SLA Breached' : 'Normal'}</span>
                      </span>
                    </div>

                    <div style={s.stageMetricsRow}>
                      <div style={s.stageMetricBlock}>
                        <span style={s.stageMetricVal}>{st.avgHours} hrs</span>
                        <span style={s.stageMetricLbl}>Actual Avg Dwell</span>
                      </div>
                      <div style={s.stageMetricBlock}>
                        <span style={s.stageMetricVal}>{st.targetSlaHours} hrs</span>
                        <span style={s.stageMetricLbl}>Target SLA</span>
                      </div>
                      <div style={s.stageMetricBlock}>
                        <span style={s.stageMetricVal}>{st.dealsCount}</span>
                        <span style={s.stageMetricLbl}>Active Deals</span>
                      </div>
                    </div>

                    <div style={s.stageBarContainer}>
                      <div
                        style={{
                          ...s.stageBarFill,
                          width: `${Math.min(100, (st.avgHours / (st.targetSlaHours || 24)) * 50)}%`,
                          backgroundColor: isOverSLA ? '#ef4444' : '#6366f1'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stalled Deals Table */}
          <div style={s.stalledDealsCard}>
            <h3 style={s.sectionTitle}>High-Risk / Cold Deals Exceeding Stage Thresholds</h3>
            <p style={s.sectionSub}>Deals at risk of cold-off requiring immediate telecaller outreach or automated WhatsApp sequences</p>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Lead / Customer</th>
                  <th style={s.th}>Current Stage</th>
                  <th style={s.th}>Hours in Dwell</th>
                  <th style={s.th}>Total Deal Value</th>
                  <th style={s.th}>10% Advance Required</th>
                  <th style={s.th}>Assigned Rep</th>
                  <th style={s.th}>Risk Level</th>
                  <th style={s.th}>Automation Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={s.td}>
                    <div style={s.dealName}>Global Tech</div>
                    <div style={s.dealSub}>Hydraulic Press 200T • LEAD-004</div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      Confirmed Lead
                    </span>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#ef4444' }}>58.2 hrs (2.4x SLA)</td>
                  <td style={s.td}>₹42,000</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#09090b' }}>₹4,200</td>
                  <td style={s.td}>Aaditya (Analytics)</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444"><circle cx="12" cy="12" r="10" /></svg>
                      <span>Critical Stalled</span>
                    </span>
                  </td>
                  <td style={s.td}>
                    <button
                      onClick={() => handleTriggerReminderFromA4('LEAD-004', 'Global Tech')}
                      style={{ ...s.sendReminderBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      <span>Send WhatsApp Reminder</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: SIDE-BY-SIDE KPI COMPARISON ── */}

      {
        activeTab === 'comparison' && (
          <div style={s.comparisonCard}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Employee Metric Comparison & Conversion Matrix</h3>
                <p style={s.sectionSub}>Cross-functional evaluation across Voice AI, Admin Operations, and Lifecycle Automation</p>
              </div>
            </div>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Team Member</th>
                  <th style={s.th}>Role & Department</th>
                  <th style={s.th}>KPI Score</th>
                  <th style={s.th}>Tasks Done</th>
                  <th style={s.th}>Calls (Duration)</th>
                  <th style={s.th}>Closed Deals</th>
                  <th style={s.th}>Revenue Generated</th>
                  <th style={s.th}>Conversion Rate</th>
                  <th style={s.th}>Avg Response Time</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={s.trHover}>
                    <td style={s.td}>
                      <div style={s.tableUserRow}>
                        <div style={s.tableAvatar}>{emp.name.charAt(0)}</div>
                        <div>
                          <div style={s.tableUserName}>{emp.name}</div>
                          <div style={s.tableUserEmail}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={s.roleText}>{emp.role}</div>
                      <div style={s.deptText}>{emp.department}</div>
                    </td>
                    <td style={s.td}>
                      <span style={s.kpiScoreChip}>{emp.kpiScore}</span>
                    </td>
                    <td style={s.td}><strong>{emp.tasksCompleted}</strong></td>
                    <td style={s.td}>{emp.callsHandled} ({emp.avgCallDurationSec}s)</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#10b981' }}>{emp.salesClosed}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{(emp.totalRevenue || 0).toLocaleString('en-IN')}</td>
                    <td style={s.td}>{emp.conversionRate || '32%'}</td>
                    <td style={s.td}>{emp.avgResponseTimeMin || 4.0} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* ── TAB 4: LIVE AUDIT ACTIVITY STREAM ── */}
      {
        activeTab === 'audit' && (
          <div style={s.auditCard}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Central Control Cockpit Audit Action Stream</h3>
                <p style={s.sectionSub}>Complete chronological log of all operator actions, state transitions, and integration triggers</p>
              </div>
              <span style={s.liveChip}>● LIVE SYNC</span>
            </div>

            <div style={s.auditTimeline}>
              {activityLogs.map(log => (
                <div key={log.id} style={s.auditItem}>
                  <div style={s.auditDot} />
                  <div style={s.auditBody}>
                    <div style={s.auditHeaderRow}>
                      <span style={s.auditStaff}>{log.employeeName || 'Staff Operator'}</span>
                      <span style={s.auditActionTag}>{log.action}</span>
                      <span style={s.auditTime}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {log.details && <div style={s.auditDetails}>{log.details}</div>}
                    {log.leadName && (
                      <div style={s.auditLeadBadge}>
                        Target Record: <strong>{log.leadName}</strong> ({log.leadId})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* ── MODAL: EMPLOYEE DEEP DRILL-DOWN ── */}
      {
        selectedEmployee && (
          <div style={s.modalOverlay} onClick={() => setSelectedEmployee(null)}>
            <div style={s.modalContent} onClick={e => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <div style={s.modalUserHead}>
                  <div style={{ ...s.modalAvatar, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', color: '#ffffff' }}>
                    {selectedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={s.modalTitle}>{selectedEmployee.name}</h2>
                    <div style={s.modalSub}>{selectedEmployee.role} • <span style={{ color: '#2563eb', fontWeight: 700 }}>{selectedEmployee.department}</span></div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{selectedEmployee.email} • {selectedEmployee.phone}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployee(null)} style={s.closeModalBtn}>✕</button>
              </div>

              {detailsLoading ? (
                <div style={s.modalLoading}>Loading drilldown metrics…</div>
              ) : employeeDetails ? (
                <div style={s.modalBody}>
                  {/* Metric Strip */}
                  <div style={s.drillStatGrid}>
                    <div style={{ ...s.drillStat, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <div style={{ ...s.drillVal, color: '#2563eb' }}>{employeeDetails.metrics.kpiScore}</div>
                      <div style={{ ...s.drillLbl, color: '#3b82f6' }}>KPI Score</div>
                    </div>
                    <div style={{ ...s.drillStat, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                      <div style={{ ...s.drillVal, color: '#059669' }}>₹{(employeeDetails.metrics.totalAssignedPipelineValue || 0).toLocaleString('en-IN')}</div>
                      <div style={{ ...s.drillLbl, color: '#10b981' }}>Assigned Pipeline</div>
                    </div>
                    <div style={{ ...s.drillStat, backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }}>
                      <div style={{ ...s.drillVal, color: '#7c3aed' }}>{employeeDetails.metrics.salesClosed}</div>
                      <div style={{ ...s.drillLbl, color: '#a855f7' }}>Closed Deals</div>
                    </div>
                    <div style={{ ...s.drillStat, backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                      <div style={{ ...s.drillVal, color: '#d97706' }}>₹{(selectedEmployee.totalRevenue || 0).toLocaleString('en-IN')}</div>
                      <div style={{ ...s.drillLbl, color: '#f59e0b' }}>Total Revenue</div>
                    </div>
                    <div style={{ ...s.drillStat, backgroundColor: '#ecfeff', borderColor: '#a5f3fc' }}>
                      <div style={{ ...s.drillVal, color: '#0891b2' }}>{employeeDetails.metrics.conversionRate}</div>
                      <div style={{ ...s.drillLbl, color: '#06b6d4' }}>Conversion Velocity</div>
                    </div>
                  </div>

                  {/* Live Operational Status Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1rem', backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e4e4e7', marginBottom: '1.25rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>Live Operational Activity:</span>
                    <span style={{ fontSize: '0.78rem', color: '#09090b', fontWeight: 700 }}>{selectedEmployee.currentActivity || 'Active on CRM Pipeline Operations'}</span>
                  </div>

                  {/* Smart Task Queue & Auto-Assignment Engine */}
                  <div style={s.modalSection}>
                    <h4 style={s.modalSectionTitle}>Live Task Assignment & Auto-Progression Engine</h4>
                    
                    {/* Active Task Card */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1.5px solid #09090b', padding: '1.2rem 1.4rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, backgroundColor: '#09090b', color: '#ffffff', letterSpacing: '0.4px' }}>
                            CURRENT ACTIVE TASK
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: selectedEmployee.activeTask?.priority === 'Urgent' ? '#fee2e2' : '#fef3c7', color: selectedEmployee.activeTask?.priority === 'Urgent' ? '#dc2626' : '#d97706' }}>
                            {selectedEmployee.activeTask?.priority || 'Normal'} Priority
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 600 }}>
                          Due: {selectedEmployee.activeTask?.dueIn || '30m'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', marginBottom: 6 }}>
                        {selectedEmployee.activeTask?.title || 'Operational lead qualification and pipeline dispatch'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: 12 }}>
                        Linked Lead: <strong>{selectedEmployee.activeTask?.leadName || 'General Pipeline'}</strong> • Stage: <span style={{ color: '#09090b', fontWeight: 600 }}>{selectedEmployee.activeTask?.stage || 'In Progress'}</span>
                      </div>
                      
                      {/* Complete and Auto-Assign Action Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCompleteTask(selectedEmployee.id, e)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Mark Completed & Auto-Assign Next Task →</span>
                      </button>
                    </div>

                    {/* Upcoming Task Queue */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e4e4e7', padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#09090b' }}>
                          Upcoming Task Queue ({selectedEmployee.taskQueue?.length || 0} in line)
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Auto-assigned upon task completion</span>
                      </div>

                      {selectedEmployee.taskQueue?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedEmployee.taskQueue.map((t, idx) => (
                            <div key={t.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e4e4e7' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#71717a' }}>#{idx + 1}</span>
                                <div>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b' }}>{t.title}</div>
                                  <div style={{ fontSize: '0.68rem', color: '#71717a' }}>{t.leadName || 'Pipeline'} • {t.type || 'Task'}</div>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, backgroundColor: '#f4f4f5', color: '#71717a' }}>
                                {t.priority || 'Normal'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#71717a', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          Queue empty. Next task will be dynamically drawn from unassigned pipeline leads.
                        </div>
                      )}

                      {/* Queue new task form */}
                      <form onSubmit={(e) => handleQueueCustomTask(selectedEmployee.id, e)} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <input
                          type="text"
                          placeholder="Queue another task for this employee..."
                          value={newQueueTaskTitle}
                          onChange={e => setNewQueueTaskTitle(e.target.value)}
                          style={{ flex: 1, padding: '7px 12px', fontSize: '0.76rem', borderRadius: 8, border: '1px solid #e4e4e7', outline: 'none' }}
                        />
                        <select
                          value={newQueueTaskPriority}
                          onChange={e => setNewQueueTaskPriority(e.target.value)}
                          style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: 8, border: '1px solid #e4e4e7', backgroundColor: '#ffffff' }}
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                        <button
                          type="submit"
                          style={{ padding: '7px 14px', backgroundColor: '#09090b', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Queue
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Performance Indicators & Conversion Goals */}
                  <div style={s.modalSection}>
                    <h4 style={s.modalSectionTitle}>Target Attainment & Pipeline Goals</h4>


                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Target Attainment ({selectedEmployee.salesClosed || 0} / {selectedEmployee.targetSales || 10} Deals)</span>
                        <span style={{ color: '#2563eb', fontWeight: 800 }}>{Math.round(((selectedEmployee.salesClosed || 0) / (selectedEmployee.targetSales || 10)) * 100)}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#eff6ff', borderRadius: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 10,
                            width: `${Math.min(100, ((selectedEmployee.salesClosed || 0) / (selectedEmployee.targetSales || 10)) * 100)}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Lead Conversion Velocity</span>
                        <span style={{ color: '#047857', fontWeight: 800 }}>{selectedEmployee.conversionRate || '34.5%'}</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#ecfdf5', borderRadius: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 10,
                            width: selectedEmployee.conversionRate || '34.5%',
                            background: 'linear-gradient(90deg, #34d399, #059669)',
                            boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>

                    {/* Call & Response Speed Mini Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.25rem' }}>
                      <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: 10, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>{selectedEmployee.callsHandled || 0}</div>
                        <div style={{ fontSize: '0.66rem', color: '#1d4ed8', fontWeight: 700, marginTop: 2 }}>Calls Handled ({selectedEmployee.avgCallDurationSec || 90}s avg)</div>
                      </div>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: 10, border: '1px solid #a7f3d0', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>{selectedEmployee.tasksCompleted || 0}</div>
                        <div style={{ fontSize: '0.66rem', color: '#047857', fontWeight: 700, marginTop: 2 }}>Tasks Completed</div>
                      </div>
                      <div style={{ backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: 10, border: '1px solid #fde68a', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>{selectedEmployee.avgResponseTimeMin || 3.2}m</div>
                        <div style={{ fontSize: '0.66rem', color: '#b45309', fontWeight: 700, marginTop: 2 }}>Avg Response SLA</div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Week Performance Trajectory Bar Chart */}
                  {selectedEmployee.weeklyKpiHistory && (
                    <div style={s.modalSection}>
                      <h4 style={s.modalSectionTitle}>4-Week Performance Trajectory</h4>
                      <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: '1rem 1.25rem', border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 90, gap: '1.5rem' }}>
                          {selectedEmployee.weeklyKpiHistory.map((val, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>{val}%</span>
                              <div
                                style={{
                                  width: '100%',
                                  maxWidth: 36,
                                  height: `${val * 0.7}px`,
                                  background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
                                  borderRadius: '6px 6px 0 0',
                                  boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
                                  transition: 'height 0.4s ease'
                                }}
                                title={`Week ${idx + 1}: ${val}%`}
                              />
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: 6 }}>Week {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned Pipeline Deals */}
                  <div style={s.modalSection}>
                    <h4 style={s.modalSectionTitle}>Assigned Active Pipeline Deals</h4>
                    {employeeDetails.metrics.pipelineDeals?.length > 0 ? (
                      <div style={s.dealsList}>
                        {employeeDetails.metrics.pipelineDeals.map(d => (
                          <div key={d.id} style={s.dealItemRow}>
                            <div>
                              <div style={s.dealItemName}>{d.name} ({d.id})</div>
                              <div style={s.dealItemSub}>{d.company || 'Direct Buyer'} • ₹{parseFloat(d.budget).toLocaleString('en-IN')}</div>
                            </div>
                            <span style={{ ...s.badge, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>
                              Stage: {d.stage}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={s.emptyDeals}>No currently open deals assigned.</div>
                    )}
                  </div>

                  {/* Recent Operator Actions */}
                  <div style={s.modalSection}>
                    <h4 style={s.modalSectionTitle}>Recent Actions in Operating Layer</h4>
                    <div style={s.miniAuditList}>
                      {employeeDetails.activityLogs?.map(log => (
                        <div key={log.id} style={s.miniAuditItem}>
                          <span style={s.miniAuditAction}>{log.action}</span>
                          <span style={s.miniAuditTime}>
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEmployee(selectedEmployee.id, selectedEmployee.name, e)}
                      style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      <span>Delete / Remove Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(null)}
                      style={s.cancelBtn}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        )
      }


      {/* ── MODAL: ADD TEAM MEMBER ── */}
      {showAddModal && (
        <div style={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={s.modalContentSmall} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Provision New Team Member</h3>
              <button onClick={() => setShowAddModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateMember} style={s.form}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singhal"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={s.formInput}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@aps-enterprise.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={s.formInput}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98000 11223"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={s.formInput}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Role Assignment</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={s.formSelect}
                >
                  <option value="Voice Operations Specialist">Voice Operations Specialist</option>
                  <option value="Admin Cockpit Operator">Admin Cockpit Operator</option>
                  <option value="Performance & Analytics Specialist">Performance & Analytics Specialist</option>
                  <option value="WhatsApp Automation Lead">WhatsApp Automation Lead</option>
                  <option value="Inside Sales & Telecaller">Inside Sales & Telecaller</option>
                  <option value="ERP & Factory Dispatch Officer">ERP & Factory Dispatch Officer</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Department</label>
                <input
                  type="text"
                  placeholder="e.g. Customer Success / Sales"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  style={s.formInput}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Initial Task Assignment (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Follow up on machine requirement & invoice milestone"
                  value={formData.initialTask}
                  onChange={e => setFormData({ ...formData, initialTask: e.target.value })}
                  style={s.formInput}
                />
              </div>

              <div style={s.formActions}>
                <button type="button" onClick={() => setShowAddModal(false)} style={s.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={s.submitBtn}>
                  Save & Provision Member
                </button>
              </div>
            </form>
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
    border: '3px solid #e4e4e7',
    borderTopColor: '#09090b',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    color: '#71717a',
    fontSize: '0.9rem',
    fontWeight: 600
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    backgroundColor: '#09090b',
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
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    borderRadius: 6,
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
    marginBottom: '0.4rem',
    border: '1px solid #e4e4e7'
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
    maxWidth: 680
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: '#fff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.15s'
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    backgroundColor: '#08060d',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
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
    gap: '0.5rem'
  },
  tabActive: {
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#2563eb',
    borderBottom: '2.5px solid #2563eb',
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
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.5rem'
  },
  empCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.25rem 1.4rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  empCardTop: {
    border: '1.5px solid #2563eb',
    boxShadow: '0 4px 16px rgba(37,99,235,0.12)'
  },
  topRibbon: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '2px 10px',
    borderRadius: 14,
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
    letterSpacing: '0.5px'
  },
  empCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    marginBottom: '0.85rem'
  },
  avatarWrap: {
    position: 'relative'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: '50%',
    backgroundColor: '#09090b',
    border: '2px solid #fff'
  },
  empInfo: {
    flex: 1,
    minWidth: 0
  },
  empNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  empName: {
    fontSize: '1.05rem',
    fontWeight: 800,
    fontFamily: 'var(--font-heading)',
    color: '#09090b'
  },
  empDept: {
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    color: '#09090b'
  },
  empRole: {
    fontSize: '0.74rem',
    color: '#52525b',
    fontWeight: 600,
    marginTop: 2
  },
  empContact: {
    fontSize: '0.66rem',
    color: '#71717a',
    marginTop: 2
  },
  kpiBadge: {
    textAlign: 'center',
    backgroundColor: '#f4f4f5',
    border: '1px solid #e4e4e7',
    padding: '6px 12px',
    borderRadius: 12
  },
  kpiBadgeVal: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#09090b',
    fontFamily: 'var(--font-heading)'
  },
  kpiBadgeLbl: {
    fontSize: '0.55rem',
    fontWeight: 800,
    color: '#71717a',
    letterSpacing: '0.5px'
  },
  deleteEmpBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    backgroundColor: '#f4f4f5',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    color: '#71717a',
    fontSize: '0.66rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  statBoxesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.25rem'
  },
  statBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: '0.6rem 0.4rem',
    textAlign: 'center',
    border: '1px solid #e4e4e7'
  },
  statBoxVal: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#09090b'
  },
  statBoxLbl: {
    fontSize: '0.6rem',
    color: '#71717a',
    fontWeight: 600,
    marginTop: 2
  },
  progressSection: {
    marginBottom: '0.85rem'
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    fontWeight: 600,
    marginBottom: 4
  },
  progLabel: {
    color: '#71717a'
  },
  progVal: {
    color: '#09090b',
    fontWeight: 800
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#09090b',
    transition: 'width 0.5s ease'
  },
  trendBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    border: '1px solid #e4e4e7'
  },
  trendLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  sparkBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1rem',
    height: 44
  },
  sparkBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1
  },
  sparkBar: {
    width: '100%',
    maxWidth: 24,
    borderRadius: '4px 4px 0 0',
    backgroundColor: '#09090b',
    transition: 'height 0.4s ease'
  },
  sparkBarLabel: {
    fontSize: '0.6rem',
    color: '#71717a',
    fontWeight: 600,
    marginTop: 3
  },
  empCardFooter: {
    marginTop: 'auto',
    paddingTop: '0.6rem',
    borderTop: '1px solid #f4f4f5'
  },
  viewDetailsBtn: {
    width: '100%',
    padding: '9px 0',
    backgroundColor: '#ffffff',
    color: '#09090b',
    border: '1px solid #e4e4e7',
    borderRadius: 10,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  tisSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem'
  },
  alertBanner: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderLeft: '4px solid #f59e0b',
    borderRadius: 16,
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
    boxShadow: '0 2px 10px rgba(245,158,11,0.06)'
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  alertContent: {
    flex: 1,
    minWidth: 280
  },
  alertHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  alertBadgeTag: {
    fontSize: '0.68rem',
    fontWeight: 800,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
    padding: '2px 8px',
    borderRadius: 6,
    letterSpacing: '0.5px'
  },
  alertTitle: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#78350f',
    fontFamily: 'var(--font-heading)'
  },
  alertDesc: {
    fontSize: '0.8rem',
    color: '#92400e',
    marginTop: 2,
    lineHeight: 1.45
  },
  dwellHighlight: {
    color: '#78350f',
    fontWeight: 800,
    backgroundColor: '#fef3c7',
    padding: '1px 6px',
    borderRadius: 4
  },
  alertActionBtn: {
    padding: '10px 18px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    transition: 'all 0.2s ease'
  },

  funnelCard: {
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
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.75rem'
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
  slaTargetChip: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '4px 12px',
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    borderRadius: 20
  },
  stagesTimeline: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem'
  },
  stageItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: '1.2rem',
    border: '1px solid #e4e4e7'
  },
  stageItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.85rem'
  },
  stageStepNum: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#09090b',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stageName: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: '#09090b',
    flex: 1
  },
  stageStatusTag: {
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 12
  },
  stageMetricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  stageMetricBlock: {
    display: 'flex',
    flexDirection: 'column'
  },
  stageMetricVal: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#09090b'
  },
  stageMetricLbl: {
    fontSize: '0.6rem',
    color: '#71717a',
    fontWeight: 600
  },
  stageBarContainer: {
    height: 6,
    backgroundColor: '#e4e4e7',
    borderRadius: 10,
    overflow: 'hidden'
  },
  stageBarFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#09090b'
  },
  stalledDealsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  comparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  auditCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  liveChip: {
    fontSize: '0.68rem',
    fontWeight: 800,
    padding: '3px 10px',
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    borderRadius: 20
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
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
  dealName: {
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#09090b'
  },
  dealSub: {
    fontSize: '0.7rem',
    color: '#71717a',
    marginTop: 1
  },
  badge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    display: 'inline-block'
  },
  sendReminderBtn: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
  },
  tableUserRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem'
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#09090b',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableUserName: {
    fontWeight: 800,
    fontSize: '0.85rem',
    color: '#09090b'
  },
  tableUserEmail: {
    fontSize: '0.68rem',
    color: '#71717a'
  },
  roleText: {
    fontWeight: 600,
    fontSize: '0.8rem',
    color: '#52525b'
  },
  deptText: {
    fontSize: '0.68rem',
    color: '#71717a'
  },
  kpiScoreChip: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#f4f4f5',
    color: '#09090b',
    fontWeight: 800,
    borderRadius: 12,
    fontSize: '0.78rem'
  },
  auditTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem'
  },
  auditItem: {
    display: 'flex',
    gap: '1rem',
    padding: '0.85rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    border: '1px solid #e4e4e7'
  },
  auditDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#09090b',
    marginTop: 5,
    flexShrink: 0
  },
  auditBody: {
    flex: 1
  },
  auditHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  auditStaff: {
    fontWeight: 800,
    fontSize: '0.82rem',
    color: '#08060d'
  },
  auditActionTag: {
    fontSize: '0.78rem',
    color: '#334155',
    flex: 1
  },
  auditTime: {
    fontSize: '0.68rem',
    color: '#94a3b8'
  },
  auditDetails: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginTop: 4
  },
  auditLeadBadge: {
    fontSize: '0.68rem',
    color: '#475569',
    marginTop: 4,
    backgroundColor: '#fff',
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-block',
    border: '1px solid #e2e8f0'
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
    maxWidth: 780,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
  },
  modalContentSmall: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1rem',
    marginBottom: '1.5rem'
  },
  modalUserHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  modalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#09090b',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#08060d',
    margin: 0,
    fontFamily: 'var(--font-heading)'
  },
  modalSub: {
    fontSize: '0.74rem',
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
  modalLoading: {
    padding: '3rem',
    textAlign: 'center',
    color: '#64748b'
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  drillStatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: '0.65rem'
  },
  drillStat: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: '0.75rem 0.4rem',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  drillVal: {
    fontSize: '0.92rem',
    fontWeight: 800,
    color: '#08060d',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    lineHeight: 1.2,
    letterSpacing: '-0.3px'
  },
  drillLbl: {
    fontSize: '0.66rem',
    color: '#64748b',
    fontWeight: 700,
    marginTop: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%'
  },
  modalSection: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1.25rem'
  },
  modalSectionTitle: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: '#08060d',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-heading)'
  },
  dealsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem'
  },
  dealItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e2e8f0'
  },
  dealItemName: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: '#08060d'
  },
  dealItemSub: {
    fontSize: '0.68rem',
    color: '#64748b',
    marginTop: 1
  },
  emptyDeals: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  miniAuditList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  miniAuditItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    fontSize: '0.72rem'
  },
  miniAuditAction: {
    color: '#334155',
    fontWeight: 500
  },
  miniAuditTime: {
    color: '#94a3b8'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
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
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '8px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
  }
};
