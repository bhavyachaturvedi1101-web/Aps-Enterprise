import React, { useState, useEffect, useRef } from 'react';
import { MOCK_BOOKINGS } from '../mockData';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const STATUS_STYLES = {
  'Booking Created': { color: '#1d4ed8', dot: '#3b82f6' },
  'Confirmed':       { color: '#047857', dot: '#10b981' },
  'Factory Released':{ color: '#7c3aed', dot: '#a855f7' },
  'In Production':   { color: '#4338ca', dot: '#6366f1' },
  'Dispatched':      { color: '#b45309', dot: '#f59e0b' }
};

const mapStageToStatus = (stage) => {
  switch (stage) {
    case 'Booked': return 'Booking Created';
    case 'Confirmed Lead': return 'Confirmed';
    case 'Client (Paid)': return 'Factory Released';
    case 'In Production': return 'In Production';
    case 'Dispatched': return 'Dispatched';
    default: return 'Booking Created';
  }
};

// Custom Enterprise Select Component
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

export default function BookingsERP() {
  const [bookings, setBookings] = useState(MOCK_BOOKINGS.map((b,i) => ({ id: `BK${String(i+1).padStart(3,'0')}`, client: b.clientName, product: b.product, erpRef: b.erpRef, status: b.status, date: new Date(b.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}), amount: `₹${b.amount.toLocaleString('en-IN')}`, rawAmount: b.amount })));
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('Newest First');

  useEffect(() => {
    fetch(`${API}/leads`)
      .then(r => r.json())
      .then(d => {
        const activeLeads = d.leads || [];
        const erpLeads = activeLeads.filter(l => 
          ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)
        );
        
        const mappedBookings = erpLeads.map((l, index) => ({
          id: `BK${String(index + 1).padStart(3, '0')}`,
          client: l.name,
          product: l.interest,
          erpRef: `ERP-2026-${1000 + parseInt(l.id ? l.id.replace('LEAD-', '') : index)}`,
          status: mapStageToStatus(l.stage),
          date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 Aug 2026',
          amount: `₹${parseFloat(l.budget || 0).toLocaleString('en-IN')}`,
          rawAmount: parseFloat(l.budget) || 0
        }));
        
        setBookings(mappedBookings);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredBookings = bookings
    .filter(b => {
      const q = search.toLowerCase().trim();
      const matchQuery = !q ||
        b.id.toLowerCase().includes(q) ||
        b.client.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q) ||
        b.erpRef.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'All Statuses' || b.status === statusFilter;
      return matchQuery && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'Client (A-Z)') return a.client.localeCompare(b.client);
      if (sortBy === 'Amount (High-Low)') return b.rawAmount - a.rawAmount;
      if (sortBy === 'Amount (Low-High)') return a.rawAmount - b.rawAmount;
      return 0;
    });

  const hasActiveFilters = search || statusFilter !== 'All Statuses' || sortBy !== 'Newest First';

  if (loading) {
    return <div style={s.loading}>Loading ERP bookings…</div>;
  }

  const factoryCount = bookings.filter(b => ['Factory Released', 'In Production', 'Dispatched'].includes(b.status)).length;
  const pendingCount = bookings.filter(b => b.status === 'Booking Created').length;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Bookings & ERP</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ padding: '4px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.73rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}/>
              {bookings.length} Total Bookings
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 6, background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.73rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}/>
              {factoryCount} Released to Factory
            </div>
          </div>
        </div>
      </div>

      {/* Clean Borderless Stat Cards */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}>
          <div style={{ ...s.statNum, color: '#1d4ed8' }}>{bookings.length}</div>
          <div style={s.statLbl}>Total Active Bookings</div>
        </div>

        <div style={{ ...s.statCard, background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' }}>
          <div style={{ ...s.statNum, color: '#047857' }}>{factoryCount}</div>
          <div style={s.statLbl}>Factory Released & Production</div>
        </div>

        <div style={{ ...s.statCard, background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}>
          <div style={{ ...s.statNum, color: '#b45309' }}>{pendingCount}</div>
          <div style={s.statLbl}>Pending Factory Confirm</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search booking ID, client, product, ERP ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={s.clearSearchBtn}>✕</button>
          )}
        </div>

        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Status:</label>
          <CustomSelect
            value={statusFilter}
            options={['All Statuses', 'Booking Created', 'Confirmed', 'Factory Released', 'In Production', 'Dispatched']}
            onChange={val => setStatusFilter(val)}
            minWidth={140}
          />
        </div>

        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Sort by:</label>
          <CustomSelect
            value={sortBy}
            options={['Newest First', 'Client (A-Z)', 'Amount (High-Low)', 'Amount (Low-High)']}
            onChange={val => setSortBy(val)}
            minWidth={150}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('All Statuses');
              setSortBy('Newest First');
            }}
            className="btn-red-reset"
            style={s.resetBtn}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Table Card */}
      <div style={s.card}>
        <div style={s.tableHead}>
          {['Booking ID', 'Client', 'Product', 'ERP Reference', 'Date', 'Amount', 'Status'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {filteredBookings.map(b => {
          const sStyle = STATUS_STYLES[b.status] || { color: '#64748b', dot: '#94a3b8' };
          return (
            <div key={b.id} className="table-row-hover" style={s.row}>
              <div style={{ ...s.td, fontWeight: 700, color: '#09090b' }}>{b.id}</div>
              <div style={{ ...s.td, fontWeight: 700, color: '#09090b' }}>{b.client}</div>
              <div style={s.td}>{b.product}</div>
              <div style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.72rem', color: '#52525b', fontWeight: 600 }}>{b.erpRef}</div>
              <div style={{ ...s.td, color: '#71717a', fontSize: '0.75rem' }}>{b.date}</div>
              <div style={{ ...s.td, fontWeight: 800, color: '#09090b' }}>{b.amount}</div>
              <div style={s.td}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sStyle.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sStyle.dot }}/>
                  {b.status}
                </span>
              </div>
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
            No bookings found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  loading: { padding: '3rem', textAlign: 'center', color: '#71717a' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.25rem' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e4e4e7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  statNum: { fontSize: '1.8rem', fontWeight: 800 },
  statLbl: { fontSize: '0.72rem', color: '#71717a', fontWeight: 700, marginTop: 4 },

  // Toolbar
  toolbar: { display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, padding: '0.45rem 0.75rem', flex: '1 1 240px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#09090b', fontFamily: 'var(--font-body)', fontWeight: 500, backgroundColor: 'transparent' },
  clearSearchBtn: { border: 'none', background: 'transparent', color: '#71717a', fontSize: '0.8rem', cursor: 'pointer', padding: 0 },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  filterLabel: { fontSize: '0.73rem', fontWeight: 700, color: '#71717a' },
  resetBtn: { padding: '0.45rem 0.85rem', borderRadius: 8, border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)', transition: 'all 0.15s ease' },

  card: { backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e4e4e7', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  row: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#3f3f46' }
};
