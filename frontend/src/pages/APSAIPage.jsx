import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api/a3';

// ─── Session Conversation ID ──────────────────────────────────────────────────
function getConversationId() {
  let id = sessionStorage.getItem('apsai_conv_id');
  if (!id) {
    id = 'conv_' + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem('apsai_conv_id', id);
  }
  return id;
}

// ─── LocalStorage Chat History ────────────────────────────────────────────────
const HISTORY_KEY = 'apsai_chat_history';

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveHistory(messages) {
  try {
    const clean = messages.filter(m => !m.loading).slice(-40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(clean));
  } catch {}
}

// ─── Bar Chart (Canvas) ───────────────────────────────────────────────────────
function MiniBarChart({ chart }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!chart || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { labels, datasets } = chart;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    const PAD = { top: 28, right: 16, bottom: 40, left: 48 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);
    const numGroups = labels.length;
    const numSets = datasets.length;
    const barGap = 4, groupGap = 12;
    const barW = Math.max(12, (chartW - groupGap * (numGroups - 1)) / numGroups / numSets - barGap);
    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    datasets.forEach((ds, si) => {
      ds.data.forEach((val, gi) => {
        const groupX = PAD.left + gi * (chartW / numGroups);
        const x = groupX + si * (barW + barGap) + groupGap / 2;
        const barH = (val / maxVal) * chartH;
        const y = PAD.top + chartH - barH;
        const color = ds.color || COLORS[si % COLORS.length];

        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '77');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
        ctx.fill();

        if (barH > 16) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `bold ${Math.min(11, barW - 2)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(val, x + barW / 2, y - 5);
        }
      });
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, gi) => {
      const groupX = PAD.left + gi * (chartW / numGroups) + (chartW / numGroups) / 2;
      ctx.fillText(label.length > 10 ? label.slice(0, 9) + '…' : label, groupX, H - PAD.bottom + 15);
    });

    for (let t = 0; t <= 4; t++) {
      const val = Math.round((maxVal / 4) * t);
      const y = PAD.top + chartH - (val / maxVal) * chartH;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, PAD.left - 6, y + 3);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    if (datasets.length > 1) {
      let lx = PAD.left;
      datasets.forEach((ds, i) => {
        const color = ds.color || COLORS[i % COLORS.length];
        ctx.fillStyle = color;
        ctx.fillRect(lx, 10, 10, 10);
        ctx.fillStyle = '#475569';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, lx + 14, 18);
        lx += ctx.measureText(ds.label).width + 26;
      });
    }
  }, [chart]);

  return (
    <div style={s.chartBox}>
      {chart?.title && <div style={s.chartHeading}>{chart.title}</div>}
      <canvas ref={canvasRef} style={{ width: '100%', height: 180, display: 'block' }} />
    </div>
  );
}

// ─── Donut Chart (Canvas) ─────────────────────────────────────────────────────
function MiniDonutChart({ chart }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!chart || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { labels, datasets } = chart;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    const data = datasets[0]?.data || [];
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    const chartAreaW = W * 0.5;
    const cx = chartAreaW / 2, cy = H / 2;
    const outerR = Math.min(cx, cy) - 14;
    const innerR = outerR * 0.58;

    let startAngle = -Math.PI / 2;
    data.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      startAngle += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.round(outerR * 0.35)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 6);
    ctx.font = `${Math.round(outerR * 0.22)}px Inter, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('leads', cx, cy + outerR * 0.24);
    ctx.textBaseline = 'alphabetic';

    const legendX = chartAreaW + 12;
    let legendY = 16;
    const lineH = (H - 20) / Math.min(labels.length, 7);

    labels.forEach((label, i) => {
      if (i > 6) return;
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.beginPath();
      ctx.roundRect(legendX, legendY + 2, 10, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} (${data[i] || 0})`, legendX + 16, legendY + 10);
      legendY += lineH;
    });
  }, [chart]);

  return (
    <div style={s.chartBox}>
      {chart?.title && <div style={s.chartHeading}>{chart.title}</div>}
      <canvas ref={canvasRef} style={{ width: '100%', height: 180, display: 'block' }} />
    </div>
  );
}

function SmartChart({ chart }) {
  if (!chart) return null;
  return chart.type === 'donut' ? <MiniDonutChart chart={chart} /> : <MiniBarChart chart={chart} />;
}

// ─── Data Table ───────────────────────────────────────────────────────────────
function MiniTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  const headers = Object.keys(rows[0]);

  return (
    <div style={s.tableContainer}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {headers.map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {headers.map(h => (
                <td key={h} style={s.td}>{row[h]}</td>
              ))}
            </tr>
          ))}
          {rows.length > 10 && (
            <tr>
              <td colSpan={headers.length} style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.7rem', textAlign: 'center', background: '#f8fafc' }}>
                +{rows.length - 10} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Markdown Text Renderer ───────────────────────────────────────────────────
function RenderText({ text, isUser }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: isUser ? '#fff' : '#0f172a', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : p.split('\n').map((line, j) => (
              <React.Fragment key={`${i}-${j}`}>
                {j > 0 && <br />}
                {line.startsWith('• ') ? (
                  <span style={{ display: 'block', paddingLeft: 14, color: isUser ? 'rgba(255,255,255,0.9)' : '#475569', margin: '2px 0' }}>
                    • {line.slice(2)}
                  </span>
                ) : line.startsWith('*') && line.endsWith('*') ? (
                  <em style={{ color: isUser ? 'rgba(255,255,255,0.85)' : '#2563eb', fontStyle: 'italic' }}>
                    {line.slice(1, -1)}
                  </em>
                ) : line}
              </React.Fragment>
            ))
      )}
    </span>
  );
}

// ─── Message Component ────────────────────────────────────────────────────────
function MessageCard({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={s.aiAvatarCircle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z"/>
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3"/>
            </svg>
          </div>
          <span style={s.aiNameBadge}>APS AI</span>
        </div>
      )}

      <div style={isUser ? s.userBubble : s.botBubble}>
        {msg.loading ? (
          <div style={s.dotsContainer}>
            <span style={s.dot} />
            <span style={{ ...s.dot, animationDelay: '0.15s' }} />
            <span style={{ ...s.dot, animationDelay: '0.3s' }} />
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: isUser ? '#fff' : '#334155' }}>
              <RenderText text={msg.text} isUser={isUser} />
            </div>
            {msg.table && <MiniTable rows={msg.table} />}
            {msg.chart && <SmartChart chart={msg.chart} />}
            {msg.processingMs && (
              <div style={{ fontSize: '0.65rem', color: isUser ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginTop: 8, textAlign: 'right' }}>
                Latency: {msg.processingMs}ms
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Welcome Message ──────────────────────────────────────────────────────────
const WELCOME_MSG = {
  role: 'bot',
  text: "Hello! I'm **APS AI**, your executive intelligence assistant for APS Enterprise.\n\nI have full visibility into your **CRM leads, pipeline stages, closed sales, revenue, team KPIs, Tally payment gates, and dialer logs**.\n\nAsk me anything in plain English or select one of the suggested queries below.",
  table: null,
  chart: null
};

// ─── MAIN APS AI PAGE COMPONENT ───────────────────────────────────────────────
export default function APSAIPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = loadHistory();
    return saved && saved.length > 0 ? saved : [WELCOME_MSG];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const convId = useRef(getConversationId());

  // Save history whenever messages change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Load suggestions
  useEffect(() => {
    axios.get(`${API}/suggestions`)
      .then(r => setSuggestions(r.data.suggestions || []))
      .catch(() => {});
  }, []);

  // Handle URL query parameter if navigated with `?q=...`
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialQ = params.get('q');
    if (initialQ && initialQ.trim()) {
      sendQuery(initialQ.trim());
      // Clean query string from URL without refreshing
      navigate('/ai', { replace: true });
    }
  }, [location.search]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    sessionStorage.removeItem('apsai_conv_id');
    convId.current = getConversationId();
    setMessages([WELCOME_MSG]);
  };

  const sendQuery = useCallback(async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setMessages(prev => [...prev, { role: 'bot', text: '', loading: true }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/query`, {
        query: q,
        conversationId: convId.current
      });

      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'bot',
          text: data.text,
          table: data.table,
          chart: data.chart,
          processingMs: data.processingMs
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'bot',
          text: 'Could not connect to the backend server. Please verify port 5000 is online.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div style={s.pageWrapper}>
      {/* ─── Top Page Header ────────────────────────────────────────── */}
      <div style={s.headerBanner}>
        <div style={s.headerLeft}>
          <div style={s.headerIconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z"/>
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3"/>
            </svg>
          </div>
          <div>
            <h1 style={s.headerTitle}>APS AI — Business Intelligence Agent</h1>
            <p style={s.headerSubtitle}>
              Natural language intelligence engine for leads, pipelines, revenue analytics, and team KPIs.
            </p>
          </div>
        </div>

        <div style={s.headerRight}>
          <button onClick={clearHistory} style={s.actionBtn} title="Reset Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* ─── Main Workspace Grid ────────────────────────────────────── */}
      <div style={s.mainGrid}>
        {/* Left Side: Quick Query Categories & Live Metrics */}
        <div style={s.sideNav}>
          <div style={s.sideCard}>
            <div style={s.sideCardTitle}>Quick Queries</div>
            <div style={s.quickList}>
              {[
                { label: 'Hot leads needing follow-up', query: 'Show me hot leads' },
                { label: 'Leads awaiting 10% payment', query: 'Which leads are awaiting payment?' },
                { label: 'Lead pipeline stage breakdown', query: 'Give me a pipeline breakdown' },
                { label: 'Month-over-month sales comparison', query: 'Compare this month vs last month' },
                { label: 'Top performing sales representative', query: 'Who is the top performing employee?' },
                { label: 'Total revenue & advance collected', query: 'What is the total revenue?' },
                { label: 'Team performance & KPI scores', query: 'Show team KPI scores' },
                { label: 'Recent system activity log', query: 'Show recent activity log' }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => sendQuery(item.query)}
                  disabled={loading}
                  style={s.quickQueryBtn}
                >
                  <span style={s.quickQueryDot}>›</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...s.sideCard, marginTop: '1rem' }}>
            <div style={s.sideCardTitle}>Live Knowledge Snapshot</div>
            <div style={s.knowledgeItem}>
              <span style={s.kKey}>CRM Leads:</span>
              <span style={s.kVal}>12 Live Leads</span>
            </div>
            <div style={s.knowledgeItem}>
              <span style={s.kKey}>Closed Pipeline:</span>
              <span style={s.kVal}>₹3,75,000</span>
            </div>
            <div style={s.knowledgeItem}>
              <span style={s.kKey}>Payment Gate:</span>
              <span style={s.kVal}>1 Pending Verification</span>
            </div>
            <div style={s.knowledgeItem}>
              <span style={s.kKey}>Sales Team:</span>
              <span style={s.kVal}>5 Active Operators</span>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Conversation Area */}
        <div style={s.chatContainer}>
          {/* Messages scroll area */}
          <div style={s.messagesArea} id="apsai-page-messages">
            {messages.map((msg, i) => <MessageCard key={i} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Quick Suggestions Row */}
          {suggestions.length > 0 && messages.length <= 2 && (
            <div style={s.suggestRow}>
              <span style={s.suggestLabel}>Common queries:</span>
              {suggestions.map((s2, i) => (
                <button
                  key={i}
                  onClick={() => sendQuery(s2.query)}
                  disabled={loading}
                  style={s.chipBtn}
                >
                  {s2.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div style={s.inputWrapper}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isListening ? "Listening to your voice..." : "Ask APS AI about your sales, pipeline, revenue, leads, or team..."}
              style={{
                ...s.inputField,
                backgroundColor: isListening ? '#fef3c7' : '#f8fafc',
                borderColor: isListening ? '#f59e0b' : '#cbd5e1'
              }}
              rows={2}
              disabled={loading}
            />

            <div style={s.inputActions}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{
                    ...s.voiceBtn,
                    backgroundColor: isListening ? '#ef4444' : '#eff6ff',
                    color: isListening ? '#fff' : '#2563eb'
                  }}
                  title="Voice Speech-to-Text"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  <span>{isListening ? 'Listening…' : 'Voice'}</span>
                </button>
                <span style={s.hintText}>Press <strong>Enter ↵</strong> to send</span>
              </div>

              <button
                onClick={() => sendQuery()}
                disabled={!input.trim() || loading}
                style={{
                  ...s.sendButton,
                  ...(input.trim() && !loading ? s.sendButtonActive : {})
                }}
              >
                <span>Send Query</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes apsai-page-dot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        #apsai-page-messages::-webkit-scrollbar { width: 6px }
        #apsai-page-messages::-webkit-scrollbar-track { background: transparent }
        #apsai-page-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px }
      `}</style>
    </div>
  );
}

// ─── STYLES (Light Professional Theme) ────────────────────────────────────────
const s = {
  pageWrapper: {
    padding: '1.5rem 2rem 2rem',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    height: 'calc(100vh - 72px)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },

  // Header Banner
  headerBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    padding: '1.2rem 1.6rem',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    marginBottom: '1.2rem',
    flexShrink: 0
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
    flexShrink: 0
  },
  headerTitle: { fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' },
  headerSubtitle: { fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    padding: '6px 12px',
    borderRadius: 20
  },
  statDot: { width: 7, height: 7, borderRadius: '50%', background: '#10b981' },
  statText: { fontSize: '0.72rem', fontWeight: 700, color: '#1e40af' },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  // Main Grid Layout
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '290px 1fr',
    gap: '1.2rem',
    flex: 1,
    minHeight: 0
  },

  // Side Nav
  sideNav: { display: 'flex', flexDirection: 'column' },
  sideCard: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '1.1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  sideCardTitle: { fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  quickList: { display: 'flex', flexDirection: 'column', gap: 6 },
  quickQueryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#334155',
    fontSize: '0.74rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  },
  quickQueryDot: { color: '#2563eb', fontWeight: 800, fontSize: '0.9rem' },
  knowledgeItem: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.74rem' },
  kKey: { color: '#64748b' },
  kVal: { color: '#0f172a', fontWeight: 700 },

  // Chat Area Container
  chatContainer: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    background: '#f8fafc'
  },

  // Message Cards & Bubbles
  aiAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiNameBadge: { fontSize: '0.76rem', fontWeight: 800, color: '#1e40af' },
  onlineBadge: { fontSize: '0.66rem', color: '#16a34a', fontWeight: 600 },

  userBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '20px 20px 4px 20px',
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
  },
  botBubble: {
    maxWidth: '88%',
    padding: '14px 18px',
    borderRadius: '4px 20px 20px 20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },

  dotsContainer: { display: 'flex', gap: 6, padding: '4px 0', alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#2563eb',
    display: 'inline-block',
    animation: 'apsai-page-dot 1.2s infinite ease-in-out'
  },

  // Suggestions row
  suggestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 1.5rem',
    background: '#fff',
    borderTop: '1px solid #f1f5f9',
    overflowX: 'auto'
  },
  suggestLabel: { fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  chipBtn: {
    padding: '5px 12px',
    borderRadius: 20,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  // Input wrapper
  inputWrapper: {
    padding: '1rem 1.4rem',
    borderTop: '1px solid #e2e8f0',
    background: '#fff'
  },
  inputField: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: '0.86rem',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    resize: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background-color 0.15s'
  },
  inputActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.6rem'
  },
  voiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #bfdbfe',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  hintText: { fontSize: '0.7rem', color: '#94a3b8' },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#e2e8f0',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  sendButtonActive: {
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
  },

  // Charts
  chartBox: {
    marginTop: 12,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    overflow: 'hidden'
  },
  chartHeading: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#64748b',
    padding: '8px 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  // Tables
  tableContainer: {
    marginTop: 12,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    overflowX: 'auto'
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.75rem',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '6px 12px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap'
  }
};
