import React, { useState, useEffect } from 'react';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? 'http://localhost:5000/api' : '/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/employees`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Employee Performance Profiles</h1>
      <p style={styles.subtitle}>Real-time performance metrics and active task load of system members.</p>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee Name</th>
              <th style={styles.th}>Role / Focus</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Tasks Completed</th>
              <th style={styles.th}>Calls Handled</th>
              <th style={styles.th}>Sales Closed</th>
              <th style={styles.th}>KPI Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Loading employee records...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No employees configured yet. Add members via Users & Roles.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="table-row-hover" style={styles.tr}>
                  <td style={styles.td}><strong>{emp.name}</strong></td>
                  <td style={styles.td}>{emp.role || 'Staff'}</td>
                  <td style={styles.td}>{emp.department || 'Operations'}</td>
                  <td style={styles.td}>{emp.tasksCompleted || 0}</td>
                  <td style={styles.td}>{emp.callsHandled || 0}</td>
                  <td style={styles.td}>{emp.salesClosed || 0}</td>
                  <td style={styles.td}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 800, padding: '3px 10px', borderRadius: 12, fontSize: '0.78rem', display: 'inline-block' }}>
                      {emp.kpiScore || '100%'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2.5rem',
    color: '#0f172a',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    margin: 0
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
    marginBottom: '2rem'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: 'var(--shadow-md)',
    padding: '2rem',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    borderBottom: '2px solid #f1f3f7',
    padding: '1rem',
    color: 'var(--text-secondary)',
    fontWeight: '700',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '1.25rem 1rem',
    borderBottom: '1px solid #f1f3f7',
    color: '#0f172a',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  tr: {
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  }
};
