import React, { useState } from 'react';

const MOCK_CALLS = [
  { id: 'C001', name: 'Agarwal Packaging', phone: '+91 98765 43210', product: 'Double Die Paper Plate Machine', status: 'Queued', priority: 'High', agent: 'Voice AI' },
  { id: 'C002', name: 'Sharma Paper Cups', phone: '+91 87654 32109', product: 'Fully Automatic Paper Cup Machine', status: 'In Progress', priority: 'Normal', agent: 'Pooja (Telecaller)' },
  { id: 'C003', name: 'Bansal Enterprises', phone: '+91 76543 21098', product: 'Hydraulic Dona Pattal Machine', status: 'Queued', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C004', name: 'Gupta Disposables', phone: '+91 65432 10987', product: 'Silver Craft Paper Roll', status: 'Completed', priority: 'Low', agent: 'Animesh (Sales Lead)' },
  { id: 'C005', name: 'Mishra Polymers', phone: '+91 54321 09876', product: 'Single Die Paper Plate Machine', status: 'Failed', priority: 'High', agent: 'Voice AI' },
  { id: 'C006', name: 'Verma Plastics', phone: '+91 98989 12345', product: 'Agarbatti Making Machine', status: 'Queued', priority: 'High', agent: 'Voice AI' },
  { id: 'C007', name: 'Desai Traders', phone: '+91 99887 77665', product: 'Paper Lamination Machine', status: 'In Progress', priority: 'High', agent: 'Pooja (Telecaller)' },
  { id: 'C008', name: 'Kapur Industries', phone: '+91 91234 56780', product: 'Double Die Paper Plate Machine', status: 'Queued', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C009', name: 'Jain Packing Solutions', phone: '+91 88776 65544', product: '4-Die Dona Pattal Machine', status: 'Queued', priority: 'High', agent: 'Pooja (Telecaller)' },
  { id: 'C010', name: 'Sinha Global', phone: '+91 99000 11223', product: 'Hydraulic Dona Pattal Machine', status: 'Completed', priority: 'Low', agent: 'Voice AI' },
  { id: 'C011', name: 'Reddy Paper Products', phone: '+91 77665 54433', product: 'Fully Automatic Paper Cup Machine', status: 'Queued', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C012', name: 'Malhotra Enterprises', phone: '+91 88990 01122', product: 'Single Die Paper Plate Machine', status: 'In Progress', priority: 'Normal', agent: 'Animesh (Sales Lead)' },
  { id: 'C013', name: 'Patel Disposables', phone: '+91 90123 45678', product: 'Silver Craft Paper Roll', status: 'Failed', priority: 'High', agent: 'Pooja (Telecaller)' },
  { id: 'C014', name: 'Singh Plastics', phone: '+91 95432 10987', product: 'Paper Bag Making Machine', status: 'Queued', priority: 'High', agent: 'Voice AI' },
  { id: 'C015', name: 'Shah Packers', phone: '+91 98765 00011', product: 'Agarbatti Making Machine', status: 'Completed', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C016', name: 'Tiwari Solutions', phone: '+91 87654 11122', product: 'Non-Woven Bag Making Machine', status: 'Queued', priority: 'Normal', agent: 'Pooja (Telecaller)' },
  { id: 'C017', name: 'Chauhan Manufacturing', phone: '+91 76543 22233', product: 'Heavy Duty Hydraulic Paper Plate Press', status: 'Queued', priority: 'High', agent: 'Voice AI' },
  { id: 'C018', name: 'Kumar Polymers', phone: '+91 65432 33344', product: 'Double Die Paper Plate Machine', status: 'In Progress', priority: 'Low', agent: 'Voice AI' },
  { id: 'C019', name: 'Mehta Creations', phone: '+91 91234 44455', product: 'Hydraulic Dona Pattal Machine', status: 'Completed', priority: 'High', agent: 'Animesh (Sales Lead)' },
  { id: 'C020', name: 'Nair Ventures', phone: '+91 99887 55566', product: 'Slipper Making Machine', status: 'Queued', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C021', name: 'Yadav Traders', phone: '+91 88776 66677', product: 'Semi-Automatic Dona Making Machine', status: 'Failed', priority: 'High', agent: 'Voice AI' },
  { id: 'C022', name: 'Rao Packaging', phone: '+91 99000 77788', product: 'Fully Automatic Paper Cup Machine', status: 'Queued', priority: 'Normal', agent: 'Pooja (Telecaller)' }
];

const STATUS_CLR = { Queued:'#09090b', 'In Progress':'#27272a', Completed:'#52525b', Failed:'#71717a' };

export default function DialerQueue() {
  const [calls, setCalls] = useState(MOCK_CALLS);
  const [showModal, setShowModal] = useState(false);
  const [newCall, setNewCall] = useState({ name: '', phone: '', product: 'Double Die Machine', priority: 'High' });

  const handleAddCall = (e) => {
    e.preventDefault();
    if (!newCall.name || !newCall.phone) return;
    const callObj = {
      id: `C00${calls.length + 1}`,
      name: newCall.name,
      phone: newCall.phone,
      product: newCall.product,
      status: 'Queued',
      priority: newCall.priority,
      agent: 'Voice AI'
    };
    setCalls(prev => [callObj, ...prev]);
    setShowModal(false);
    setNewCall({ name: '', phone: '', product: 'Double Die Machine', priority: 'High' });
  };

  const stats = [
    { label: 'In Queue', val: calls.filter(c => c.status === 'Queued').length, color: '#1d4ed8', bg: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' },
    { label: 'Active Call', val: calls.filter(c => c.status === 'In Progress').length, color: '#047857', bg: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' },
    { label: 'Completed Today', val: calls.filter(c => c.status === 'Completed').length, color: '#7c3aed', bg: 'linear-gradient(180deg, #ffffff 0%, #f3e8ff 100%)' },
    { label: 'Failed', val: calls.filter(c => c.status === 'Failed').length, color: '#ef4444', bg: 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)' }
  ];

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Dialer Queue</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-blue-primary" style={s.addBtn}>+ Add Outbound Call</button>
      </div>

      <div style={s.statsRow}>
        {stats.map(st => (
          <div key={st.label} style={{ ...s.statCard, background: st.bg }}>
            <div style={{ ...s.statNum, color: st.color }}>{st.val}</div>
            <div style={s.statLbl}>{st.label}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          {['Call ID', 'Contact', 'Phone', 'Product Interest', 'Agent', 'Priority', 'Status'].map(h => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {calls.map(call => {
          const isQueued = call.status === 'Queued';
          const isInProgress = call.status === 'In Progress';
          const isCompleted = call.status === 'Completed';
          const statusColor = isQueued ? '#1d4ed8' : isInProgress ? '#047857' : isCompleted ? '#7c3aed' : '#ef4444';
          const statusDot = isQueued ? '#3b82f6' : isInProgress ? '#10b981' : isCompleted ? '#a855f7' : '#f87171';

          return (
            <div key={call.id} className="table-row-hover" style={s.row}>
              <div style={{ ...s.td, fontWeight: 700, color: '#09090b', fontFamily: 'monospace' }}>{call.id}</div>
              <div style={{ ...s.td, fontWeight: 700, color: '#09090b' }}>{call.name}</div>
              <div style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', color: '#52525b' }}>{call.phone}</div>
              <div style={s.td}>{call.product}</div>
              <div style={s.td}>{call.agent}</div>
              <div style={s.td}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: call.priority === 'High' ? '#ef4444' : '#64748b' }}>
                  {call.priority}
                </span>
              </div>
              <div style={s.td}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusDot }}/>
                  {call.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Queue Outbound Call</h3>
              <button onClick={() => setShowModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <form onSubmit={handleAddCall} style={s.modalForm}>
              <label style={s.label}>Contact / Company Name</label>
              <input required style={s.modalInput} placeholder="e.g. Acme Metalworks" value={newCall.name} onChange={e => setNewCall({ ...newCall, name: e.target.value })} />
              <label style={s.label}>Phone Number</label>
              <input required style={s.modalInput} placeholder="+91 98765 43210" value={newCall.phone} onChange={e => setNewCall({ ...newCall, phone: e.target.value })} />
              <label style={s.label}>Product Interest</label>
              <input required style={s.modalInput} placeholder="e.g. CNC Router Pro" value={newCall.product} onChange={e => setNewCall({ ...newCall, product: e.target.value })} />
              <label style={s.label}>Priority</label>
              <select style={s.modalInput} value={newCall.priority} onChange={e => setNewCall({ ...newCall, priority: e.target.value })}>
                <option value="High">High Priority</option>
                <option value="Normal">Normal Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" className="btn-blue-primary" style={s.submitBtn}>Add to Dialer Queue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: 'var(--font-body)' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#09090b', margin: 0 },
  sub: { fontSize: '0.78rem', color: '#71717a', marginTop: 4 },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.25rem' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e4e4e7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  statNum: { fontSize: '1.8rem', fontWeight: 800 },
  statLbl: { fontSize: '0.72rem', color: '#71717a', fontWeight: 700, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
  tableHead: { display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e4e4e7', padding: '0.65rem 1.25rem', gap: '1rem' },
  th: { flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  row: { display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', gap: '1rem' },
  td: { flex: 1, fontSize: '0.8rem', color: '#3f3f46' },

  addBtn: { padding: '0.6rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 450, padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e4e4e7' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#71717a' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#3f3f46', marginTop: 4 },
  modalInput: { padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #e4e4e7', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', color: '#09090b' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#52525b' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }
};
