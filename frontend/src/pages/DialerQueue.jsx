import React, { useState } from 'react';

const MOCK_CALLS = [
  { id: 'C001', name: 'Horizon Industries', phone: '+91 98765 43210', product: 'CNC Machine', status: 'Queued', priority: 'High', agent: 'Voice AI' },
  { id: 'C002', name: 'BlueStar Fab', phone: '+91 87654 32109', product: 'Laser Cutter', status: 'In Progress', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C003', name: 'RiverTech', phone: '+91 76543 21098', product: 'Plasma Cutter', status: 'Queued', priority: 'Normal', agent: 'Voice AI' },
  { id: 'C004', name: 'Apex Steel', phone: '+91 65432 10987', product: 'Sheet Bender', status: 'Completed', priority: 'Low', agent: 'Telecaller' },
  { id: 'C005', name: 'PrimeMake', phone: '+91 54321 09876', product: 'Hydraulic Press', status: 'Failed', priority: 'High', agent: 'Voice AI' }
];

const STATUS_CLR = { Queued:'#09090b', 'In Progress':'#27272a', Completed:'#52525b', Failed:'#71717a' };

export default function DialerQueue() {
  const [calls, setCalls] = useState(MOCK_CALLS);
  const [showModal, setShowModal] = useState(false);
  const [newCall, setNewCall] = useState({ name: '', phone: '', product: 'CNC Router Pro', priority: 'High' });

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
    setNewCall({ name: '', phone: '', product: 'CNC Router Pro', priority: 'High' });
  };

  const stats = [
    { label: 'In Queue', val: calls.filter(c => c.status === 'Queued').length, color: '#09090b' },
    { label: 'Active Call', val: calls.filter(c => c.status === 'In Progress').length, color: '#27272a' },
    { label: 'Completed Today', val: calls.filter(c => c.status === 'Completed').length, color: '#52525b' },
    { label: 'Failed', val: calls.filter(c => c.status === 'Failed').length, color: '#71717a' }
  ];

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div>
          <h1 style={s.title}>Dialer Queue</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={s.addBtn}>+ Add Outbound Call</button>
      </div>

      <div style={s.statsRow}>
        {stats.map(st => (
          <div key={st.label} style={{...s.statCard, borderTopColor: '#09090b'}}>
            <div style={{...s.statNum, color: '#09090b'}}>{st.val}</div>
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
        {calls.map(call => (
          <div key={call.id} style={s.row}>
            <div style={{...s.td, fontWeight:700, color:'#09090b', fontFamily:'monospace'}}>{call.id}</div>
            <div style={{...s.td, fontWeight:700, color:'#09090b'}}>{call.name}</div>
            <div style={{...s.td, fontFamily:'monospace', fontSize:'0.75rem', color:'#52525b'}}>{call.phone}</div>
            <div style={s.td}>{call.product}</div>
            <div style={s.td}>{call.agent}</div>
            <div style={s.td}><span style={{...s.pill, backgroundColor: call.priority==='High'?'#09090b':'#f4f4f5', color: call.priority==='High'?'#ffffff':'#09090b'}}>{call.priority}</span></div>
            <div style={s.td}><span style={{...s.pill, backgroundColor: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7'}}>{call.status}</span></div>
          </div>
        ))}
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
                <button type="submit" style={s.submitBtn}>Add to Dialer Queue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding:'2rem', fontFamily:'var(--font-body)' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { fontSize:'1.8rem', fontWeight:800, fontFamily:'var(--font-heading)', color:'#09090b', margin:0 },
  sub: { fontSize:'0.78rem', color:'#71717a', marginTop:4 },
  liveBadge: { backgroundColor:'#f4f4f5', color:'#09090b', border:'1px solid #e4e4e7', borderRadius:20, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700 },
  statsRow: { display:'flex', gap:'1rem', marginBottom:'1.5rem' },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:14, padding:'1.25rem', border:'1px solid #e4e4e7', borderTop:'3px solid #09090b', boxShadow:'0 2px 6px rgba(0,0,0,0.02)' },
  statNum: { fontSize:'2rem', fontWeight:800, color:'#09090b' },
  statLbl: { fontSize:'0.72rem', color:'#71717a', fontWeight:600, marginTop:2 },
  card: { backgroundColor:'#fff', borderRadius:18, border:'1px solid #e4e4e7', overflow:'hidden' },
  tableHead: { display:'flex', backgroundColor:'#f8fafc', borderBottom:'1px solid #e4e4e7', padding:'0.65rem 1.25rem', gap:'1rem' },
  th: { flex:1, fontSize:'0.65rem', fontWeight:700, color:'#71717a', textTransform:'uppercase', letterSpacing:'0.5px' },
  row: { display:'flex', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid #f4f4f5', gap:'1rem' },
  td: { flex:1, fontSize:'0.8rem', color:'#3f3f46' },
  pill: { padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700 },

  addBtn: { padding: '0.6rem 1.25rem', backgroundColor: '#09090b', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 450, padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e4e4e7' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeModalBtn: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#71717a' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#3f3f46', marginTop: 4 },
  modalInput: { padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #e4e4e7', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', color: '#09090b' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', borderRadius: 20, border: '1px solid #e4e4e7', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#52525b' },
  submitBtn: { padding: '0.6rem 1.4rem', borderRadius: '20px', border: 'none', background: '#09090b', color: '#fff', cursor: 'pointer', fontWeight: 700 }
};
