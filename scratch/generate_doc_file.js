const fs = require('fs');
const path = require('path');

function generateFullyResponsiveDoc() {
  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APS Enterprise - Task Status Overview</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.27in 11.69in;
      margin: 0.5in 0.8in 0.5in 0.8in;
      mso-header-margin: 0.25in;
      mso-footer-margin: 0.25in;
    }
    div.Section1 {
      page: Section1;
      max-width: 820px;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #1f2937;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      box-sizing: border-box;
    }
    .header-box {
      text-align: center;
      margin-bottom: 10pt;
      border-bottom: 1.5pt solid #1e3a8a;
      padding-bottom: 6pt;
    }
    h1 {
      font-size: 20pt;
      color: #1e3a8a;
      margin: 0 0 2pt 0;
      font-weight: bold;
      letter-spacing: 0.5pt;
    }
    .subtitle {
      font-size: 11pt;
      color: #4b5563;
      font-weight: bold;
      margin: 0;
    }
    .meta {
      font-size: 8.5pt;
      color: #6b7280;
      margin-top: 3pt;
      font-style: italic;
    }
    h2 {
      font-size: 11pt;
      margin: 10pt 0 5pt 0;
      padding: 3pt 6pt;
      border-radius: 4pt;
      font-weight: bold;
    }
    .h2-completed {
      color: #065f46;
      background: #ecfdf5;
      border-left: 3pt solid #059669;
    }
    .h2-remaining {
      color: #92400e;
      background: #fffbeb;
      border-left: 3pt solid #d97706;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    table.task-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4pt;
    }
    table.task-table td {
      padding: 3.5pt 6pt;
      vertical-align: middle;
      font-size: 9.5pt;
      border-bottom: 0.5pt solid #f1f5f9;
    }
    .col-num {
      width: 24pt;
      font-weight: bold;
      color: #64748b;
      white-space: nowrap;
    }
    .col-title {
      font-weight: bold;
      color: #0f172a;
    }
    .col-tag {
      text-align: right;
      width: 85pt;
      font-size: 8pt;
      font-weight: bold;
      white-space: nowrap;
    }
    .tag-ready {
      color: #059669;
    }
    .tag-pending {
      color: #d97706;
    }
    .footer-note {
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 12pt;
      border-top: 0.5pt solid #e2e8f0;
      padding-top: 4pt;
    }

    /* ─── Fully Responsive Breakpoints for Mobile & Tablet ─────────── */
    @media screen and (max-width: 640px) {
      body {
        padding: 8px !important;
      }
      .Section1 {
        width: 100% !important;
        margin: 0 !important;
      }
      .header-box {
        margin-bottom: 8pt !important;
        padding-bottom: 4pt !important;
      }
      h1 {
        font-size: 16pt !important;
      }
      .subtitle {
        font-size: 9.5pt !important;
      }
      .meta {
        font-size: 7.5pt !important;
      }
      h2 {
        font-size: 9.5pt !important;
        padding: 2pt 4pt !important;
        margin: 8pt 0 4pt 0 !important;
      }
      table.task-table td {
        padding: 4pt 3pt !important;
        font-size: 8.5pt !important;
      }
      .col-num {
        width: 18pt !important;
        font-size: 8pt !important;
      }
      .col-title {
        font-size: 8.5pt !important;
        word-break: break-word !important;
      }
      .col-tag {
        width: 60pt !important;
        font-size: 7pt !important;
      }
      .footer-note {
        font-size: 7pt !important;
        margin-top: 8pt !important;
      }
    }
  </style>
</head>
<body>
  <div class="Section1">
    <div class="header-box">
      <h1>APS ENTERPRISE</h1>
      <div class="subtitle">Project Task Status Overview</div>
      <div class="meta">Single-Page Executive Summary | Phase 1 Software 100% Verified</div>
    </div>

    <h2 class="h2-completed">1. COMPLETED TASKS (100% READY)</h2>
    <div class="table-container">
      <table class="task-table">
        <tr><td class="col-num">01</td><td class="col-title">Central Management Dashboard</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">02</td><td class="col-title">CRM & 7-Stage Lead Management System</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">03</td><td class="col-title">10% Advance Payment Security Gate</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">04</td><td class="col-title">ERP Factory Machine Production & Job Cards</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">05</td><td class="col-title">APS AI Assistant (with Role-Based Employee Workspace)</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">06</td><td class="col-title">Priority Telephony Calling Queue & Dialer</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">07</td><td class="col-title">Automated WhatsApp Notification Engine</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">08</td><td class="col-title">Tally ERP Accounting Bridge (XML Vouchers)</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">09</td><td class="col-title">GST Tax Invoicing & Billing Generator (18% GST)</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">10</td><td class="col-title">Employee & Team Performance KPI Tracking</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">11</td><td class="col-title">User Roles & Access Control (Admin, Manager, Employee, Accountant)</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">12</td><td class="col-title">System Audit & Security Activity Log</td><td class="col-tag tag-ready">✔ READY</td></tr>
        <tr><td class="col-num">13</td><td class="col-title">Enterprise Security, Docker & CI/CD Deployment Suite</td><td class="col-tag tag-ready">✔ READY</td></tr>
      </table>
    </div>

    <h2 class="h2-remaining">2. REMAINING TASKS (GO-LIVE INTEGRATIONS & PENDING)</h2>
    <div class="table-container">
      <table class="task-table">
        <tr><td class="col-num">01</td><td class="col-title">Credentials</td><td class="col-tag tag-pending">⏳ PENDING</td></tr>
        <tr><td class="col-num">02</td><td class="col-title">Local Tally Bridge on Office Accountant PC</td><td class="col-tag tag-pending">⏳ PENDING</td></tr>
        <tr><td class="col-num">03</td><td class="col-title">Google Tasks Integration</td><td class="col-tag tag-pending">⏳ PENDING</td></tr>
        <tr><td class="col-num">04</td><td class="col-title">Chatbot Employee Role Restrictions & Access Lock</td><td class="col-tag tag-pending">⏳ PENDING</td></tr>
        <tr><td class="col-num">05</td><td class="col-title">Staff Training Demonstration & Client Sign-Off</td><td class="col-tag tag-pending">⏳ PENDING</td></tr>
      </table>
    </div>

    <div class="footer-note">
      APS Enterprise Platform &bull; All Core Software Features Developed &bull; Strictly 1-Page Summary
    </div>
  </div>
</body>
</html>`;

  const files = [
    'APS_Enterprise_Task_Status.html',
    'APS_Enterprise_Task_Status_Document.doc',
    'APS_Enterprise_Task_Status_Report.doc'
  ];

  for (const fileName of files) {
    const outPath = path.resolve(__dirname, '..', fileName);
    try {
      fs.writeFileSync(outPath, '\uFEFF' + docHtml, 'utf8');
      console.log('Successfully written responsive doc:', fileName);
    } catch (e) {
      console.warn(`Could not overwrite ${fileName} (${e.code}).`);
    }
  }
}

generateFullyResponsiveDoc();
