import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? 'http://localhost:5000/api/a3' : '/api/a3';

// ─── Session Conversation ID ──────────────────────────────────────────────────
function getConversationId() {
  let id = sessionStorage.getItem('apsai_conv_id');
  if (!id) {
    id = 'conv_' + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem('apsai_conv_id', id);
  }
  return id;
}

// ─── Universal Emoji Stripper & Sanitizer ──────────────────────────────────────
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}]/gu;

export function stripEmojis(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(EMOJI_REGEX, '')
    .replace(/^(#{1,6})[ \t]+/gm, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+/gm, '');
}

function sanitizeMsg(m) {
  if (!m) return m;
  const clean = { ...m };
  if (clean.text) clean.text = stripEmojis(clean.text);
  if (Array.isArray(clean.options)) clean.options = clean.options.map(stripEmojis);
  if (Array.isArray(clean.table)) {
    clean.table = clean.table.map(row => {
      if (!row || typeof row !== 'object') return row;
      const cleanRow = {};
      for (const [k, v] of Object.entries(row)) {
        cleanRow[stripEmojis(k)] = typeof v === 'string' ? stripEmojis(v) : v;
      }
      return cleanRow;
    });
  }
  return clean;
}

// ─── LocalStorage Chat History ────────────────────────────────────────────────
const HISTORY_KEY = 'apsai_chat_history';

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter(m => !m.isWelcome).map(sanitizeMsg);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(sanitized));
        } catch { }
        return sanitized;
      }
    }
  } catch { }
  return null;
}

function saveHistory(messages) {
  try {
    const clean = messages.filter(m => !m.loading && !m.isWelcome).map(sanitizeMsg).slice(-40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(clean));
  } catch { }
}

// ─── Format helper for canvas numbers ─────────────────────────────────────────
function formatChartNum(val) {
  if (typeof val !== 'number') return val;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return String(val);
}

// ─── Bar Chart (Canvas) ───────────────────────────────────────────────────────
function MiniBarChart({ chart }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!chart || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Intelligently cap to at most 10 items to prevent cramped/overlapping canvas bars
    const maxItems = 10;
    const rawLabels = chart.labels || [];
    const isTruncated = rawLabels.length > maxItems;
    const labels = isTruncated ? rawLabels.slice(0, maxItems) : rawLabels;
    const datasets = (chart.datasets || []).map(ds => ({
      ...ds,
      data: isTruncated ? ds.data.slice(0, maxItems) : ds.data
    }));

    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    const PAD = { top: 32, right: 16, bottom: 44, left: 54 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);
    const numGroups = Math.max(labels.length, 1);
    const numSets = Math.max(datasets.length, 1);
    const groupSlotW = chartW / numGroups;
    const barGap = 4;
    const barW = Math.max(12, Math.min(38, (groupSlotW - 14) / numSets - barGap));
    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    // Y-axis gridlines & ticks
    for (let t = 0; t <= 4; t++) {
      const val = Math.round((maxVal / 4) * t);
      const y = PAD.top + chartH - (val / maxVal) * chartH;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatChartNum(val), PAD.left - 8, y + 3);
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    // Draw Bars
    datasets.forEach((ds, si) => {
      ds.data.forEach((val, gi) => {
        const totalSetW = numSets * barW + (numSets - 1) * barGap;
        const groupCenterX = PAD.left + gi * groupSlotW + groupSlotW / 2;
        const x = groupCenterX - totalSetW / 2 + si * (barW + barGap);
        const barH = Math.max(3, (val / maxVal) * chartH);
        const y = PAD.top + chartH - barH;
        const color = ds.color || COLORS[si % COLORS.length];

        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + 'aa');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();

        // Data value label on top
        if (barH > 8) {
          ctx.fillStyle = '#334155';
          ctx.font = '600 9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(formatChartNum(val), x + barW / 2, y - 6);
        }
      });
    });

    // X-axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '600 9.5px Inter, sans-serif';
    ctx.textAlign = 'center';

    labels.forEach((label, gi) => {
      const groupX = PAD.left + gi * groupSlotW + groupSlotW / 2;
      const maxChars = groupSlotW < 50 ? 6 : (groupSlotW < 75 ? 8 : 12);
      const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
      ctx.fillText(displayLabel, groupX, H - PAD.bottom + 18);
    });

    // Legend if multiple datasets
    if (datasets.length > 1) {
      let lx = PAD.left;
      datasets.forEach((ds, i) => {
        const color = ds.color || COLORS[i % COLORS.length];
        ctx.fillStyle = color;
        ctx.fillRect(lx, 10, 10, 10);
        ctx.fillStyle = '#475569';
        ctx.font = '500 9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, lx + 14, 18);
        lx += ctx.measureText(ds.label).width + 24;
      });
    }
  }, [chart]);

  return (
    <div style={s.chartBox}>
      {chart?.title && <div style={s.chartHeading}>{chart.title}</div>}
      <canvas ref={canvasRef} style={{ width: '100%', height: 200, display: 'block' }} />
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
  const [showAll, setShowAll] = React.useState(false);
  const headers = Object.keys(rows[0]);
  const visibleRows = showAll ? rows : rows.slice(0, 10);

  return (
    <div style={s.tableContainer}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {headers.map(h => (
              <th key={h} style={s.th}>{stripEmojis(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {headers.map(h => (
                <td key={h} style={s.td}>{typeof row[h] === 'string' ? stripEmojis(row[h]) : row[h]}</td>
              ))}
            </tr>
          ))}
          {rows.length > 10 && (
            <tr>
              <td
                colSpan={headers.length}
                onClick={() => setShowAll(!showAll)}
                style={{
                  padding: '8px 12px',
                  color: '#4f46e5',
                  fontWeight: '600',
                  fontSize: '0.72rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  borderTop: '1px solid #e2e8f0',
                  transition: 'background 0.2s',
                  userSelect: 'none'
                }}
                onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.background = '#f8fafc'}
              >
                {showAll ? 'Show Less' : `+${rows.length - 10} more rows (Click to expand)`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Native Markdown Table Component ──────────────────────────────────────────
function MarkdownTable({ headers, rows, isUser }) {
  if (!headers || headers.length === 0) return null;
  return (
    <div style={{
      margin: '12px 0',
      overflowX: 'auto',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      background: '#ffffff',
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.82rem',
        textAlign: 'left',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px',
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.1px'
              }}>
                {parseInlineStyles(stripEmojis(h.trim()), isUser)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              style={{
                borderBottom: rIdx === rows.length - 1 ? 'none' : '1px solid #f1f5f9',
                background: rIdx % 2 === 0 ? '#ffffff' : '#fafafa'
              }}
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{
                  padding: '9px 14px',
                  color: '#334155',
                  verticalAlign: 'top',
                  lineHeight: 1.5
                }}>
                  {parseInlineStyles(stripEmojis(cell.trim()), isUser)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Enhanced Markdown Text Renderer ───────────────────────────────────────────
function RenderText({ text, isUser }) {
  if (!text) return null;

  // Normalize special Unicode space variants and zero-width characters to standard ASCII characters
  const normalizedText = stripEmojis(String(text))
    .replace(/[\u202F\u00A0\u2007\u2009\u200a]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Split text into code block segments and regular text
  const blocks = normalizedText.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {blocks.map((block, bIdx) => {
        if (block.startsWith('```')) {
          const match = block.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : block.slice(3, -3);

          return (
            <div key={bIdx} style={{
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: 10,
              overflow: 'hidden',
              margin: '8px 0',
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '0.78rem',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                background: '#1e293b',
                padding: '6px 14px',
                fontSize: '0.66rem',
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155',
                userSelect: 'none'
              }}>
                <span>{lang || 'code'}</span>
                <span 
                  style={{ cursor: 'pointer', transition: 'color 0.1s' }} 
                  onClick={(e) => {
                    navigator.clipboard.writeText(code);
                    const target = e.target;
                    target.innerText = 'COPIED!';
                    setTimeout(() => { target.innerText = 'COPY'; }, 2000);
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#94a3b8'; }}
                >
                  COPY
                </span>
              </div>
              <pre style={{
                margin: 0,
                padding: 12,
                overflowX: 'auto',
                whiteSpace: 'pre',
                lineHeight: 1.45
              }}>{code}</pre>
            </div>
          );
        }

        // Parse regular text block lines & detect tables, callouts, lists
        const lines = block.split('\n');
        const elements = [];
        let i = 0;

        while (i < lines.length) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          // 1. Detect Markdown Tables (| Header | Header |)
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
              tableLines.push(lines[i].trim());
              i++;
            }

            if (tableLines.length >= 2) {
              const rawHeaders = tableLines[0].split('|').slice(1, -1);
              const isSep = /^\|[\s\-:|]+\|$/.test(tableLines[1]);
              const startRowIdx = isSep ? 2 : 1;
              const rows = tableLines.slice(startRowIdx).map(l => l.split('|').slice(1, -1));

              elements.push({
                type: 'table',
                headers: rawHeaders,
                rows: rows
              });
              continue;
            } else {
              elements.push({ type: 'text', content: tableLines[0] });
              continue;
            }
          }

          // 2. Executive Callout Box (starts with > or Key Takeaway / Executive Summary)
          if (trimmed.startsWith('>') || /^\*\*(key takeaway|executive summary|note|warning|tip|protocol)\*\*/i.test(trimmed)) {
            const calloutText = trimmed.replace(/^>\s*/, '');
            elements.push({
              type: 'callout',
              content: calloutText
            });
            i++;
            continue;
          }

          // 3. Numbered Step (e.g. 1. text)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            elements.push({
              type: 'numbered',
              num: numMatch[1],
              content: numMatch[2]
            });
            i++;
            continue;
          }

          // 4. Bullet Item (•, -, *)
          const bulletMatch = trimmed.match(/^(\u2022|\-|\*)\s+(.*)/);
          if (bulletMatch) {
            elements.push({
              type: 'bullet',
              content: bulletMatch[2]
            });
            i++;
            continue;
          }

          // 5. Headings
          if (trimmed.startsWith('#### ')) {
            elements.push({ type: 'heading', level: 4, content: trimmed.replace(/^####\s+/, '') });
            i++;
            continue;
          }
          if (trimmed.startsWith('### ')) {
            elements.push({ type: 'heading', level: 3, content: trimmed.replace(/^###\s+/, '') });
            i++;
            continue;
          }
          if (trimmed.startsWith('## ')) {
            elements.push({ type: 'heading', level: 2, content: trimmed.replace(/^##\s+/, '') });
            i++;
            continue;
          }
          if (trimmed.startsWith('# ')) {
            elements.push({ type: 'heading', level: 1, content: trimmed.replace(/^#\s+/, '') });
            i++;
            continue;
          }

          // 6. Horizontal separator
          if (trimmed === '---') {
            elements.push({ type: 'hr' });
            i++;
            continue;
          }

          // 7. Spacer
          if (!trimmed) {
            elements.push({ type: 'spacer' });
            i++;
            continue;
          }

          // 8. Plain text paragraph
          elements.push({ type: 'text', content: rawLine });
          i++;
        }

        return (
          <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {elements.map((el, elIdx) => {
              if (el.type === 'table') {
                return <MarkdownTable key={elIdx} headers={el.headers} rows={el.rows} isUser={isUser} />;
              }

              if (el.type === 'callout') {
                return (
                  <div key={elIdx} style={{
                    margin: '6px 0',
                    padding: '10px 14px',
                    background: isUser ? 'rgba(255,255,255,0.12)' : '#f8fafc',
                    borderLeft: `3px solid ${isUser ? '#ffffff' : '#0f172a'}`,
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    color: isUser ? '#ffffff' : '#0f172a',
                    boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    {parseInlineStyles(el.content, isUser)}
                  </div>
                );
              }

              if (el.type === 'numbered') {
                return (
                  <div key={elIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '3px 0' }}>
                    <span style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isUser ? '#ffffff' : '#0f172a',
                      color: isUser ? '#0f172a' : '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                      flexShrink: 0
                    }}>
                      {el.num}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.86rem', lineHeight: 1.5, color: isUser ? '#ffffff' : '#334155' }}>
                      {parseInlineStyles(el.content, isUser)}
                    </span>
                  </div>
                );
              }

              if (el.type === 'bullet') {
                return (
                  <div key={elIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 4, margin: '2px 0' }}>
                    <span style={{ color: isUser ? '#ffffff' : '#0f172a', fontSize: '0.9rem', lineHeight: 1.4, userSelect: 'none' }}>•</span>
                    <span style={{ flex: 1, fontSize: '0.86rem', lineHeight: 1.5, color: isUser ? '#ffffff' : '#334155' }}>
                      {parseInlineStyles(el.content, isUser)}
                    </span>
                  </div>
                );
              }

              if (el.type === 'heading') {
                const HeaderTag = `h${el.level}`;
                const sizes = { 1: '1.25rem', 2: '1.14rem', 3: '1.02rem', 4: '0.9rem' };
                return (
                  <HeaderTag key={elIdx} style={{
                    fontSize: sizes[el.level],
                    fontWeight: 800,
                    color: isUser ? '#ffffff' : '#0f172a',
                    margin: el.level <= 2 ? '14px 0 6px 0' : '10px 0 4px 0',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.3
                  }}>
                    {parseInlineStyles(el.content, isUser)}
                  </HeaderTag>
                );
              }

              if (el.type === 'hr') {
                return <hr key={elIdx} style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '8px 0', width: '100%' }} />;
              }

              if (el.type === 'spacer') {
                return <div key={elIdx} style={{ height: 4 }} />;
              }

              return (
                <div key={elIdx} style={{
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  color: isUser ? '#ffffff' : '#334155',
                  margin: '1px 0'
                }}>
                  {parseInlineStyles(el.content, isUser)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function parseInlineStyles(str, isUser) {
  if (!str) return '';
  const tokens = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={i} style={{ color: isUser ? '#ffffff' : '#0f172a', fontWeight: 700 }}>
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} style={{
          background: isUser ? 'rgba(255,255,255,0.18)' : '#f1f5f9',
          color: isUser ? '#ffffff' : '#0f172a',
          padding: '2px 5px',
          borderRadius: 4,
          fontSize: '0.78rem',
          fontFamily: 'Consolas, Monaco, monospace',
          border: isUser ? 'none' : '1px solid #e2e8f0',
          margin: '0 2px'
        }}>
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return (
        <em key={i} style={{ color: isUser ? 'rgba(255,255,255,0.9)' : '#475569', fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

// ─── Report Card Component ───────────────────────────────────────────────────
function ReportCard({ report }) {
  if (!report) return null;
  const { title, date, summary, keyFindings, actionableInsights } = report;

  return (
    <div style={s.reportBox}>
      <div style={s.reportHeader}>
        <div>
          <span style={s.reportBadge}>Executive Report</span>
          <h3 style={s.reportTitle}>{title}</h3>
        </div>
        {date && <span style={s.reportDate}>{date}</span>}
      </div>

      {summary && (
        <div style={s.reportSummary}>
          <strong>Summary:</strong> {summary}
        </div>
      )}

      {keyFindings && keyFindings.length > 0 && (
        <div style={s.reportSection}>
          <div style={s.reportSectionHeading}>Key Findings</div>
          <ul style={s.reportList}>
            {keyFindings.map((item, i) => (
              <li key={i} style={s.reportItemFinding}>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actionableInsights && actionableInsights.length > 0 && (
        <div style={s.reportSection}>
          <div style={s.reportSectionHeading}>Actionable Insights</div>
          <ul style={s.reportList}>
            {actionableInsights.map((item, i) => (
              <li key={i} style={s.reportItemInsight}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Export File Download Card Component ─────────────────────────────────────
function cleanPdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/₹/g, 'INR ')
    .replace(/Rs\.?/gi, 'INR ')
    .replace(/[•●▪■]/g, '- ')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[\#\*\_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMarkdownTable(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const tableLines = lines.filter(l => /^\s*\|.*\|\s*$/.test(l));
  if (tableLines.length >= 2) {
    const parseRow = line => line.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    const rows = tableLines.slice(1)
      .filter(l => !/^\s*\|[\s\-:]+\|\s*$/.test(l))
      .map(parseRow);
    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }
  return null;
}

function sanitizeReportContent(raw) {
  if (!raw) return '';
  let clean = raw.replace(/```[\s\S]*?```/g, '');
  const lines = clean.split('\n').filter(line => {
    const t = line.trim();
    if (!t) return false;
    if (/^(import\s+|from\s+[\w.]+\s+import|def\s+\w+|class\s+\w+|pip\s+install|python\b|console\.log|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=)/i.test(t)) return false;
    if (/^(\#\!|\/\/|\/\*|\*\/)/.test(t)) return false;
    if (t.toLowerCase().includes('reportlab') || t.toLowerCase().includes('simpledoctemplate')) return false;
    return true;
  });
  return lines.join('\n');
}

function parseReportSections(content) {
  if (!content) return { highlights: [], directives: [], generalLines: [] };
  const lines = content.split('\n');
  const highlights = [];
  const directives = [];
  const generalLines = [];

  let currentSection = 'general';

  for (const rawLine of lines) {
    const l = rawLine.trim();
    if (!l) continue;
    if (/executive.*highlight/i.test(l)) {
      currentSection = 'highlights';
      continue;
    } else if (/strategic.*directive|action.*directive|recommendation/i.test(l)) {
      currentSection = 'directives';
      continue;
    } else if (/team.*breakdown|breakdown|table/i.test(l)) {
      currentSection = 'table';
      continue;
    }

    if (currentSection === 'highlights') {
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) {
        highlights.push(cleanPdfText(l.replace(/^[•\-\*]\s*/, '')));
      } else if (!l.startsWith('#')) {
        highlights.push(cleanPdfText(l));
      }
    } else if (currentSection === 'directives') {
      if (/^\d+\./.test(l) || l.startsWith('•') || l.startsWith('-')) {
        directives.push(cleanPdfText(l));
      } else if (!l.startsWith('#')) {
        directives.push(cleanPdfText(l));
      }
    } else if (currentSection !== 'table') {
      if (!l.startsWith('#') && !l.startsWith('|')) {
        generalLines.push(cleanPdfText(l));
      }
    }
  }

  return { highlights, directives, generalLines };
}

function generateRealPDF(exportFile, tableData) {
  try {
    const { fileName, title, summaryCards, tableHeaders, tableRows, content } = exportFile || {};

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 32;

    // ── 1. Top Enterprise Navy Header Banner ────────────────────────────
    doc.setFillColor(15, 23, 42); // #0f172a Deep Slate Navy
    doc.rect(0, 0, pageWidth, 58, 'F');
    doc.setFillColor(37, 99, 235); // #2563eb Blue Line
    doc.rect(0, 56, pageWidth, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('APS ENTERPRISES', margin, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(147, 197, 253);
    doc.text('INDUSTRIAL AUTOMATION & PRECISION MACHINERY', margin, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text('HQ: 832, Old Loha Mandi, Indore, MP - 452001 | Web: www.apsenterprises.in | Ph: +91-7869755871', pageWidth - margin, 34, { align: 'right' });

    // ── 2. Document Title ───────────────────────────────────────────────
    const rawTitle = title || (fileName || 'APS Intelligence Report').replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const docTitle = cleanPdfText(rawTitle);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(docTitle.toUpperCase(), margin, 80);

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${dateStr}  •  Status: Official Certified Export  •  Classification: Enterprise Internal Audit`, margin, 94);

    // ── 3. Summary Metric Cards ─────────────────────────────────────────
    let startY = 108;
    const cards = summaryCards && summaryCards.length > 0 ? summaryCards : [
      { label: 'Audit Status', val: 'Verified 100%' },
      { label: 'Security Level', val: 'Enterprise Grade' },
      { label: 'Execution', val: 'APS AI Cockpit' },
      { label: 'Classification', val: 'Certified Document' }
    ];

    const cardCount = cards.length;
    const totalCardsWidth = pageWidth - (margin * 2);
    const cardGap = 12;
    const cardWidth = (totalCardsWidth - (cardGap * (cardCount - 1))) / cardCount;
    const cardHeight = 40;

    cards.forEach((c, idx) => {
      const cx = margin + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.roundedRect(cx, startY, cardWidth, cardHeight, 4, 4, 'FD');

      const accentColors = [
        [37, 99, 235],   // Blue
        [16, 185, 129],  // Emerald
        [217, 119, 6],   // Amber
        [124, 58, 237]   // Purple
      ];
      const ac = accentColors[idx % accentColors.length];
      doc.setFillColor(ac[0], ac[1], ac[2]);
      doc.rect(cx, startY, 3.5, cardHeight, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(cleanPdfText(c.label).toUpperCase(), cx + 10, startY + 14);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanPdfText(String(c.val)), cx + 10, startY + 30);
    });

    startY += cardHeight + 14;

    // ── 4. Structured Table Grid ────────────────────────────────────────
    let headers = tableHeaders;
    let rows = tableRows;

    if (!headers || !rows || rows.length === 0) {
      if (tableData && Array.isArray(tableData) && tableData.length > 0) {
        headers = Object.keys(tableData[0]);
        rows = tableData.map(r => headers.map(k => String(r[k] ?? '')));
      } else if (content) {
        const mdTable = extractMarkdownTable(content);
        if (mdTable) {
          headers = mdTable.headers;
          rows = mdTable.rows;
        } else if (content.includes('\n')) {
          const csvLines = content.split('\n').filter(l => l.trim() && !l.startsWith('===') && !l.startsWith('---'));
          if (csvLines.length > 1 && csvLines[0].includes(',')) {
            headers = csvLines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            rows = csvLines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
          }
        }
      }
    }

    const { highlights, directives } = parseReportSections(content || '');

    if (headers && rows && rows.length > 0) {
      // Draw Executive Highlights callout box above the table if present
      if (highlights.length > 0) {
        const boxY = startY;
        const boxW = pageWidth - (margin * 2);
        const boxH = Math.min(50, 20 + Math.ceil(highlights.length / 2) * 12);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, boxY, boxW, boxH, 4, 4, 'FD');
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, boxY, 3.5, boxH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('EXECUTIVE AUDIT SUMMARY & OPERATIONAL HIGHLIGHTS', margin + 12, boxY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);

        const colW = (boxW - 24) / 2;
        highlights.slice(0, 4).forEach((hl, i) => {
          const hlx = margin + 12 + (i % 2) * colW;
          const hly = boxY + 24 + Math.floor(i / 2) * 11;
          doc.text(`* ${hl}`, hlx, hly, { maxWidth: colW - 8 });
        });

        startY = boxY + boxH + 12;
      }

      const cleanHeaders = headers.map(h => cleanPdfText(h));
      const cleanRows = rows.map(r => r.map(c => cleanPdfText(c)));

      const renderTable = typeof autoTable === 'function' ? autoTable : (autoTable?.default || (typeof doc.autoTable === 'function' ? doc.autoTable.bind(doc) : null));
      if (typeof renderTable === 'function') {
        renderTable(doc, {
          head: [cleanHeaders],
          body: cleanRows,
          startY: startY,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 5
          },
          bodyStyles: {
            fontSize: 7.5,
            textColor: [51, 65, 85],
            cellPadding: 4.5
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [15, 23, 42] },
            4: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] },
            5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
          }
        });

        // Strategic Directives section below the table
        if (directives.length > 0) {
          let afterTableY = (doc.lastAutoTable?.finalY || startY) + 14;
          if (afterTableY > pageHeight - 65) {
            doc.addPage();
            afterTableY = 40;
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text('STRATEGIC DIRECTIVES & OPERATIONAL ACTION PROTOCOL', margin, afterTableY);
          afterTableY += 12;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          directives.forEach(d => {
            if (afterTableY > pageHeight - 35) {
              doc.addPage();
              afterTableY = 40;
            }
            doc.text(d, margin + 8, afterTableY, { maxWidth: pageWidth - (margin * 2) - 16 });
            afterTableY += 11;
          });
        }
      }
    } else {
      // Clean fallback: sanitize content to strictly avoid printing scripts or code
      const sanitized = sanitizeReportContent(content || 'APS AI Executive Operational Report');
      const lines = sanitized.split('\n');
      let textY = startY;
      const maxTextWidth = pageWidth - (margin * 2);

      for (const rawLine of lines) {
        const cleanLine = cleanPdfText(rawLine);
        if (!cleanLine) {
          textY += 6;
          continue;
        }

        const isHeading = rawLine.startsWith('#');
        if (isHeading) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
        }

        const wrapped = doc.splitTextToSize(cleanLine, maxTextWidth);
        for (const subLine of wrapped) {
          if (textY > pageHeight - 40) {
            doc.addPage();
            textY = 40;
          }
          doc.text(subLine, margin, textY);
          textY += isHeading ? 16 : 13;
        }
      }
    }

    // ── 5. Enterprise Footers on Every Page ──────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('APS ENTERPRISES • CONFIDENTIAL INTERNAL AUDIT REPORT • INDORE, MP', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(fileName || 'APS_Enterprise_Report.pdf');
  } catch (err) {
    console.error('jsPDF AutoTable error:', err);
    const blob = new Blob([exportFile?.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (exportFile?.fileName || 'export.txt').replace(/\.pdf$/i, '.txt');
    document.body.appendChild(a);
    a.click();
  }
}

function ExportFileCard({ exportFile, tableData }) {
  if (!exportFile) return null;
  const { fileName, fileFormat, mimeType, sizeKB, content, downloadUrl } = exportFile;

  const handleDownload = () => {
    try {
      const fmtLower = (fileFormat || 'pdf').toLowerCase();

      // ── 1. Real PDF binary generation via jsPDF with autoTable ───────────
      if (fmtLower === 'pdf') {
        generateRealPDF(exportFile, tableData);
        return;
      }

      // ── 2. Real XLSX Binary Excel Workbook (via SheetJS XLSX) ─────────────
      if (fmtLower === 'xlsx' || fmtLower === 'excel') {
        let headers = [];
        let rows = [];

        if (tableData && Array.isArray(tableData) && tableData.length > 0) {
          headers = Object.keys(tableData[0]);
          rows = tableData.map(r => headers.map(k => String(r[k] || '')));
        } else if (exportFile?.tableHeaders && exportFile?.tableRows) {
          headers = exportFile.tableHeaders;
          rows = exportFile.tableRows;
        } else if (typeof content === 'string' && content.includes('\n')) {
          const lines = content.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            headers = lines[0].split(',').map(c => c.replace(/^"|"$/g, ''));
            rows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '')));
          }
        }

        const wb = XLSX.utils.book_new();
        const wsData = headers.length > 0 ? [headers, ...rows] : rows;
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "APS Export");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const rawName = fileName || 'APS_Enterprise_Export.xlsx';
        const outName = rawName.toLowerCase().endsWith('.xlsx') ? rawName : `${rawName.replace(/\.[^/.]+$/, '')}.xlsx`;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }

      // ── 3. Real Word document (.docx / .doc) ──────────────────────────
      if (fmtLower === 'docx' || fmtLower === 'word' || fmtLower === 'doc') {
        const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${fileName}</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; } h1 { color: #1d4ed8; } pre { font-family: Courier, monospace; background: #f8fafc; padding: 10px; }</style></head>
<body><h1>APS Enterprise — Certified Document</h1><p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p><hr/><pre>${content}</pre></body></html>`;
        const blob = new Blob(['\uFEFF' + docHtml], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let outName = fileName || 'APS_Enterprise_Export.doc';
        if (outName.toLowerCase().endsWith('.docx')) {
          outName = outName.slice(0, -1); // Change .docx to .doc
        } else if (!outName.toLowerCase().endsWith('.doc')) {
          outName = `${outName}.doc`;
        }
        
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }

      // ── 4. CSV with UTF-8 BOM ──────────────────────────────────────────
      if (fmtLower === 'csv') {
        let csvStr = '';
        if (tableData && Array.isArray(tableData) && tableData.length > 0) {
          const headers = Object.keys(tableData[0]);
          const rows = tableData.map(r => headers.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','));
          csvStr = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
        } else if (exportFile?.tableHeaders && exportFile?.tableRows) {
          const headers = exportFile.tableHeaders.map(h => `"${h}"`).join(',');
          const rows = exportFile.tableRows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          csvStr = `${headers}\n${rows}`;
        } else if (typeof content === 'string' && content.trim()) {
          csvStr = content;
        } else {
          csvStr = 'Export Data\n' + (fileName || 'APS_Export');
        }

        const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const rawName = fileName || 'APS_Enterprise_Export.csv';
        const outName = rawName.toLowerCase().endsWith('.csv') ? rawName : `${rawName.replace(/\.[^/.]+$/, '')}.csv`;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }

      // ── 5. JSON / XML / Others ─────────────────────────────────────────
      let mime = 'text/plain;charset=utf-8';
      if (fmtLower === 'json') mime = 'application/json;charset=utf-8';
      if (fmtLower === 'xml') mime = 'application/xml;charset=utf-8';

      const blob = new Blob([content || ''], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `APS_Enterprise_Export.${fmtLower}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error('Download error:', e);
      window.open(`${import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'}/a3/export?format=${(fileFormat || 'csv').toLowerCase()}`, '_blank');
    }
  };

  const fmt = (fileFormat || 'CSV').toUpperCase();

  return (
    <div style={s.fileExportCard}>
      <div style={s.fileExportLeft}>
        <div style={s.fileExportIcon}>
          {fmt}
        </div>
        <div>
          <div style={s.fileExportName}>{fileName || 'APS_AI_Response.pdf'}</div>
          <div style={s.fileExportMeta}>Click button below to download your generated {fmt} document • {sizeKB || 'Ready'}</div>
        </div>
      </div>
      <button
        onClick={handleDownload}
        style={s.fileDownloadBtn}
        id={`download-btn-${fmt.toLowerCase()}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Download {fmt} File</span>
      </button>
    </div>
  );
}

// ─── Message Component ────────────────────────────────────────────────────────
function MessageCard({ msg, onSelectOption }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={s.aiAvatarCircle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
            </svg>
          </div>
          <span style={s.aiNameBadge}>APS AI Executive</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        </div>
      )}

      <div className={isUser ? "apsai-user-bubble" : "apsai-bot-bubble"} style={isUser ? s.userBubble : s.botBubble}>
        {msg.loading ? (
          <div style={s.dotsContainer}>
            <span style={s.dot} />
            <span style={{ ...s.dot, animationDelay: '0.15s' }} />
            <span style={{ ...s.dot, animationDelay: '0.3s' }} />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 8, fontWeight: 500 }}>
              Synthesizing operational intelligence...
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: isUser ? '#fff' : '#334155' }}>
              <RenderText text={msg.text} isUser={isUser} />
            </div>
            {msg.options && msg.options.length > 0 && (
              <div style={s.optionsContainer}>
                {msg.options.map((opt, i) => (
                  <button key={i} className="apsai-option-chip" style={s.optionChip} onClick={() => onSelectOption ? onSelectOption(opt) : null}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {msg.exportFile && <ExportFileCard exportFile={msg.exportFile} tableData={msg.table} />}
            {msg.report && <ReportCard report={msg.report} />}
            {msg.table && <MiniTable rows={msg.table} />}
            {msg.chart && <SmartChart chart={msg.chart} />}

            {/* Interactive Action Toolbar for Bot Messages */}
            {!isUser && msg.text && (
              <div style={s.msgToolbar}>
                <button
                  onClick={handleCopy}
                  style={{
                    ...s.actionToolBtn,
                    background: copied ? '#f0fdf4' : '#f8fafc',
                    borderColor: copied ? '#bbf7d0' : '#e2e8f0',
                    color: copied ? '#166534' : '#64748b'
                  }}
                  title="Copy answer to clipboard"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {msg.processingMs && (
                  <span style={s.latencyBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span>{msg.processingMs}ms</span>
                  </span>
                )}

                <span style={s.timeBadge}>
                  {msg.time || 'Just now'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {isUser && (
        <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 4, marginRight: 6, fontWeight: 500 }}>
          {msg.time || 'Just now'}
        </span>
      )}
    </div>
  );
}

// ─── Welcome Message ──────────────────────────────────────────────────────────
function buildWelcomeText(user) {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isEmp = (user?.role || '').toLowerCase() === 'employee';
  const name = user?.name || (isEmp ? 'Team Member' : 'Bhavya');

  if (isEmp) {
    const lines = [
      `### ${greet}, ${name}`,
      `**${date}** — Welcome to your **APS Employee Workspace**.`,
      '',
      '---',
      '',
      "I'm your **Sales & Calling Co-Pilot** at APS Enterprise.",
      'You can ask me anything about your assigned leads, tasks, customer calls, or machine specs in **Hindi, English, or Hinglish**.',
      '',
      '**Quick Actions for your shift:**',
      '',
      '| Workplace Task | What to Ask |',
      '|---|---|',
      '| View your customer leads | *"Show my assigned leads"* |',
      '| Check today\'s assigned work | *"What are my active tasks?"* |',
      '| High-priority calling queue | *"Who should I call next?"* |',
      '| Check your personal score | *"Check my KPI score and performance"* |',
      '| Schedule client follow-up | *"Schedule a call for my lead"* |',
      '| Send WhatsApp reminder | *"Send WhatsApp message to lead"* |',
      '| Technical machine specs | *"Search CNC 500T specification manual"* |',
      '',
      '---',
      '*Need administrative changes or role permissions? Please contact your Manager or Administrator.*'
    ];
    return lines.join('\n');
  }

  const lines = [
    `### ${greet}, ${name}`,
    `**${date}** — APS Enterprise AI is fully online.`,
    '',
    '---',
    '',
    "I'm your **Autonomous Business Intelligence Co-Pilot** for APS Enterprise.",
    'Ask me anything in **Hindi, English, or Hinglish** — I understand it all.',
    '',
    '**Try these right now:**',
    '',
    '| Capability | Say this |',
    '|---|---|',
    '| Full CRM leads table | *"Show all CRM leads"* |',
    '| Assign tasks to team | *"Assign tasks to all employees"* |',
    '| Target one employee | *"Assign task to Animesh"* |',
    '| Revenue & pipeline | *"Show revenue summary"* |',
    '| Top performer | *"Who is the top performer?"* |',
    '| Schedule a call | *"Schedule call for Priya Soni"* |',
    '| WhatsApp reminder | *"Send WhatsApp to Global Tech"* |',
    '| Factory job cards | *"Track factory job card status"* |',
    '| GST Invoice | *"Generate GST invoice for 42000"* |',
    '| AI Revenue Forecast | *"Predict September revenue"* |',
    '| Export data | *"Export all leads as Excel"* |',
    '',
    '---',
    '*Note: Conversation context is preserved for up to 2 hours.*'
  ];
  return lines.join('\n');
}

const WELCOME_MSG = {
  role: 'bot',
  isWelcome: true,
  text: buildWelcomeText(),
  table: null,
  chart: null
};

// ─── Query Category Icon Component (Clean Vector SVGs) ───────────────────────
function QueryIcon({ name, size = 14, color = '#64748b' }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flexShrink: 0 }
  };
  switch (name) {
    case 'factory':
      return (
        <svg {...p}><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="17" y1="18" x2="18" y2="18"/><line x1="12" y1="18" x2="13" y2="18"/><line x1="7" y1="18" x2="8" y2="18"/></svg>
      );
    case 'search':
      return (
        <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      );
    case 'package':
      return (
        <svg {...p}><line x1="16.5" y1="9.4" x2="7.55" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      );
    case 'message':
      return (
        <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      );
    case 'receipt':
      return (
        <svg {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>
      );
    case 'percent':
      return (
        <svg {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
      );
    case 'bar-chart':
      return (
        <svg {...p}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
      );
    case 'award':
      return (
        <svg {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
      );
    case 'trending':
      return (
        <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      );
    case 'alert':
      return (
        <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      );
    case 'mic':
      return (
        <svg {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      );
    case 'mail':
      return (
        <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      );
    case 'excel':
    case 'file':
      return (
        <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      );
    default:
      return (
        <svg {...p}><circle cx="12" cy="12" r="9"/></svg>
      );
  }
}

// ─── Curated Common Queries Catalog (Single Source of Truth) ──────────────────
const SIDEBAR_COMMON_QUERIES = [
  // Operations
  { label: 'Factory Job Card Tracker', query: 'Track factory job card assembly status', category: 'ops', icon: 'factory' },
  { label: 'Search PDF Catalog (RAG)', query: 'Search CNC 500T specification manual', category: 'ops', icon: 'search' },
  { label: 'Warehouse Inventory Stock', query: 'Check warehouse inventory stock', category: 'ops', icon: 'package' },
  { label: 'WhatsApp Campaign Analytics', query: 'Show WhatsApp campaign performance analytics', category: 'ops', icon: 'message' },

  // Finance & ERP
  { label: 'Generate GST Tax Invoice', query: 'Generate GST tax invoice for 42000', category: 'finance', icon: 'receipt' },
  { label: 'Order Profit Margin Calculator', query: 'Calculate profit margin for 150000 CNC order', category: 'finance', icon: 'percent' },
  { label: 'Generate PDF Executive Report', query: 'Generate Executive PDF Report', category: 'finance', icon: 'bar-chart' },

  // Sales & CRM
  { label: 'Sales Team Leaderboard', query: 'Show sales team leaderboard and badges', category: 'sales', icon: 'award' },
  { label: 'Predictive Sales Forecast', query: 'Predict September revenue forecast', category: 'sales', icon: 'trending' },
  { label: 'Lead Churn Risk Audit', query: 'Which leads are at risk of churn?', category: 'sales', icon: 'alert' },
  { label: 'Voice Call Sentiment Audit', query: 'Analyze voice call sentiment and transcripts', category: 'sales', icon: 'mic' },
  { label: 'Send Email Quotation PDF', query: 'Send email quotation PDF to Global Tech', category: 'sales', icon: 'mail' },
  { label: 'Export Leads Data to Excel', query: 'Export leads to Excel', category: 'sales', icon: 'excel' },
  { label: 'Export Leads Data to CSV', query: 'Export leads to CSV', category: 'sales', icon: 'file' }
];

// ─── Employee Curated Queries (Restricted Role Catalog) ──────────────────────
const EMPLOYEE_COMMON_QUERIES = [
  // My Leads & Tasks
  { label: 'My Assigned Leads', query: 'Show my assigned leads', category: 'crm', icon: 'file' },
  { label: 'My Active Tasks Today', query: 'What are my active tasks?', category: 'crm', icon: 'award' },
  { label: 'Upcoming Client Follow-ups', query: 'Show my upcoming follow-ups', category: 'crm', icon: 'trending' },

  // Calling & Customer Communication
  { label: 'Who Should I Call Next?', query: 'Show priority calling list', category: 'comms', icon: 'mic' },
  { label: 'Schedule Follow-Up Call', query: 'Schedule call for client', category: 'comms', icon: 'mic' },
  { label: 'Send WhatsApp Update', query: 'Send WhatsApp message to lead', category: 'comms', icon: 'message' },

  // Product & Performance
  { label: 'Check My Personal KPI Score', query: 'Show my personal KPI score and performance', category: 'performance', icon: 'award' },
  { label: 'Search CNC Machine Specs', query: 'Search CNC 500T specification manual', category: 'products', icon: 'search' },
  { label: 'Factory Assembly Job Card Status', query: 'Track factory job card assembly status', category: 'products', icon: 'factory' }
];

// ─── MAIN APS AI PAGE COMPONENT ───────────────────────────────────────────────
export default function APSAIPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userRole = (currentUser?.role || '').toLowerCase().trim();
  const isEmployee = userRole === 'employee';
  const userName = currentUser?.name || (isEmployee ? 'Sales Executive' : 'Administrator');
  const employeeId = currentUser?.employeeId || currentUser?.id || null;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = loadHistory();
    return saved && saved.length > 0 ? saved : [{
      role: 'bot',
      isWelcome: true,
      text: buildWelcomeText(currentUser),
      table: null,
      chart: null
    }];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const convId = useRef(getConversationId());

  // ─── Sidebar Common Queries State (Filter & Search) ──────────────────────
  const [queryCategory, setQueryCategory] = useState('all');
  const [querySearch, setQuerySearch] = useState('');

  const activeCatalog = isEmployee ? EMPLOYEE_COMMON_QUERIES : SIDEBAR_COMMON_QUERIES;

  const filteredQueries = useMemo(() => {
    return activeCatalog.filter(item => {
      const matchCat = queryCategory === 'all' || item.category === queryCategory;
      const matchSearch = !querySearch.trim() ||
        item.label.toLowerCase().includes(querySearch.toLowerCase()) ||
        item.query.toLowerCase().includes(querySearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCatalog, queryCategory, querySearch]);

  // ─── Persistent AI Memory State ──────────────────────────────────────────
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoriesList, setMemoriesList] = useState([]);
  const [memoryFilter, setMemoryFilter] = useState('ALL');
  const [memorySearchText, setMemorySearchText] = useState('');
  const [newMemoryFact, setNewMemoryFact] = useState('');
  const [newMemoryTarget, setNewMemoryTarget] = useState('');
  const [memorySaving, setMemorySaving] = useState(false);
  const [memoryAlert, setMemoryAlert] = useState(null);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/memory`);
      if (res.data?.memories) {
        setMemoriesList(res.data.memories);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleSaveMemoryDirect = async (e) => {
    if (e) e.preventDefault();
    if (!newMemoryFact || !newMemoryFact.trim() || memorySaving) return;
    setMemorySaving(true);
    setMemoryAlert(null);
    try {
      const res = await axios.post(`${API}/memory`, {
        fact: newMemoryFact.trim(),
        target: newMemoryTarget.trim() || null,
        type: 'LEARNED_FACT'
      });
      if (res.data?.success) {
        setNewMemoryFact('');
        setNewMemoryTarget('');
        setMemoryAlert({ type: 'success', text: 'Knowledge successfully saved to AI persistent memory!' });
        fetchMemories();
        setTimeout(() => setMemoryAlert(null), 4000);
      }
    } catch {
      setMemoryAlert({ type: 'error', text: 'Failed to save memory to backend.' });
    } finally {
      setMemorySaving(false);
    }
  };

  const handleDeleteMemoryItem = async (id) => {
    try {
      await axios.delete(`${API}/memory/${id}`);
      fetchMemories();
    } catch {}
  };

  const handleClearAllMemory = async () => {
    if (!window.confirm('Are you sure you want to reset all AI persistent memories to initial system state?')) return;
    try {
      await axios.delete(`${API}/memory`);
      fetchMemories();
      setMemoryAlert({ type: 'success', text: 'All memories reset to initial baseline.' });
      setTimeout(() => setMemoryAlert(null), 3000);
    } catch {}
  };

  // Save history whenever messages change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Load suggestions
  useEffect(() => {
    axios.get(`${API}/suggestions`)
      .then(r => setSuggestions(r.data.suggestions || []))
      .catch(() => { });
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

  // Auto scroll - strictly scoped to messagesArea container, never scroll outer window/page layout, and never scroll on initial welcome view
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && !messages[0]?.isWelcome)) {
      const container = document.getElementById('apsai-page-messages');
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    sessionStorage.removeItem('apsai_conv_id');
    convId.current = getConversationId();
    setMessages([{
      role: 'bot',
      isWelcome: true,
      text: buildWelcomeText(currentUser),
      table: null,
      chart: null
    }]);
  };

  // Auto focus input on mount and when loading finishes
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);

  const sendQuery = useCallback(async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const timeNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: q, time: timeNow }]);
    setMessages(prev => [...prev, { role: 'bot', text: '', loading: true, time: timeNow }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/query`, {
        query: q,
        conversationId: convId.current,
        userRole: userRole,
        userName: userName,
        employeeId: employeeId
      });

      // Synchronize created users to client storage (for cross-page & Vercel persistence)
      if (data.createdSystemUsers && Array.isArray(data.createdSystemUsers) && data.createdSystemUsers.length > 0) {
        try {
          const raw = localStorage.getItem('aps_system_users');
          let list = raw ? JSON.parse(raw) : [];
          data.createdSystemUsers.forEach(u => {
            if (!list.some(existing => existing.email === u.email || (existing.name === u.name && existing.role === u.role))) {
              list.unshift(u);
            }
          });
          localStorage.setItem('aps_system_users', JSON.stringify(list));
          window.dispatchEvent(new CustomEvent('aps_users_updated', { detail: list }));
          window.dispatchEvent(new CustomEvent('aps_employees_updated', { detail: data.createdEmployees }));
        } catch {}
      }

      // Synchronize assigned tasks in real-time across Team KPIs & platform
      if (data.assignedEmployees && Array.isArray(data.assignedEmployees) && data.assignedEmployees.length > 0) {
        try {
          window.dispatchEvent(new CustomEvent('aps_employees_updated', { detail: data.assignedEmployees }));
        } catch {}
      } else if (data.table && Array.isArray(data.table) && data.table.some(r => r.User || (r.Name && r.Role && !r.Stage))) {
        try {
          const raw = localStorage.getItem('aps_system_users');
          let list = raw ? JSON.parse(raw) : [];
          data.table.forEach(r => {
            const name = r.User || r.Name;
            const role = r['System Role'] || r.Role || 'Operations';
            const email = r.Email || `${(name || 'user').toLowerCase().replace(/\s+/g, '.')}@aps-enterprise.com`;
            const module = r['Module Scope'] || (role === 'Admin' ? 'Dashboard & Core' : (role === 'Super Admin' ? 'Voice AI' : (role === 'Telecaller' ? 'Voice AI' : (role === 'Agent' ? 'WhatsApp & Analytics' : 'Operations & CRM'))));
            if (name && !list.some(existing => existing.email === email || (existing.name === name && existing.role === role))) {
              list.unshift({
                id: `u_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name,
                email,
                role,
                module,
                lastLogin: 'Just now',
                status: 'Online'
              });
            }
          });
          localStorage.setItem('aps_system_users', JSON.stringify(list));
          window.dispatchEvent(new CustomEvent('aps_users_updated', { detail: list }));
        } catch {}
      }

      // Real-time synchronization for CRM Leads
      if (data.createdLead || data.updatedLead) {
        try {
          window.dispatchEvent(new CustomEvent('aps_leads_updated', { detail: data.createdLead || data.updatedLead }));
        } catch {}
      }

      // Real-time synchronization for Tally Vouchers & Payments
      if (data.createdVoucher) {
        try {
          window.dispatchEvent(new CustomEvent('aps_tally_updated', { detail: data.createdVoucher }));
          window.dispatchEvent(new CustomEvent('aps_leads_updated', { detail: data.updatedLead }));
        } catch {}
      }

      // Real-time synchronization for Factory ERP Job Cards & Bookings
      if (data.createdJobCard) {
        try {
          window.dispatchEvent(new CustomEvent('aps_bookings_updated', { detail: data.createdJobCard }));
          window.dispatchEvent(new CustomEvent('aps_leads_updated', { detail: data.updatedLead }));
        } catch {}
      }

      // Real-time synchronization for GST Tax Invoices
      if (data.createdInvoice) {
        try {
          window.dispatchEvent(new CustomEvent('aps_invoices_updated', { detail: data.createdInvoice }));
        } catch {}
      }

      // Real-time synchronization for Voice Dialer
      if (data.queuedCall) {
        try {
          window.dispatchEvent(new CustomEvent('aps_dialer_updated', { detail: data.queuedCall }));
        } catch {}
      }

      // Real-time synchronization for WhatsApp Automation
      if (data.sentWhatsAppMessage) {
        try {
          window.dispatchEvent(new CustomEvent('aps_whatsapp_updated', { detail: data.sentWhatsAppMessage }));
        } catch {}
      }
      fetchMemories();

      setMessages(prev => [
        ...prev.slice(0, -1),
        sanitizeMsg({
          role: 'bot',
          text: data.text || data.answer,
          options: data.options || null,
          table: data.table,
          chart: data.chart,
          report: data.report,
          exportFile: data.exportFile,
          processingMs: data.processingMs,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        })
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'bot',
          text: 'Could not connect to the backend server. Please verify port 5000 is online.',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
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
    <div className="apsai-page-wrapper" style={s.pageWrapper}>
      {/* ─── Top Page Header ────────────────────────────────────────── */}
      <div className="apsai-header-banner" style={s.headerBanner}>
        <div className="apsai-header-left" style={s.headerLeft}>
          <div style={s.headerIconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
            </svg>
          </div>
          <div>
            <h1 className="apsai-header-title" style={s.headerTitle}>APS AI — Business Intelligence Agent</h1>
          </div>
        </div>

        <div className="apsai-header-right" style={s.headerRight}>
          {!isEmployee && (
            <button
              onClick={() => {
                setShowMemoryModal(true);
                fetchMemories();
              }}
              style={s.memoryHeaderBtn}
              title="View & Manage AI Persistent Memory"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
              </svg>
              <span style={{ fontWeight: 700 }}>AI Memory</span>
              <span style={s.memoryBadgeCount}>{memoriesList.length}</span>
            </button>
          )}

          <button onClick={clearHistory} style={s.actionBtn} title="Reset Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* ─── Main Workspace Grid ────────────────────────────────────── */}
      <div className="apsai-main-grid" style={s.mainGrid}>
        {/* Left Side: Quick Query Categories & Live Metrics */}
        <div className="apsai-side-nav" style={s.sideNav} id="apsai-side-nav">
          <div style={s.sideCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ ...s.sideCardTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Common Queries</span>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 7px', borderRadius: 10, border: '1px solid #dbeafe' }}>
                {filteredQueries.length}
              </span>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '0.6rem', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {(isEmployee ? [
                { id: 'all', label: 'All' },
                { id: 'crm', label: 'My Leads' },
                { id: 'comms', label: 'Calling' },
                { id: 'performance', label: 'My KPI' },
                { id: 'products', label: 'Products' }
              ] : [
                { id: 'all', label: 'All' },
                { id: 'ops', label: 'Ops' },
                { id: 'finance', label: 'Finance' },
                { id: 'sales', label: 'Sales' }
              ]).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setQueryCategory(cat.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 12,
                    border: '1px solid',
                    borderColor: queryCategory === cat.id ? '#2563eb' : '#e2e8f0',
                    background: queryCategory === cat.id ? '#2563eb' : '#f8fafc',
                    color: queryCategory === cat.id ? '#ffffff' : '#64748b',
                    fontSize: '0.68rem',
                    fontWeight: queryCategory === cat.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Search Box */}
            <div style={{ marginBottom: '0.6rem', position: 'relative' }}>
              <input
                type="text"
                value={querySearch}
                onChange={e => setQuerySearch(e.target.value)}
                placeholder="Search queries..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.72rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {querySearch && (
                <button
                  type="button"
                  onClick={() => setQuerySearch('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '2px 4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Categorized Queries List */}
            <div style={{ ...s.quickList, maxHeight: '200px', overflowY: 'auto', paddingRight: 2 }}>
              {filteredQueries.length > 0 ? (
                filteredQueries.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => sendQuery(item.query)}
                    disabled={loading}
                    className="apsai-query-btn"
                    style={s.quickQueryBtn}
                    title={item.query}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <QueryIcon name={item.icon} size={14} color="#64748b" />
                    </span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: '12px 6px', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                  No queries match your search
                </div>
              )}
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

          {isEmployee ? (
            <div style={{ ...s.sideCard, marginTop: '1rem', background: '#f8fafc', borderColor: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ ...s.sideCardTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Employee Desk</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                  Active
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                Logged in as <strong>{userName}</strong> (Sales & Calling Executive). Only your authorized workspace items are accessible.
              </p>
              <button
                onClick={() => sendQuery("Show my assigned leads")}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                View My Leads
              </button>
            </div>
          ) : (
            <div style={{ ...s.sideCard, marginTop: '1rem', background: '#f8fafc', borderColor: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ ...s.sideCardTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                  </svg>
                  <span>AI Persistent Memory</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                  {memoriesList.length} items
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                APS AI saves learned facts, employee boundaries, and actions across all sessions.
              </p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button
                  onClick={() => { setShowMemoryModal(true); fetchMemories(); }}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Open Memory Hub
                </button>
                <button
                  onClick={() => sendQuery("Show AI memory")}
                  style={{ padding: '6px 10px', borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  title="Print memory in chat"
                >
                  Log to Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat Conversation Area */}
        <div className="apsai-chat-container" style={s.chatContainer}>
          <style>{`
            .apsai-landing-card {
              transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
              cursor: pointer;
            }
            .apsai-landing-card:hover {
              border-color: #2563eb !important;
              background-color: #f8fafc !important;
              box-shadow: 0 4px 14px rgba(37,99,235,0.08) !important;
            }
            .apsai-option-chip:hover {
              background-color: #f8fafc !important;
              border-color: #2563eb !important;
              color: #2563eb !important;
            }
            .apsai-query-btn {
              transition: all 0.15s ease;
            }
            .apsai-query-btn:hover {
              background-color: #eff6ff !important;
              border-color: #93c5fd !important;
              color: #1d4ed8 !important;
            }
            #apsai-page-suggest-row::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            #apsai-side-nav::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            #apsai-page-messages::-webkit-scrollbar {
              width: 6px;
            }
            #apsai-page-messages::-webkit-scrollbar-track {
              background: transparent;
            }
            #apsai-page-messages::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            #apsai-page-messages::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }

            /* ─── Fully Responsive Layout for Mobile, Tablet, & Desktop ─── */
            @media (max-width: 1024px) {
              .apsai-page-wrapper {
                padding: 0.75rem 1rem !important;
              }
            }
            @media (max-width: 960px) {
              .apsai-page-wrapper {
                height: auto !important;
                max-height: none !important;
                overflow-y: auto !important;
                padding: 0.75rem !important;
              }
              .apsai-main-grid {
                grid-template-columns: 1fr !important;
                overflow: visible !important;
                gap: 0.85rem !important;
              }
              .apsai-side-nav {
                max-height: 240px !important;
                overflow-y: auto !important;
                margin-bottom: 0.25rem !important;
              }
              .apsai-chat-container {
                height: 70vh !important;
                min-height: 520px !important;
              }
              .apsai-landing-grid {
                grid-template-columns: repeat(2, 1fr) !important;
              }
            }
            @media (max-width: 640px) {
              .apsai-page-wrapper {
                padding: 0.4rem !important;
              }
              .apsai-header-banner {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 10px !important;
                padding: 0.75rem 0.85rem !important;
              }
              .apsai-header-left {
                gap: 10px !important;
                width: 100% !important;
              }
              .apsai-header-title {
                font-size: 1.1rem !important;
              }
              .apsai-header-right {
                width: 100% !important;
                display: flex !important;
                justify-content: space-between !important;
                gap: 8px !important;
              }
              .apsai-chat-container {
                height: 75vh !important;
                min-height: 450px !important;
              }
              .apsai-messages-area {
                padding: 0.85rem 0.75rem !important;
              }
              .apsai-welcome-header {
                font-size: 1.35rem !important;
              }
              .apsai-welcome-sub {
                font-size: 0.78rem !important;
                margin-bottom: 1rem !important;
              }
              .apsai-landing-grid {
                grid-template-columns: 1fr !important;
                gap: 0.6rem !important;
              }
              .apsai-landing-card {
                padding: 10px 12px !important;
              }
              .apsai-user-bubble {
                max-width: 92% !important;
                padding: 10px 14px !important;
              }
              .apsai-bot-bubble {
                max-width: 98% !important;
                padding: 12px 14px !important;
              }
              .apsai-input-wrapper {
                padding: 0.75rem 0.85rem !important;
              }
              .apsai-input-actions {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 8px !important;
              }
              .apsai-input-actions > div:first-child {
                justify-content: space-between !important;
              }
              .apsai-modal-container {
                max-height: 94vh !important;
                border-radius: 14px !important;
              }
              .apsai-memory-stats-row {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 6px !important;
                padding: 0.75rem !important;
              }
              .apsai-teach-inputs-row {
                flex-direction: column !important;
                align-items: stretch !important;
              }
              .apsai-filter-bar {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 8px !important;
                padding: 0.6rem 0.85rem !important;
              }
              .apsai-modal-footer {
                flex-direction: column !important;
                gap: 8px !important;
                padding: 0.75rem !important;
              }
            }
          `}</style>
          {/* Messages scroll area */}
          <div className="apsai-messages-area" style={s.messagesArea} id="apsai-page-messages">
            {messages.length === 1 && messages[0].isWelcome ? (
              <div className="apsai-welcome-landing" style={s.welcomeLanding}>
                <h1 className="apsai-welcome-header" style={s.welcomeHeader}>How can I help you today?</h1>
                <p className="apsai-welcome-sub" style={s.welcomeSub}>
                  Your real-time operations co-pilot for <strong>APS Enterprise</strong>. Control tasks, dialers, CRM, invoices, and Tally in English, Hindi, or Hinglish.
                </p>
                
                <div className="apsai-landing-grid" style={s.landingGrid}>
                  {isEmployee ? (
                    <>
                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("Show my assigned leads")}>
                        <div style={{ ...s.cardIcon, color: '#2563eb', background: '#eff6ff', borderColor: '#dbeafe' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>My Assigned Leads</div>
                          <div style={s.cardDesc}>View your active customer leads, contact numbers, and deal stages.</div>
                        </div>
                      </div>

                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("Show priority calling list")}>
                        <div style={{ ...s.cardIcon, color: '#059669', background: '#ecfdf5', borderColor: '#d1fae5' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Priority Calling Queue</div>
                          <div style={s.cardDesc}>Find high-value clients to call next and schedule follow-ups.</div>
                        </div>
                      </div>

                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("Show my personal KPI score and performance")}>
                        <div style={{ ...s.cardIcon, color: '#7c3aed', background: '#f5f3ff', borderColor: '#ede9fe' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="7" />
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>My KPI Scorecard</div>
                          <div style={s.cardDesc}>Track your closed deals, call volume, and personal rating.</div>
                        </div>
                      </div>

                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("Search CNC 500T specification manual")}>
                        <div style={{ ...s.cardIcon, color: '#d97706', background: '#fffbeb', borderColor: '#fef3c7' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Machine Specifications</div>
                          <div style={s.cardDesc}>Instant technical parameters, capacity, and catalog specs for clients.</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("assign team tasks options")}>
                        <div style={{ ...s.cardIcon, color: '#2563eb', background: '#eff6ff', borderColor: '#dbeafe' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            <path d="M9 14l2 2 4-4" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Assign Team Tasks</div>
                          <div style={s.cardDesc}>Allocate role-based task backlogs to all staff members instantly.</div>
                        </div>
                      </div>
                      
                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("billing & invoices options")}>
                        <div style={{ ...s.cardIcon, color: '#7c3aed', background: '#f5f3ff', borderColor: '#ede9fe' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2z" />
                            <line x1="8" y1="7" x2="16" y2="7" />
                            <line x1="8" y1="11" x2="16" y2="11" />
                            <line x1="8" y1="15" x2="12" y2="15" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Billing & Invoices</div>
                          <div style={s.cardDesc}>Generate proforma or tax invoices with 18% GST splits.</div>
                        </div>
                      </div>
                      
                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("voice dialer options")}>
                        <div style={{ ...s.cardIcon, color: '#059669', background: '#ecfdf5', borderColor: '#d1fae5' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Voice Dialer</div>
                          <div style={s.cardDesc}>Schedule follow-up calls or run sentiment audits on call logs.</div>
                        </div>
                      </div>
                      
                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("production progress options")}>
                        <div style={{ ...s.cardIcon, color: '#d97706', background: '#fffbeb', borderColor: '#fef3c7' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                            <path d="M17 18h1" />
                            <path d="M12 18h1" />
                            <path d="M7 18h1" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>Production Progress</div>
                          <div style={s.cardDesc}>Track factory assembly status and release manufacturing job cards.</div>
                        </div>
                      </div>

                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => { setShowMemoryModal(true); fetchMemories(); }}>
                        <div style={{ ...s.cardIcon, color: '#0284c7', background: '#f0f9ff', borderColor: '#e0f2fe' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <rect x="9" y="9" width="6" height="6" />
                            <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                            <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>AI Persistent Memory Space</div>
                          <div style={s.cardDesc}>View what the AI has remembered, teach new operational directives, or check action logs.</div>
                        </div>
                      </div>

                      <div className="apsai-landing-card" style={s.landingCard} onClick={() => sendQuery("Show WhatsApp campaign performance analytics")}>
                        <div style={{ ...s.cardIcon, color: '#059669', background: '#ecfdf5', borderColor: '#d1fae5' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        </div>
                        <div style={s.cardContent}>
                          <div style={s.cardTitle}>WhatsApp Automation</div>
                          <div style={s.cardDesc}>Broadcast message templates and view real-time delivery logs.</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <MessageCard key={i} msg={msg} onSelectOption={sendQuery} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Box */}
          <div className="apsai-input-wrapper" style={s.inputWrapper}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isListening ? "Listening to your voice..." : "Ask APS AI about your sales, pipeline, revenue, leads, or team (or pick a query from the left)..."}
              style={{
                ...s.inputField,
                backgroundColor: isListening ? '#fef3c7' : '#f8fafc',
                borderColor: isListening ? '#f59e0b' : '#cbd5e1'
              }}
              rows={2}
              disabled={loading}
            />

            <div className="apsai-input-actions" style={s.inputActions}>
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
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
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
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── AI Persistent Memory Modal & Knowledge Space ────────────────── */}
      {showMemoryModal && (
        <div style={s.modalBackdrop} onClick={() => setShowMemoryModal(false)}>
          <div className="apsai-modal-container" style={s.modalContainer} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={s.modalBrainIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                  </svg>
                </div>
                <div>
                  <h2 style={s.modalTitle}>APS AI — Persistent Memory & Knowledge Space</h2>
                  <div style={s.modalSubtitle}>
                    All operational actions, learned guidelines, and security boundaries preserved across sessions
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                style={s.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Quick KPI Stats Summary */}
            <div className="apsai-memory-stats-row" style={s.memoryStatsRow}>
              <div style={s.memoryStatCard}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div>
                  <div style={s.memoryStatVal}>{memoriesList.filter(m => m.type === 'LEARNED_FACT').length}</div>
                  <div style={s.memoryStatLbl}>Learned Directives</div>
                </div>
              </div>
              <div style={s.memoryStatCard}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                <div>
                  <div style={s.memoryStatVal}>{memoriesList.filter(m => m.type === 'TASK_ASSIGNED').length}</div>
                  <div style={s.memoryStatLbl}>Tasks Allocated</div>
                </div>
              </div>
              <div style={s.memoryStatCard}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <div>
                  <div style={s.memoryStatVal}>{memoriesList.filter(m => m.type === 'TASK_REJECTED').length}</div>
                  <div style={s.memoryStatLbl}>Guarded Actions</div>
                </div>
              </div>
              <div style={s.memoryStatCard}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <div>
                  <div style={s.memoryStatVal}>6 Active</div>
                  <div style={s.memoryStatLbl}>Registered Employees</div>
                </div>
              </div>
            </div>

            {/* Direct Teach Form */}
            <form onSubmit={handleSaveMemoryDirect} style={s.teachForm}>
              <div style={s.teachFormTitle}>
                Teach AI New Memory or Entity Directive
              </div>
              {memoryAlert && (
                <div style={memoryAlert.type === 'success' ? s.alertSuccess : s.alertError}>
                  {memoryAlert.text}
                </div>
              )}
              <div className="apsai-teach-inputs-row" style={s.teachInputsRow}>
                <input
                  type="text"
                  placeholder="e.g. Animesh is our machinery raw material vendor from Bhopal..."
                  value={newMemoryFact}
                  onChange={(e) => setNewMemoryFact(e.target.value)}
                  style={s.teachInputFact}
                />
                <input
                  type="text"
                  placeholder="Entity (e.g. Animesh)"
                  value={newMemoryTarget}
                  onChange={(e) => setNewMemoryTarget(e.target.value)}
                  style={s.teachInputTarget}
                />
                <button
                  type="submit"
                  disabled={!newMemoryFact.trim() || memorySaving}
                  style={s.teachSubmitBtn}
                >
                  {memorySaving ? 'Saving...' : 'Save to Memory'}
                </button>
              </div>
            </form>

            {/* Search and Category Filters */}
            <div className="apsai-filter-bar" style={s.filterBar}>
              <div style={s.filterChips}>
                {[
                  { key: 'ALL', label: `All (${memoriesList.length})` },
                  { key: 'LEARNED_FACT', label: `Learned (${memoriesList.filter(m => m.type === 'LEARNED_FACT').length})` },
                  { key: 'TASK_ASSIGNED', label: `Tasks (${memoriesList.filter(m => m.type === 'TASK_ASSIGNED').length})` },
                  { key: 'TASK_REJECTED', label: `Guarded (${memoriesList.filter(m => m.type === 'TASK_REJECTED').length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMemoryFilter(tab.key)}
                    style={{
                      ...s.filterChip,
                      ...(memoryFilter === tab.key ? s.filterChipActive : {})
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search memories..."
                value={memorySearchText}
                onChange={(e) => setMemorySearchText(e.target.value)}
                style={s.filterSearchInput}
              />
            </div>

            {/* Memories Scrollable List */}
            <div style={s.memoriesScrollList}>
              {(() => {
                const filtered = memoriesList.filter(m => {
                  if (memoryFilter !== 'ALL' && m.type !== memoryFilter) return false;
                  if (memorySearchText && memorySearchText.trim()) {
                    const q = memorySearchText.toLowerCase();
                    return (
                      (m.summary && m.summary.toLowerCase().includes(q)) ||
                      (m.target && m.target.toLowerCase().includes(q)) ||
                      (m.type && m.type.toLowerCase().includes(q))
                    );
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={s.emptyMemoryState}>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <rect x="9" y="9" width="6" height="6" />
                        </svg>
                      </div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>No memories found</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Teach the AI a new rule above or perform operational tasks to populate persistent memory.
                      </div>
                    </div>
                  );
                }

                return filtered.map((m, idx) => {
                  const isLearned = m.type === 'LEARNED_FACT';
                  const isTask = m.type === 'TASK_ASSIGNED';
                  const isRejected = m.type === 'TASK_REJECTED';
                  const dateStr = new Date(m.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  const timeStr = new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.id || idx} style={s.memoryItemCard}>
                      <div style={s.memoryItemHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            ...s.typeBadge,
                            ...(isLearned ? s.typeBadgeLearned : (isTask ? s.typeBadgeTask : (isRejected ? s.typeBadgeRejected : s.typeBadgeSystem)))
                          }}>
                            {isLearned ? 'LEARNED FACT' : (isTask ? 'TASK ASSIGNED' : (isRejected ? 'GUARDED REJECTION' : 'SYSTEM'))}
                          </span>
                          {m.target && (
                            <span style={s.targetBadge}>
                              Target: <strong>{m.target}</strong>
                            </span>
                          )}
                          <span style={s.memoryTime}>{dateStr} {timeStr}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteMemoryItem(m.id)}
                          style={s.deleteMemoryBtn}
                          title="Delete memory entry"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                      <div style={s.memorySummaryText}>{m.summary}</div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="apsai-modal-footer" style={s.modalFooter}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleClearAllMemory}
                  style={s.footerSecondaryBtn}
                >
                  Reset Memory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMemoryModal(false);
                    sendQuery("Show AI memory");
                  }}
                  style={s.footerQueryBtn}
                >
                  Recall in Chat
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMemoryModal(false)}
                style={s.footerCloseBtn}
              >
                Close Space
              </button>
            </div>
          </div>
        </div>
      )}

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
  // Welcome landing layout (like ChatGPT / Gemini)
  welcomeLanding: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '1.25rem 1rem',
    boxSizing: 'border-box'
  },
  welcomeHeader: {
    fontSize: '1.85rem',
    fontWeight: 800,
    margin: '0 0 0.4rem 0',
    letterSpacing: '-0.6px',
    background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 60%, #4f46e5 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontFamily: 'Inter, -apple-system, sans-serif'
  },
  welcomeSub: {
    fontSize: '0.88rem',
    color: '#64748b',
    maxWidth: '560px',
    margin: '0 0 1.5rem 0',
    lineHeight: 1.5
  },
  landingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.85rem',
    width: '100%',
    maxWidth: '720px',
    boxSizing: 'border-box'
  },
  landingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
    boxSizing: 'border-box'
  },
  cardIcon: {
    width: 38,
    height: 38,
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  cardTitle: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: '#0f172a'
  },
  cardDesc: {
    fontSize: '0.74rem',
    color: '#64748b',
    lineHeight: 1.35
  },

  pageWrapper: {
    padding: '1rem 1.5rem 1.25rem',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    height: '100%',
    maxHeight: 'calc(100vh - 62px)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },

  // Header Banner
  headerBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    padding: '0.9rem 1.25rem',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    marginBottom: '0.85rem',
    flexShrink: 0
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
    flexShrink: 0
  },
  headerTitle: { fontSize: '1.35rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.3px' },
  headerSubtitle: { fontSize: '0.8rem', color: '#71717a', margin: '3px 0 0' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#f4f4f5',
    border: '1px solid #e4e4e7',
    padding: '6px 12px',
    borderRadius: 20
  },
  statDot: { width: 7, height: 7, borderRadius: '50%', background: '#09090b' },
  statText: { fontSize: '0.72rem', fontWeight: 700, color: '#09090b' },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px solid #e4e4e7',
    color: '#3f3f46',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  // Main Grid Layout
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '290px 1fr',
    gap: '1rem',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },

  // Side Nav
  sideNav: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    maxHeight: '100%',
    paddingRight: 4,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  sideCard: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e4e4e7',
    padding: '1.1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  sideCardTitle: { fontSize: '0.82rem', fontWeight: 800, color: '#09090b', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  quickList: { display: 'flex', flexDirection: 'column', gap: 6 },
  quickQueryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e4e4e7',
    color: '#3f3f46',
    fontSize: '0.74rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  },
  quickQueryDot: { color: '#09090b', fontWeight: 800, fontSize: '0.9rem' },
  knowledgeItem: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f4f4f5', fontSize: '0.74rem' },
  kKey: { color: '#71717a' },
  kVal: { color: '#09090b', fontWeight: 700 },

  // Chat Area Container
  chatContainer: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    minHeight: 0
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem 1.5rem',
    background: '#f8fafc',
    minHeight: 0
  },

  // Message Cards & Bubbles
  aiAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiNameBadge: { fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' },
  onlineBadge: { fontSize: '0.66rem', color: '#10b981', fontWeight: 600 },

  userBubble: {
    maxWidth: '78%',
    padding: '12px 18px',
    borderRadius: '18px 18px 4px 18px',
    background: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)'
  },
  botBubble: {
    maxWidth: '92%',
    padding: '16px 22px',
    borderRadius: '4px 20px 20px 20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.02)'
  },

  dotsContainer: { display: 'flex', gap: 6, padding: '4px 0', alignItems: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#0f172a',
    display: 'inline-block',
    animation: 'apsai-page-dot 1.2s infinite ease-in-out'
  },

  msgToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px solid #f1f5f9'
  },
  actionToolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  timeBadge: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    fontWeight: 500,
    marginLeft: 'auto'
  },
  latencyBadge: {
    fontSize: '0.66rem',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 7px',
    borderRadius: 4,
    fontWeight: 600
  },

  // Suggestions row
  suggestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 1.25rem',
    background: '#fff',
    borderTop: '1px solid #f4f4f5',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  suggestLabel: { fontSize: '0.68rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  chipBtn: {
    padding: '5px 12px',
    borderRadius: 20,
    background: '#f4f4f5',
    border: '1px solid #e4e4e7',
    color: '#09090b',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  // Input wrapper
  inputWrapper: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e2e8f0',
    background: '#fff'
  },
  inputField: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 14,
    fontSize: '0.88rem',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    resize: 'none',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s'
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
    border: '1px solid #e4e4e7',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
    color: '#09090b',
    background: '#f4f4f5'
  },
  hintText: { fontSize: '0.7rem', color: '#71717a' },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#f4f4f5',
    color: '#71717a',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  sendButtonActive: {
    background: '#09090b',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
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
  },

  // Report Card Styles
  reportBox: {
    marginTop: 14,
    padding: '16px 18px',
    borderRadius: 14,
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    border: '1.5px solid #cbd5e1',
    boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  reportBadge: {
    fontSize: '0.66rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '3px 8px',
    borderRadius: 12,
    display: 'inline-block',
    marginBottom: 4
  },
  reportTitle: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  reportDate: {
    fontSize: '0.72rem',
    color: '#64748b',
    fontWeight: 600
  },
  reportSummary: {
    fontSize: '0.82rem',
    lineHeight: 1.55,
    color: '#334155',
    padding: '10px 12px',
    background: '#ffffff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    marginBottom: 12
  },
  reportSection: {
    marginTop: 10
  },
  reportSectionHeading: {
    fontSize: '0.74rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#475569',
    marginBottom: 6
  },
  reportList: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none'
  },
  reportItemFinding: {
    fontSize: '0.8rem',
    color: '#1e293b',
    padding: '5px 8px',
    background: '#eff6ff',
    borderRadius: 6,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  reportItemInsight: {
    fontSize: '0.8rem',
    color: '#064e3b',
    padding: '5px 8px',
    background: '#ecfdf5',
    borderRadius: 6,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },

  // File Export Card Styles
  fileExportCard: {
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: 12,
    background: '#1e293b',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
  },
  fileExportLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  fileExportIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: '#3b82f6',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: '0.72rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.5px'
  },
  fileExportName: {
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  fileExportMeta: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginTop: 2
  },
  fileDownloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s'
  },

  // Quick Download Bar directly under text
  quickDownloadRow: {
    marginTop: 10,
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    padding: '8px 12px',
    borderRadius: 10,
    background: '#f1f5f9',
    border: '1px solid #cbd5e1'
  },
  quickDownloadLabel: {
    fontSize: '0.7rem',
    fontWeight: 800,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  quickDownloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    color: '#ffffff',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.1s, opacity 0.15s'
  },
  
  // Options Flow Styles
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    marginBottom: '8px'
  },
  optionChip: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#334155',
    fontSize: '0.84rem',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'block',
    width: '100%',
    fontFamily: 'inherit'
  },

  // ── Persistent AI Memory Styles ──
  memoryHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.78rem',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    transition: 'all 0.15s'
  },
  memoryBadgeCount: {
    padding: '2px 7px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.25)',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: 800
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1.5rem',
    boxSizing: 'border-box'
  },
  modalContainer: {
    background: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: '760px',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.2rem 1.6rem',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalBrainIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.35rem',
    color: '#fff',
    boxShadow: '0 4px 10px rgba(37,99,235,0.25)'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.08rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  modalSubtitle: {
    fontSize: '0.74rem',
    color: '#64748b',
    marginTop: 2
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    transition: 'color 0.15s'
  },
  memoryStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    padding: '1rem 1.6rem 0.6rem',
    background: '#ffffff'
  },
  memoryStatCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0'
  },
  memoryStatVal: {
    fontSize: '1rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  memoryStatLbl: {
    fontSize: '0.66rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  teachForm: {
    padding: '0.8rem 1.6rem',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0'
  },
  teachFormTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#334155',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  alertSuccess: {
    padding: '7px 12px',
    borderRadius: 8,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: 8
  },
  alertError: {
    padding: '7px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: 8
  },
  teachInputsRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  teachInputFact: {
    flex: 2,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.78rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  teachInputTarget: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.78rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  teachSubmitBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.8rem 1.6rem 0.4rem',
    gap: 12
  },
  filterChips: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  },
  filterChip: {
    padding: '5px 10px',
    borderRadius: 20,
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  filterChipActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff'
  },
  filterSearchInput: {
    padding: '6px 12px',
    borderRadius: 20,
    border: '1px solid #cbd5e1',
    fontSize: '0.72rem',
    outline: 'none',
    width: '180px'
  },
  memoriesScrollList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.6rem 1.6rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: '220px'
  },
  memoryItemCard: {
    padding: '10px 14px',
    borderRadius: 10,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  memoryItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  typeBadge: {
    fontSize: '0.64rem',
    fontWeight: 800,
    letterSpacing: '0.3px',
    padding: '3px 8px',
    borderRadius: 6
  },
  typeBadgeLearned: {
    background: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0'
  },
  typeBadgeTask: {
    background: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe'
  },
  typeBadgeRejected: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  typeBadgeSystem: {
    background: '#f5f3ff',
    color: '#6b21a8',
    border: '1px solid #ddd6fe'
  },
  targetBadge: {
    fontSize: '0.68rem',
    color: '#475569',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: 4
  },
  memoryTime: {
    fontSize: '0.68rem',
    color: '#94a3b8'
  },
  deleteMemoryBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.6,
    fontSize: '0.78rem',
    padding: '2px 4px'
  },
  memorySummaryText: {
    fontSize: '0.8rem',
    color: '#1e293b',
    lineHeight: 1.45,
    marginTop: 2
  },
  emptyMemoryState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
    textAlign: 'center'
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.6rem',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  footerSecondaryBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  footerQueryBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  footerCloseBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    background: '#0f172a',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
