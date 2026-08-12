import React from 'react';
const s = { page:{padding:'2rem',fontFamily:'var(--font-body)'}, title:{fontSize:'1.8rem',fontWeight:800,fontFamily:'var(--font-heading)',color:'#08060d',margin:0}, sub:{fontSize:'0.78rem',color:'#64748b',marginTop:4}, comingSoon:{backgroundColor:'#fff',borderRadius:18,border:'1px solid #e2e8f0',padding:'4rem',textAlign:'center',marginTop:'1.5rem'}, icon:{fontSize:'3rem',marginBottom:'1rem'}, cTitle:{fontSize:'1.2rem',fontWeight:700,color:'#08060d',marginBottom:8}, cSub:{fontSize:'0.82rem',color:'#64748b'} };

export function WhatsAppAgent() {
  return <div style={s.page}><h1 style={s.title}>WhatsApp Agent</h1><p style={s.sub}>A3 Module — AI-powered WhatsApp automation for follow-ups, broadcasts and lead nurturing</p><div style={s.comingSoon}><div style={s.icon}>💬</div><div style={s.cTitle}>WhatsApp AI Agent (A3)</div><div style={s.cSub}>Automated follow-up sequences, payment reminders, and lead qualification via WhatsApp Business API. Full UI coming soon.</div></div></div>;
}

export function EmailAIAgent() {
  return <div style={s.page}><h1 style={s.title}>Email AI Agent</h1><p style={s.sub}>A5 Module — AI-powered email campaigns, templates, and inbox management</p><div style={s.comingSoon}><div style={s.icon}>📧</div><div style={s.cTitle}>Email AI Agent (A5)</div><div style={s.cSub}>Smart email campaigns, auto-reply, and AI-generated follow-up sequences for lead nurturing. Full UI coming soon.</div></div></div>;
}

export function VoiceAgent() {
  return <div style={s.page}><h1 style={s.title}>A1 Voice Agent</h1><p style={s.sub}>AI-powered outbound calling — lead qualification, appointment setting, and enquiry handling</p><div style={s.comingSoon}><div style={s.icon}>🎙️</div><div style={s.cTitle}>A1 Voice Agent Dashboard</div><div style={s.cSub}>Real-time call monitoring, script management, call outcomes, and agent performance for the ElevenLabs-powered AI voice system. Full UI coming soon.</div></div></div>;
}
