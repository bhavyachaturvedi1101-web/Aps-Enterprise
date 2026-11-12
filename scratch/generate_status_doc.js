const fs = require('fs');
const path = require('path');
const {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer
} = require('docx');

async function generateSinglePageDocx() {
  const primaryColor = '1E3A8A';
  const successColor = '059669';
  const pendingColor = 'D97706';
  const grayBorder = 'E2E8F0';

  const titlePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 30 },
    children: [
      new TextRun({ text: 'APS ENTERPRISE', bold: true, size: 26, color: primaryColor, font: 'Arial' })
    ]
  });

  const subtitlePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 30 },
    children: [
      new TextRun({ text: 'Project Task Status Overview', size: 17, color: '4B5563', font: 'Arial', bold: true })
    ]
  });

  const metaPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({ text: 'Single-Page Executive Summary | Phase 1 Software 100% Verified', size: 14, color: '6B7280', font: 'Arial', italics: true })
    ]
  });

  const s1Header = new Paragraph({
    spacing: { before: 80, after: 50 },
    children: [
      new TextRun({ text: '1. COMPLETED TASKS (100% READY)', bold: true, size: 18, color: successColor, font: 'Arial' })
    ]
  });

  const completedTasks = [
    '01. Central Management Dashboard',
    '02. CRM & 7-Stage Lead Management System',
    '03. 10% Advance Payment Security Gate',
    '04. ERP Factory Machine Production & Job Cards',
    '05. APS AI Assistant (with Role-Based Employee Workspace)',
    '06. Priority Telephony Calling Queue & Dialer',
    '07. Automated WhatsApp Notification Engine',
    '08. Tally ERP Accounting Bridge (XML Vouchers)',
    '09. GST Tax Invoicing & Billing Generator (18% GST)',
    '10. Employee & Team Performance KPI Tracking',
    '11. User Roles & Access Control (Admin, Manager, Employee, Accountant)',
    '12. System Audit & Security Activity Log',
    '13. Enterprise Security, Docker & CI/CD Deployment Suite'
  ];

  const completedRows = completedTasks.map(t => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 15, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '✔ READY', bold: true, color: successColor, size: 13, font: 'Arial' })] })]
      })
    ]
  }));

  const table1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: grayBorder },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: completedRows
  });

  const s2Header = new Paragraph({
    spacing: { before: 120, after: 50 },
    children: [
      new TextRun({ text: '2. REMAINING TASKS (GO-LIVE INTEGRATIONS & PENDING)', bold: true, size: 18, color: pendingColor, font: 'Arial' })
    ]
  });

  const remainingTasks = [
    '01. Credentials',
    '02. Local Tally Bridge on Office Accountant PC',
    '03. Google Tasks Integration',
    '04. Chatbot Employee Role Restrictions & Access Lock',
    '05. Staff Training Demonstration & Client Sign-Off'
  ];

  const remainingRows = remainingTasks.map(t => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: 'B45309', size: 15, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '⏳ PENDING', bold: true, color: pendingColor, size: 13, font: 'Arial' })] })]
      })
    ]
  }));

  const table2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: grayBorder },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: remainingRows
  });

  const footer = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
    children: [
      new TextRun({ text: 'APS Enterprise Platform • All Core Software Features Developed • Strictly 1-Page Summary', size: 12, color: '94A3B8', font: 'Arial' })
    ]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 500, right: 700, bottom: 500, left: 700 }
          }
        },
        children: [
          titlePara,
          subtitlePara,
          metaPara,
          s1Header,
          table1,
          s2Header,
          table2,
          footer
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const files = ['APS_Enterprise_Task_Status_Report.docx', 'APS_Enterprise_Task_Status_Document.docx'];
  for (const f of files) {
    const outPath = path.resolve(__dirname, '..', f);
    try {
      fs.writeFileSync(outPath, buffer);
      console.log('Successfully written:', f);
    } catch (e) {
      console.warn(`Could not overwrite ${f} (${e.code})`);
    }
  }
}

generateSinglePageDocx().catch(console.error);
