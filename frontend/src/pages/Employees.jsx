import React from 'react';

const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'Animesh', role: 'Voice AI & Sales Lead', tasksCompleted: 14, callsHandled: 124, salesClosed: 8, kpiScore: '92%' },
  { id: 'e2', name: 'Bhavya', role: 'Systems Architect & Admin', tasksCompleted: 18, callsHandled: 0, salesClosed: 12, kpiScore: '96%' },
  { id: 'e3', name: 'Aaditya', role: 'Analytics & Automation Specialist', tasksCompleted: 11, callsHandled: 15, salesClosed: 5, kpiScore: '89%' }
];

export default function Employees() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Employee Performance Profiles</h1>

      <p style={styles.subtitle}>Track activity, closed bookings, and system metrics by employee</p>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee Name</th>
              <th style={styles.th}>Role / Focus</th>
              <th style={styles.th}>Tasks Completed</th>
              <th style={styles.th}>Calls Handled</th>
              <th style={styles.th}>Sales Closed</th>
              <th style={styles.th}>KPI Score</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EMPLOYEES.map((emp) => (
              <tr key={emp.id} style={styles.tr}>
                <td style={styles.td}><strong>{emp.name}</strong></td>
                <td style={styles.td}>{emp.role}</td>
                <td style={styles.td}>{emp.tasksCompleted}</td>
                <td style={styles.td}>{emp.callsHandled}</td>
                <td style={styles.td}>{emp.salesClosed}</td>
                <td style={{ ...styles.td, color: '#aa3bff', fontWeight: '800' }}>{emp.kpiScore}</td>
              </tr>
            ))}
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
