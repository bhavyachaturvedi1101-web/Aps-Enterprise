'use strict';

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
  HeadingLevel,
  Packer,
  ShadingType
} = require('docx');

async function createComprehensiveDocx() {
  const primaryBrand = '1E3A8A';   // Dark Blue
  const accentBlue = '2563EB';     // Cobalt Blue
  const darkCharcoal = '0F172A';   // Slate Dark
  const grayText = '475569';
  const lightGrayBg = 'F8FAFC';
  const tableBorder = 'CBD5E1';
  const successGreen = '059669';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1000, right: 1000 } // approx 0.5in top/bottom, 0.7in sides
          }
        },
        children: [
          // Header / Title Block
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'APS ENTERPRISES', bold: true, size: 36, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Enterprise System, Features, Architecture & Team Specifications', bold: true, size: 22, color: darkCharcoal, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: 'Official Comprehensive System Manual | Machinery Manufacturing ERP & AI Suite', size: 18, color: grayText, italics: true, font: 'Calibri' })
            ]
          }),

          // Section 1: Executive Overview
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: '1. Executive Summary & Business Context', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'APS Enterprises is an industrial manufacturing company specializing in heavy-duty machinery including Fully Automatic Double Die Dona Pattal Machines, Hydraulic Paper Plate Presses, High-Speed Paper Cup Machines, and Heavy Roll Cutters. The APS Enterprise Operating System is a unified digital platform built to automate the entire lifecycle—from digital inquiry capture to factory floor assembly, 10% advance payment verification, automated calling, and dispatch.',
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          }),

          // Section 2: 5 AI Pillars
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [
              new TextRun({ text: '2. System Architecture & 5 Core Pillars', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'The architecture is organized around 5 high-efficiency operational pillars seamlessly synchronized in real-time:',
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          }),

          // Table: 5 Pillars
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Pillar', 15),
                  createHeaderCell('Module Name', 30),
                  createHeaderCell('Core Responsibility & Integration', 55)
                ]
              }),
              createPillarRow('A1', 'Inbound Lead Engine', 'Captures leads from Meta Ads & IndiaMart, normalizes 10-digit mobile numbers, and pushes live to Teleforce CRM.'),
              createPillarRow('A2', 'Enterprise ERP & Operations', 'Central CRM board, factory job cards (JC-xxx), raw stock allocation, and machine production tracking.'),
              createPillarRow('A3', 'APS AI Assistant (Deep Intelligence)', 'LLM-powered NL query engine responding to inventory, leads, and financials in Hindi, English, and Hinglish.'),
              createPillarRow('A4', 'Teleforce Smart Priority Dialer', 'Dynamically prioritizes hot prospects, manages telecaller queues, and executes authenticated outbound calling.'),
              createPillarRow('A5', 'WhatsApp Cloud Automation', 'DoubleTick & Meta API engine sending payment reminders, catalog brochures, and logistics dispatch alerts.')
            ]
          }),

          // Section 3: Comprehensive Features
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 260, after: 100 },
            children: [
              new TextRun({ text: '3. Complete Feature Breakdown', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),

          createBulletPoint('7-Stage Lead Management CRM: ', 'Enforces strict linear progression: Enquiry → Qualified → Booked → Confirmed Lead → Client (Paid) → In Production → Dispatched.'),
          createBulletPoint('Mandatory 10% Advance Payment Gate: ', 'Hard security gate preventing manufacturing release until minimum 10% booking advance is verified against Tally accounting ledger. Dual-approval countersign enforced for high-value orders.'),
          createBulletPoint('Factory ERP & Job Cards: ', 'Tracks shop-floor fabrication, motor fitting, hydraulic pressure testing, panel wiring, and trial run signoffs with unique Job Card IDs.'),
          createBulletPoint('APS AI Assistant (A3 Engine): ', 'Natural language assistant with isolated chat privacy and role-based permissions (sales employees cannot access financial revenue, profits, or other staff chats).'),
          createBulletPoint('Teleforce Smart Dialer Queue: ', 'Automated call queue sorting leads by priority (Hot/High/Normal) with full authentication headers and zero-underscore (leadid) syntax.'),
          createBulletPoint('WhatsApp Business Cloud Automation: ', 'Automated client triggers via DoubleTick & Meta APIs (Catolog Brochures, 10% Advance Invoice Reminders, Factory Kickoff, and Dispatch Notices).'),
          createBulletPoint('Tally ERP Prime & 18% GST Invoicing: ', 'Direct XML integration with local Tally Prime (port 9000) and instant GST-compliant tax invoicing generation with CGST/SGST/IGST breakdown.'),
          createBulletPoint('Google Tasks Workspace Cloud Sync: ', 'Real-time synchronization between CRM machinery follow-ups and Google Tasks cloud for mobile reminders.'),

          // Section 4: User Roles & Team Hierarchy
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 260, after: 100 },
            children: [
              new TextRun({ text: '4. Team Hierarchy & Permission Matrix (RBAC)', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'APS Enterprise enforces strict Role-Based Access Control (RBAC) across 4 predefined system roles:',
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          }),

          // Table: RBAC Matrix
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Module / Screen', 32),
                  createHeaderCell('Super Admin', 17),
                  createHeaderCell('Ops Manager', 17),
                  createHeaderCell('Accountant', 17),
                  createHeaderCell('Sales Employee', 17)
                ]
              }),
              createMatrixRow('Executive Dashboard', 'Full Access', 'Full Access', 'No Access', 'No Access'),
              createMatrixRow('CRM Leads Pipeline', 'Full Access', 'Full Access', 'View Only', 'Assigned Only'),
              createMatrixRow('10% Advance Payment Gate', 'Full Override', 'Approve', 'Full Verify', 'Status Only'),
              createMatrixRow('Bookings & ERP Production', 'Full Access', 'Job Cards', 'Payment View', 'Status Only'),
              createMatrixRow('APS AI Assistant', 'Full Financials', 'Ops & Team', 'Invoices Only', 'Assigned & Specs'),
              createMatrixRow('Dialer Queue & Calls', 'Audit & History', 'Queue Manage', 'No Access', 'Call Queue'),
              createMatrixRow('WhatsApp Notifications', 'Full Config', 'Campaign View', 'No Access', 'Single Template'),
              createMatrixRow('Tally Sync & Invoices', 'Full Access', 'View Invoices', 'Full Ledger Sync', 'No Access'),
              createMatrixRow('Team KPIs & Performance', 'Full Audit', 'Team Metrics', 'No Access', 'Self Stats Only'),
              createMatrixRow('System Settings & API Keys', 'Full Control', 'No Access', 'No Access', 'No Access')
            ]
          }),

          // Section 5: UI/UX Theme & Design System
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 260, after: 100 },
            children: [
              new TextRun({ text: '5. UI/UX Theme & Design System Architecture', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'The platform adopts a Modern Slate Industrial Design System built for high data density, zero visual clutter, and long working hours:',
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          }),
          createBulletPoint('Surface Palette: ', 'Canvas (#F8FAFC Subtle Slate), Elevate (#FFFFFF Pure White), Charcoal (#09090B Pitch Zinc).'),
          createBulletPoint('Accent Brand Blue: ', '#2563EB (Precision Cobalt Blue) for active links, buttons, and call-to-actions.'),
          createBulletPoint('Status Indicators: ', 'Emerald Green (#10B981 Verified/Dispatched), Amber (#F59E0B Pending Gate), Crimson (#EF4444 Overdue).'),
          createBulletPoint('Typography: ', 'Outfit (Weights 600, 700, 800) for headers and KPI cards; Plus Jakarta Sans for dense data grids and chats.'),
          createBulletPoint('Ergonomic Layout: ', 'Collapsible icon sidebar, sticky KPI filter bars, and a persistent floating AI Assistant trigger available on every screen.'),

          // Section 6: Security & Resilience
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 260, after: 100 },
            children: [
              new TextRun({ text: '6. Security, Resilience & Test Verification', bold: true, size: 24, color: primaryBrand, font: 'Calibri' })
            ]
          }),
          createBulletPoint('Data Durability: ', 'PostgreSQL primary store with automatic fallback to serverless-safe atomic JSON storage, ensuring 100% uptime during database maintenance.'),
          createBulletPoint('Tamper-Proof Audit Trail: ', 'Every transition, dialer trigger, and voucher export is logged with Employee ID, IP address, and timestamp in the Activity Log.'),
          createBulletPoint('Test Verification: ', '100% passed test suite comprising 179 Automated Unit & Integration Tests across all 7 core modules.')
        ]
      }
    ]
  });

  function createHeaderCell(text, widthPercent) {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: primaryBrand },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({ text, bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' })
          ]
        })
      ]
    });
  }

  function createPillarRow(code, name, desc) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: code, bold: true, size: 18, color: primaryBrand, font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: name, bold: true, size: 18, color: darkCharcoal, font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: desc, size: 18, color: '334155', font: 'Calibri' })] })]
        })
      ]
    });
  }

  function createMatrixRow(module, admin, mgr, acct, emp) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
          children: [new Paragraph({ spacing: { before: 50, after: 50 }, children: [new TextRun({ text: module, bold: true, size: 17, color: darkCharcoal, font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: admin, size: 16, bold: true, color: '059669', font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: mgr, size: 16, color: '2563EB', font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: acct, size: 16, color: 'D97706', font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: emp, size: 16, color: '64748B', font: 'Calibri' })] })]
        })
      ]
    });
  }

  function createBulletPoint(boldPrefix, text) {
    return new Paragraph({
      spacing: { before: 40, after: 60 },
      bullet: { level: 0 },
      children: [
        new TextRun({ text: boldPrefix, bold: true, size: 19, color: darkCharcoal, font: 'Calibri' }),
        new TextRun({ text, size: 19, color: '334155', font: 'Calibri' })
      ]
    });
  }

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '../APS_Enterprise_System_Documentation.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Generated Microsoft Word DOCX: ${outPath}`);
}

createComprehensiveDocx().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});

