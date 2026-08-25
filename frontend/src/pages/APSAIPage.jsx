import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API = import.meta.env.PROD ? '/api/a3' : 'http://localhost:5000/api/a3';

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
  } catch { }
  return null;
}

function saveHistory(messages) {
  try {
    const clean = messages.filter(m => !m.loading).slice(-40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(clean));
  } catch { }
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
    const COLORS = ['#09090b', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

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
    ctx.font = '9.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    const groupSlotW = chartW / numGroups;

    labels.forEach((label, gi) => {
      const groupX = PAD.left + gi * groupSlotW + groupSlotW / 2;
      const maxChars = groupSlotW < 50 ? 5 : (groupSlotW < 65 ? 6 : (groupSlotW < 80 ? 8 : 11));
      const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
      ctx.fillText(displayLabel, groupX, H - PAD.bottom + 16);
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
                <span style={{ color: '#10b981', fontWeight: 800 }}>⚡</span> {item}
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
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[\#\*\_`]/g, '')
    .trim();
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

    // ── 1. Header Banner ────────────────────────────────────────────────
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
      } else if (content && content.includes('\n')) {
        const csvLines = content.split('\n').filter(l => l.trim() && !l.startsWith('===') && !l.startsWith('---'));
        if (csvLines.length > 1) {
          headers = csvLines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
          rows = csvLines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
        }
      }
    }

    if (headers && rows && rows.length > 0) {
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
            0: { fontStyle: 'bold' }
          },
          didDrawPage: () => {
            const pageNum = doc.internal.getNumberOfPages();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
            doc.text('APS ENTERPRISES • CONFIDENTIAL INTERNAL AUDIT REPORT', margin, pageHeight - 9);
            doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
          }
        });
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const rawText = content || 'APS AI Executive Response';
      const maxTextWidth = pageWidth - (margin * 2);

      const lines = rawText.split('\n');
      let textY = startY;

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

      const pageNum = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      doc.text('APS ENTERPRISES • CONFIDENTIAL INTERNAL AUDIT REPORT', margin, pageHeight - 9);
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
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
    document.body.removeChild(a);
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
        a.download = fileName || `APS_Enterprise_Export.docx`;
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
function MessageCard({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={s.aiAvatarCircle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
            </svg>
          </div>
          <span style={s.aiNameBadge}>Dashboard AI Assistant</span>
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
            {msg.exportFile && <ExportFileCard exportFile={msg.exportFile} tableData={msg.table} />}
            {msg.report && <ReportCard report={msg.report} />}
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
  isWelcome: true,
  text: "Welcome to **APS Enterprise Autonomous AI Operations Assistant** 🤖\n\nMain aapka real-time operational co-pilot hoon jo pure system ke sabhi 11 features ko natural language (Hinglish / Hindi / English) me control kar sakta hai.\n\n### ⚡ What I Can Do For You in Real Time:\n• 📋 **Task Assignment**: *\"Bhavya ko urgent task assign kardo: Review Global Tech advance payment\"*\n• 📞 **Voice Dialer**: *\"Jane Smith ke liye call schedule kar do kal 11 baje\"*\n• 💬 **WhatsApp Automation**: *\"Global Tech ko 10% advance payment reminder bhejo\"*\n• 🎯 **CRM Operations**: *\"Naya lead create karo Rajesh Sharma budget 85000\"* & *\"Lead LEAD-004 ko In Production me move karo\"*\n• 💰 **Tally Payments Gate**: *\"Tally me 15000 ka advance receipt voucher banao\"*\n• 🏭 **Factory Shopfloor**: *\"Precision Works ka manufacturing job card release kar do\"*\n• 🧾 **GST Invoices**: *\"Dona Pattal machine ka GST tax invoice generate karo\"*\n• 📦 **Warehouse Stock**: *\"Add 5 units of Double Die Machine in stock\"*\n• 📊 **Analytics**: *\"Show all employees cost spent vs net profit ROI report\"*\n\nType your command in **Hinglish**, **Hindi**, or **English** below or select a quick action from the sidebar!",
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
          text: data.text || data.answer,
          table: data.table,
          chart: data.chart,
          report: data.report,
          exportFile: data.exportFile,
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
    <div style={s.pageWrapper}>
      {/* ─── Top Page Header ────────────────────────────────────────── */}
      <div style={s.headerBanner}>
        <div style={s.headerLeft}>
          <div style={s.headerIconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
              <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
            </svg>
          </div>
          <div>
            <h1 style={s.headerTitle}>APS AI — Business Intelligence Agent</h1>
          </div>
        </div>

        <div style={s.headerRight}>
          <button onClick={clearHistory} style={s.actionBtn} title="Reset Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
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
                { label: 'Factory Job Card Tracker', query: 'Track factory job card assembly status' },
                { label: 'Generate GST Tax Invoice', query: 'Generate GST tax invoice for 42000' },
                { label: 'Voice Call Sentiment Audit', query: 'Analyze voice call sentiment and transcripts' },
                { label: 'WhatsApp Campaign Analytics', query: 'Show WhatsApp campaign performance analytics' },
                { label: 'Sales Team Leaderboard', query: 'Show sales team leaderboard and badges' },
                { label: 'Search PDF Catalog (RAG)', query: 'Search CNC 500T specification manual' },
                { label: 'Predictive Sales Forecast', query: 'Predict September revenue forecast' },
                { label: 'Lead Churn Risk Audit', query: 'Which leads are at risk of churn?' },
                { label: 'Send Email Quotation PDF', query: 'Send email quotation PDF to Global Tech' },
                { label: 'Order Profit Margin Calculator', query: 'Calculate profit margin for 150000 CNC order' },
                { label: 'Generate PDF Executive Report', query: 'Generate Executive PDF Report' },
                { label: 'Export Leads Data to CSV', query: 'Export leads to CSV' },
                { label: 'Export Leads Data to Excel', query: 'Export leads to Excel' }
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
    gap: '1.2rem',
    flex: 1,
    minHeight: 0
  },

  // Side Nav
  sideNav: { display: 'flex', flexDirection: 'column' },
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
    background: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiNameBadge: { fontSize: '0.76rem', fontWeight: 800, color: '#09090b' },
  onlineBadge: { fontSize: '0.66rem', color: '#71717a', fontWeight: 600 },

  userBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '20px 20px 4px 20px',
    background: '#2563eb',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  botBubble: {
    maxWidth: '88%',
    padding: '14px 18px',
    borderRadius: '4px 20px 20px 20px',
    background: '#ffffff',
    border: '1px solid #e4e4e7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },

  dotsContainer: { display: 'flex', gap: 6, padding: '4px 0', alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#09090b',
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
    borderTop: '1px solid #f4f4f5',
    overflowX: 'auto'
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
    padding: '1rem 1.4rem',
    borderTop: '1px solid #e4e4e7',
    background: '#fff'
  },
  inputField: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: '0.86rem',
    color: '#09090b',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    resize: 'none',
    boxSizing: 'border-box',
    border: '1px solid #e4e4e7',
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
  }
};
