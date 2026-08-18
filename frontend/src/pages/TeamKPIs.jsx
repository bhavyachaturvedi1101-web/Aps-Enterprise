import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function TeamKPIs() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [timeInStage, setTimeInStage] = useState([]);
  const [timeInStageSummary, setTimeInStageSummary] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'timeInStage' | 'comparison' | 'audit'
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form state for adding member
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'A1 Voice Operations Spec',
    department: 'Voice Operations'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, tisRes, actRes] = await Promise.all([
        fetch(`${API}/employees`),
        fetch(`${API}/activity/time-in-stage`),
        fetch(`${API}/activity`)
      ]);

      const empData = await empRes.json();
      const tisData = await tisRes.json();
      const actData = await actRes.json();

      setEmployees(empData.employees || []);
      setSummary(empData.summary || null);
      setTimeInStage(tisData.timeInStage || []);
      setTimeInStageSummary(tisData.summary || null);
      setActivityLogs(actData.activityLogs || []);
    } catch (err) {
      console.error('Error loading A4 performance data:', err);
    } finally {
      setLoading(false);
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
        setFormData({ name: '', email: '', phone: '', role: 'A1 Voice Operations Spec', department: 'Voice Operations' });
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
        showToast(`A5 WhatsApp Payment Reminder sent to ${leadName}!`);
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
    link.setAttribute('download', `APS_Enterprise_A4_${activeTab}_Report.csv`);
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
        <div style={s.loadingText}>Loading A4 Employee Performance Profiles & Time-in-Stage Analytics…</div>
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
          <div style={s.badgeModule}>MODULE A4 • ENTERPRISE ANALYTICS</div>
          <h1 style={s.title}>Employee Performance & Time-in-Stage Profiles</h1>
          <p style={s.subtitle}>
            Data-driven performance tracking, pipeline dwell velocity, and bottleneck mitigation built on A2 activity logs.
          </p>
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
          <button onClick={() => setShowAddModal(true)} style={s.addBtn}>
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
              <span style={{ ...s.kpiIconWrap, background: 'rgba(170,59,255,0.12)', color: '#aa3bff' }}>🏆</span>
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
              <span style={{ ...s.kpiIconWrap, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>💰</span>
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
              <span style={{ ...s.kpiIconWrap, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>📞</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{summary.totalCallsHandled} Calls</span>
              <span style={s.kpiSubTag}>Avg 112s</span>
            </div>
            <div style={s.kpiSub}>A1 Voice Agent + human telecalling queue sync</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiTop}>
              <span style={s.kpiLabel}>Critical SLA Adherence</span>
              <span style={{ ...s.kpiIconWrap, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>⏱️</span>
            </div>
            <div style={s.kpiValueRow}>
              <span style={s.kpiMainValue}>{summary.slaAdherenceRate}</span>
              <span style={{ ...s.kpiTrendBadge, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                1 Stage Warning
              </span>
            </div>
            <div style={s.kpiSub}>Confirmed Lead dwell requires A5 payment reminder</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={s.tabsContainer}>
        <div style={s.tabsLeft}>
          {[
            { key: 'leaderboard', label: '👑 Employee Profiles & Leaderboard' },
            { key: 'timeInStage', label: '⏳ Time-in-Stage & Bottleneck Funnel' },
            { key: 'comparison', label: '📊 Side-by-Side KPI Comparison' },
            { key: 'audit', label: '📜 Live A2 Audit Action Stream' }
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

        {activeTab === 'leaderboard' && (
          <div style={s.filtersRight}>
            <input
              type="text"
              placeholder="Search by name or role…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={s.selectFilter}
            >
              <option value="ALL">All Roles</option>
              <option value="Voice">Voice / Telecaller</option>
              <option value="Architect">A2 Architect</option>
              <option value="Analytics">A4/A5 Specialist</option>
              <option value="ERP">ERP / Dispatch</option>
            </select>
          </div>
        )}
      </div>

      {/* ── TAB 1: LEADERBOARD & EMPLOYEE CARDS ── */}
      {activeTab === 'leaderboard' && (
        <div style={s.employeeGrid}>
          {filteredEmployees.map((emp) => {
            const kpiNum = emp.kpiScoreNum !== undefined ? emp.kpiScoreNum : (parseInt(emp.kpiScore) || 0);
            const isTop = kpiNum === maxKpiScore && maxKpiScore > 0;
            return (
              <div key={emp.id} style={{ ...s.empCard, ...(isTop ? s.empCardTop : {}) }}>
                {isTop && (
                  <div style={s.topRibbon}>
                    <span>⭐ TOP PERFORMER</span>
                  </div>
                )}


                <div style={s.empCardHeader}>
                  <div style={s.avatarWrap}>
                    <div style={s.avatar}>{emp.name.charAt(0)}</div>
                    <div style={s.statusDot} />
                  </div>
                  <div style={s.empInfo}>
                    <div style={s.empNameRow}>
                      <span style={s.empName}>{emp.name}</span>
                      <span style={s.empDept}>{emp.department || 'Operations'}</span>
                    </div>
                    <div style={s.empRole}>{emp.role}</div>
                    <div style={s.empContact}>{emp.email} • {emp.phone}</div>
                  </div>
                  <div style={s.kpiBadge}>
                    <div style={s.kpiBadgeVal}>{emp.kpiScore}</div>
                    <div style={s.kpiBadgeLbl}>KPI SCORE</div>
                  </div>
                </div>



                {/* Performance Stat Blocks */}
                <div style={s.statBoxesRow}>
                  <div style={s.statBox}>
                    <div style={{ ...s.statBoxVal, color: '#aa3bff' }}>{emp.tasksCompleted}</div>
                    <div style={s.statBoxLbl}>Tasks Done</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={{ ...s.statBoxVal, color: '#3b82f6' }}>{emp.callsHandled}</div>
                    <div style={s.statBoxLbl}>Calls (Avg {emp.avgCallDurationSec}s)</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={{ ...s.statBoxVal, color: '#10b981' }}>{emp.salesClosed}</div>
                    <div style={s.statBoxLbl}>Deals Closed</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={{ ...s.statBoxVal, color: '#0f172a' }}>₹{(emp.totalRevenue || 0).toLocaleString('en-IN')}</div>
                    <div style={s.statBoxLbl}>Revenue</div>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div style={s.progressSection}>
                  <div style={s.progressRow}>
                    <span style={s.progLabel}>Target Attainment ({emp.salesClosed} / {emp.targetSales || 10} Deals)</span>
                    <span style={s.progVal}>{Math.round(((emp.salesClosed || 0) / (emp.targetSales || 10)) * 100)}%</span>
                  </div>
                  <div style={s.progressBarBg}>
                    <div
                      style={{
                        ...s.progressBarFill,
                        width: `${Math.min(100, ((emp.salesClosed || 0) / (emp.targetSales || 10)) * 100)}%`,
                        background: 'linear-gradient(90deg, #aa3bff, #6366f1)'
                      }}
                    />
                  </div>
                </div>

                <div style={s.progressSection}>
                  <div style={s.progressRow}>
                    <span style={s.progLabel}>Lead Conversion Velocity</span>
                    <span style={s.progVal}>{emp.conversionRate || '34.5%'}</span>
                  </div>
                  <div style={s.progressBarBg}>
                    <div
                      style={{
                        ...s.progressBarFill,
                        width: emp.conversionRate || '34.5%',
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)'
                      }}
                    />
                  </div>
                </div>

                {/* Weekly Trend Mini Graph Bars */}
                {emp.weeklyKpiHistory && (
                  <div style={s.trendBox}>
                    <div style={s.trendLabel}>4-Week Performance Trajectory</div>
                    <div style={s.sparkBars}>
                      {emp.weeklyKpiHistory.map((val, idx) => (
                        <div key={idx} style={s.sparkBarCol}>
                          <div style={{ ...s.sparkBar, height: `${val * 0.4}px` }} title={`W${idx + 1}: ${val}%`} />
                          <span style={s.sparkBarLabel}>W{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Action */}
                <div style={s.empCardFooter}>
                  <button
                    onClick={() => handleSelectEmployee(emp)}
                    style={s.viewDetailsBtn}
                  >
                    View Deep Profile & Assigned Pipeline →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: TIME-IN-STAGE & BOTTLENECK FUNNEL (A4 CORE) ── */}
      {activeTab === 'timeInStage' && (
        <div style={s.tisSection}>
          {/* Critical Warning Alert Banner */}
          <div style={s.alertBanner}>
            <div style={s.alertIcon}>⚠️</div>
            <div style={s.alertContent}>
              <div style={s.alertTitle}>Pipeline Dwell Alert: Confirmed Lead Stage Dwell Time Exceeds SLA</div>
              <div style={s.alertDesc}>
                Average time in <strong>Confirmed Lead</strong> is <strong>48.5 hours</strong> against target SLA of <strong>24.0 hours</strong>. Deals are going cold while waiting for customer 10% advance deposit to clear Tally payment gate before factory release.
              </div>
            </div>
            <button
              onClick={() => handleTriggerReminderFromA4('LEAD-004', 'Global Tech')}
              style={s.alertActionBtn}
            >
              Dispatch A5 Payment Reminder Sequence ⚡
            </button>
          </div>

          {/* Dwell Funnel Grid */}
          <div style={s.funnelCard}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Pipeline Stage Dwell Time & SLA Adherence</h3>
                <p style={s.sectionSub}>Real-time duration tracking calculated from state transitions in A2 activity logs</p>
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
                          backgroundColor: isOverSLA ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                          color: isOverSLA ? '#ef4444' : '#10b981'
                        }}
                      >
                        {isOverSLA ? '⚠️ SLA Breached' : '✓ Normal'}
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
                  <th style={s.th}>A5 Action</th>
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
                  <td style={{ ...s.td, fontWeight: 700, color: '#aa3bff' }}>₹4,200</td>
                  <td style={s.td}>Aaditya (A4/A5)</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      🔴 Critical Stalled
                    </span>
                  </td>
                  <td style={s.td}>
                    <button
                      onClick={() => handleTriggerReminderFromA4('LEAD-004', 'Global Tech')}
                      style={s.sendReminderBtn}
                    >
                      💬 Send WhatsApp Reminder
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: SIDE-BY-SIDE KPI COMPARISON ── */}
      {activeTab === 'comparison' && (
        <div style={s.comparisonCard}>
          <div style={s.sectionHeader}>
            <div>
              <h3 style={s.sectionTitle}>Employee Metric Comparison & Conversion Matrix</h3>
              <p style={s.sectionSub}>Cross-functional evaluation across Voice (A1), Admin Core (A2), and Automation (A4/A5)</p>
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
      )}

      {/* ── TAB 4: LIVE AUDIT ACTIVITY STREAM ── */}
      {activeTab === 'audit' && (
        <div style={s.auditCard}>
          <div style={s.sectionHeader}>
            <div>
              <h3 style={s.sectionTitle}>A2 Control Cockpit Audit Action Stream</h3>
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
      )}

      {/* ── MODAL: EMPLOYEE DEEP DRILL-DOWN ── */}
      {selectedEmployee && (
        <div style={s.modalOverlay} onClick={() => setSelectedEmployee(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalUserHead}>
                <div style={s.modalAvatar}>{selectedEmployee.name.charAt(0)}</div>
                <div>
                  <h2 style={s.modalTitle}>{selectedEmployee.name}</h2>
                  <div style={s.modalSub}>{selectedEmployee.role} • {selectedEmployee.department}</div>
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
                  <div style={s.drillStat}>
                    <div style={s.drillVal}>{employeeDetails.metrics.kpiScore}</div>
                    <div style={s.drillLbl}>KPI Score</div>
                  </div>
                  <div style={s.drillStat}>
                    <div style={s.drillVal}>₹{(employeeDetails.metrics.totalAssignedPipelineValue || 0).toLocaleString('en-IN')}</div>
                    <div style={s.drillLbl}>Assigned Pipeline</div>
                  </div>
                  <div style={s.drillStat}>
                    <div style={s.drillVal}>{employeeDetails.metrics.salesClosed}</div>
                    <div style={s.drillLbl}>Closed Deals</div>
                  </div>
                  <div style={s.drillStat}>
                    <div style={s.drillVal}>{employeeDetails.metrics.conversionRate}</div>
                    <div style={s.drillLbl}>Conversion Velocity</div>
                  </div>
                </div>

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
                  <h4 style={s.modalSectionTitle}>Recent Actions in A2 Operating Layer</h4>
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
                    style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🗑️ Delete / Remove Member
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
      )}


      {/* ── MODAL: ADD TEAM MEMBER ── */}
      {showAddModal && (
        <div style={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={s.modalContentSmall} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Provision New Team Member (A4)</h3>
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
                <label style={s.formLabel}>Role & Module Assignment</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={s.formSelect}
                >
                  <option value="A1 Voice Operations Spec">A1 Voice Operations Spec</option>
                  <option value="A2 Admin Cockpit Operator">A2 Admin Cockpit Operator</option>
                  <option value="A4 Analytics Specialist">A4 Analytics Specialist</option>
                  <option value="A5 WhatsApp Automation Lead">A5 WhatsApp Automation Lead</option>
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
    border: '3px solid #e2e8f0',
    borderTopColor: '#aa3bff',
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
    backgroundColor: 'rgba(170,59,255,0.1)',
    color: '#aa3bff',
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
    backgroundColor: 'rgba(16,185,129,0.12)',
    color: '#10b981'
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
    gap: '0.5rem'
  },
  tabActive: {
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#08060d',
    borderBottom: '2.5px solid #aa3bff',
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
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.5rem'
  },
  empCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  empCardTop: {
    border: '1.5px solid #aa3bff',
    boxShadow: '0 8px 25px rgba(170,59,255,0.08)'
  },
  topRibbon: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#aa3bff',
    color: '#fff',
    fontSize: '0.62rem',
    fontWeight: 800,
    padding: '3px 10px',
    borderRadius: 20,
    boxShadow: '0 3px 8px rgba(170,59,255,0.4)'
  },
  empCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    marginBottom: '1.25rem'
  },
  avatarWrap: {
    position: 'relative'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #aa3bff, #6366f1)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: '50%',
    backgroundColor: '#10b981',
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
    color: '#08060d'
  },
  empDept: {
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  empRole: {
    fontSize: '0.74rem',
    color: '#64748b',
    fontWeight: 600,
    marginTop: 2
  },
  empContact: {
    fontSize: '0.66rem',
    color: '#94a3b8',
    marginTop: 2
  },
  kpiBadge: {
    textAlign: 'center',
    backgroundColor: 'rgba(170,59,255,0.07)',
    border: '1px solid rgba(170,59,255,0.2)',
    padding: '6px 12px',
    borderRadius: 12
  },
  kpiBadgeVal: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#aa3bff',
    fontFamily: 'var(--font-heading)'
  },
  kpiBadgeLbl: {
    fontSize: '0.55rem',
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.5px'
  },
  deleteEmpBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    color: '#ef4444',
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
    border: '1px solid #f1f5f9'
  },
  statBoxVal: {
    fontSize: '0.95rem',
    fontWeight: 800
  },
  statBoxLbl: {
    fontSize: '0.6rem',
    color: '#64748b',
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
    color: '#64748b'
  },
  progVal: {
    color: '#08060d',
    fontWeight: 800
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    transition: 'width 0.5s ease'
  },
  trendBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    border: '1px solid #e2e8f0'
  },
  trendLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#64748b',
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
    backgroundColor: '#6366f1',
    transition: 'height 0.4s ease'
  },
  sparkBarLabel: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    fontWeight: 600,
    marginTop: 3
  },
  empCardFooter: {
    marginTop: 'auto',
    paddingTop: '0.75rem',
    borderTop: '1px solid #f1f5f9'
  },
  viewDetailsBtn: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: 'transparent',
    color: '#aa3bff',
    border: '1px solid rgba(170,59,255,0.3)',
    borderRadius: 8,
    fontSize: '0.76rem',
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
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 16,
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap'
  },
  alertIcon: {
    fontSize: '1.75rem'
  },
  alertContent: {
    flex: 1,
    minWidth: 280
  },
  alertTitle: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#9a3412',
    fontFamily: 'var(--font-heading)'
  },
  alertDesc: {
    fontSize: '0.78rem',
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 1.4
  },
  alertActionBtn: {
    padding: '9px 18px',
    backgroundColor: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(234,88,12,0.3)'
  },
  funnelCard: {
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
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.75rem'
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
  slaTargetChip: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '4px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
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
    border: '1px solid #e2e8f0'
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
    backgroundColor: '#08060d',
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
    color: '#08060d',
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
    color: '#08060d'
  },
  stageMetricLbl: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    fontWeight: 600
  },
  stageBarContainer: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden'
  },
  stageBarFill: {
    height: '100%',
    borderRadius: 10
  },
  stalledDealsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  comparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  auditCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  liveChip: {
    fontSize: '0.68rem',
    fontWeight: 800,
    padding: '3px 10px',
    backgroundColor: 'rgba(16,185,129,0.12)',
    color: '#10b981',
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
  dealName: {
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  dealSub: {
    fontSize: '0.7rem',
    color: '#64748b',
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
    backgroundColor: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(37,211,102,0.3)'
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
    backgroundColor: '#aa3bff',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableUserName: {
    fontWeight: 800,
    fontSize: '0.85rem'
  },
  tableUserEmail: {
    fontSize: '0.68rem',
    color: '#64748b'
  },
  roleText: {
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  deptText: {
    fontSize: '0.68rem',
    color: '#94a3b8'
  },
  kpiScoreChip: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: 'rgba(170,59,255,0.1)',
    color: '#aa3bff',
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
    border: '1px solid #f1f5f9'
  },
  auditDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#aa3bff',
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
    maxWidth: 680,
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
    background: 'linear-gradient(135deg, #aa3bff, #6366f1)',
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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem'
  },
  drillStat: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: '0.85rem',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  drillVal: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#08060d'
  },
  drillLbl: {
    fontSize: '0.62rem',
    color: '#64748b',
    fontWeight: 600,
    marginTop: 2
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
    backgroundColor: '#08060d',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
