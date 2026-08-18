// Centralized In-Memory Data Store (Canonical Schemas for APS Enterprise)

const mockLeads = [
  { 
    id: 'LEAD-001', 
    name: 'John Doe', 
    company: 'Apex Metalcraft Ltd',
    phone: '+919876543210',
    email: 'john.doe@apexmetal.in',
    interest: 'CNC Machine v2', 
    budget: '15000', 
    stage: 'Enquiry', 
    notes: 'Inquired via Meta Ads campaign.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 5)
  },
  { 
    id: 'LEAD-002', 
    name: 'Jane Smith', 
    company: 'Precision Die & Tools',
    phone: '+919823456789',
    email: 'j.smith@precisiondie.com',
    interest: 'Laser Cutter Pro', 
    budget: '25000', 
    stage: 'Qualified', 
    notes: 'Called by A1 voice agent, confirmed budget & timeline.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e2',
    createdAt: new Date(Date.now() - 86400000 * 4)
  },
  { 
    id: 'LEAD-003', 
    name: 'Acme Corp', 
    company: 'Acme Heavy Industries',
    phone: '+919811223344',
    email: 'procurement@acmeind.com',
    interest: 'Industrial Mill', 
    budget: '50000', 
    stage: 'Booked', 
    notes: 'ERP booking created with custom spindle package, awaiting approval.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Inbound Call', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  { 
    id: 'LEAD-004', 
    name: 'Global Tech', 
    company: 'Global Hydraulics & Automation',
    phone: '+919988776655',
    email: 'operations@globaltechhyd.com',
    interest: 'Hydraulic Press 200T', 
    budget: '42000', 
    stage: 'Confirmed Lead', 
    notes: 'Booking approved in A2. Awaiting 10% advance (₹4,200) Tally payment gate verification.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e3',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  { 
    id: 'LEAD-005', 
    name: 'Elite Builders', 
    company: 'Elite Architectural Metalworks',
    phone: '+919123456789',
    email: 'director@elitebuilders.in',
    interest: 'CNC Router Pro 4-Axis', 
    budget: '18000', 
    stage: 'Client (Paid)', 
    notes: '10% advance verified against Tally ledger. Order ready for factory release.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'Telecaller', 
    assignedEmployeeId: 'e2',
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  { 
    id: 'LEAD-006', 
    name: 'Precision Works', 
    company: 'Precision Aerospace Components',
    phone: '+919833445566',
    email: 'factory@precisionworks.org',
    interest: 'High-Def Plasma Cutter', 
    budget: '35000', 
    stage: 'In Production', 
    notes: 'Factory job card #APS-MFG-8821 active. Milestone 2 (CNC Assembly) in progress.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 1)
  },
  { 
    id: 'LEAD-007', 
    name: 'ModernFab', 
    company: 'Modern Fabrication Systems',
    phone: '+919712341234',
    email: 'logistics@modernfab.co',
    interest: 'CNC Sheet Bender 120T', 
    budget: '28000', 
    stage: 'Dispatched', 
    notes: 'Dispatched via V-Trans logistics tracking #TRK-99210. WhatsApp dispatch notice sent.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'WhatsApp A5', 
    assignedEmployeeId: 'e3',
    createdAt: new Date(Date.now() - 86400000 * 1)
  }
];

const mockActivityLogs = [
  { 
    id: 'log-001', 
    employeeId: 'e2', 
    employeeName: 'Bhavya',
    leadId: 'LEAD-004', 
    leadName: 'Global Tech',
    action: 'Lead status transitioned from "Booked" to "Confirmed Lead"', 
    fromStage: 'Booked', 
    toStage: 'Confirmed Lead', 
    details: 'Booking configuration validated and approved in A2',
    createdAt: new Date(Date.now() - 300000) 
  },
  { 
    id: 'log-002', 
    employeeId: 'e1', 
    employeeName: 'Animesh',
    leadId: 'LEAD-002', 
    leadName: 'Jane Smith',
    action: 'Lead status transitioned from "Enquiry" to "Qualified"', 
    fromStage: 'Enquiry', 
    toStage: 'Qualified', 
    details: 'A1 Voice Agent completed call qualification and captured $25k budget',
    createdAt: new Date(Date.now() - 720000) 
  },
  { 
    id: 'log-003', 
    employeeId: 'e3', 
    employeeName: 'Aaditya',
    leadId: 'LEAD-005', 
    leadName: 'Elite Builders',
    action: 'Lead status transitioned from "Confirmed Lead" to "Client (Paid)"', 
    fromStage: 'Confirmed Lead', 
    toStage: 'Client (Paid)', 
    details: 'Tally ledger verified $1,800 advance payment. WhatsApp order confirmation triggered.',
    createdAt: new Date(Date.now() - 2040000) 
  },
  { 
    id: 'log-004', 
    employeeId: 'e1', 
    employeeName: 'Animesh',
    leadId: 'LEAD-006', 
    leadName: 'Precision Works',
    action: 'Released order to manufacturing floor in ERP', 
    fromStage: 'Client (Paid)', 
    toStage: 'In Production', 
    details: 'Triggered automated factory release webhook to ERP #MFG-8821',
    createdAt: new Date(Date.now() - 86400000) 
  },
  { 
    id: 'log-005', 
    employeeId: 'e3', 
    employeeName: 'Aaditya',
    leadId: 'LEAD-004', 
    leadName: 'Global Tech',
    action: 'Dispatched automated WhatsApp payment reminder (A5 Module)', 
    fromStage: 'Confirmed Lead', 
    toStage: 'Confirmed Lead', 
    details: 'Sent template payment_reminder_advance_10pct for $4,200 advance',
    createdAt: new Date(Date.now() - 3600000) 
  }
];

const mockEmployees = [
  { 
    id: 'e1', 
    name: 'Animesh', 
    email: 'animesh@aps-enterprise.com',
    phone: '+91 98201 11223',
    role: 'A1 Voice Agent & Sales Lead', 
    department: 'Voice Operations & Telecalling',
    kpiScore: '94%',
    kpiScoreNum: 94,
    status: 'Active',
    tasksCompleted: 48, 
    callsHandled: 124, 
    salesClosed: 8,
    totalRevenue: 248000,
    targetSales: 10,
    conversionRate: '36.8%',
    avgCallDurationSec: 135,
    avgResponseTimeMin: 4.2,
    weeklyKpiHistory: [86, 89, 91, 94],
    stageConversions: { enquiryToQualified: 42, qualifiedToBooked: 28, bookedToConfirmed: 18, confirmedToPaid: 8 }
  },
  { 
    id: 'e2', 
    name: 'Bhavya', 
    email: 'bhavya@aps-enterprise.com',
    phone: '+91 98302 22334',
    role: 'A2 Core Architect & Admin', 
    department: 'Operations & Systems',
    kpiScore: '98%',
    kpiScoreNum: 98,
    status: 'Active',
    tasksCompleted: 64, 
    callsHandled: 22, 
    salesClosed: 12,
    totalRevenue: 412000,
    targetSales: 12,
    conversionRate: '48.2%',
    avgCallDurationSec: 95,
    avgResponseTimeMin: 2.1,
    weeklyKpiHistory: [92, 94, 96, 98],
    stageConversions: { enquiryToQualified: 38, qualifiedToBooked: 35, bookedToConfirmed: 31, confirmedToPaid: 12 }
  },
  { 
    id: 'e3', 
    name: 'Aaditya', 
    email: 'aaditya@aps-enterprise.com',
    phone: '+91 98403 33445',
    role: 'A4 Analytics & A5 WhatsApp Lead', 
    department: 'Customer Success & Automation',
    kpiScore: '91%',
    kpiScoreNum: 91,
    status: 'Active',
    tasksCompleted: 39, 
    callsHandled: 45, 
    salesClosed: 5,
    totalRevenue: 185000,
    targetSales: 7,
    conversionRate: '31.5%',
    avgCallDurationSec: 110,
    avgResponseTimeMin: 5.8,
    weeklyKpiHistory: [82, 85, 88, 91],
    stageConversions: { enquiryToQualified: 29, qualifiedToBooked: 22, bookedToConfirmed: 16, confirmedToPaid: 5 }
  },
  { 
    id: 'e4', 
    name: 'Pooja Sharma', 
    email: 'pooja.sharma@aps-enterprise.com',
    phone: '+91 98504 44556',
    role: 'Senior Telecaller & Conversion Spec', 
    department: 'Inside Sales',
    kpiScore: '89%',
    kpiScoreNum: 89,
    status: 'Active',
    tasksCompleted: 52, 
    callsHandled: 168, 
    salesClosed: 7,
    totalRevenue: 215000,
    targetSales: 8,
    conversionRate: '29.4%',
    avgCallDurationSec: 142,
    avgResponseTimeMin: 3.5,
    weeklyKpiHistory: [80, 84, 87, 89],
    stageConversions: { enquiryToQualified: 58, qualifiedToBooked: 32, bookedToConfirmed: 20, confirmedToPaid: 7 }
  },
  { 
    id: 'e5', 
    name: 'Rohan Mehta', 
    email: 'rohan.mehta@aps-enterprise.com',
    phone: '+91 98605 55667',
    role: 'ERP & Factory Dispatch Officer', 
    department: 'Manufacturing Operations',
    kpiScore: '93%',
    kpiScoreNum: 93,
    status: 'Active',
    tasksCompleted: 44, 
    callsHandled: 12, 
    salesClosed: 9,
    totalRevenue: 310000,
    targetSales: 10,
    conversionRate: '41.0%',
    avgCallDurationSec: 80,
    avgResponseTimeMin: 4.0,
    weeklyKpiHistory: [88, 90, 91, 93],
    stageConversions: { enquiryToQualified: 20, qualifiedToBooked: 19, bookedToConfirmed: 18, confirmedToPaid: 9 }
  }
];

const mockCallLogs = [
  {
    callId: 'CALL-001',
    leadId: 'LEAD-002',
    phone: '+919823456789',
    agent: 'A1 Voice Agent',
    durationSeconds: 145,
    callOutcome: 'Interested - Qualified',
    transcript: 'Customer expressed strong interest in Laser Cutter Pro for immediate purchase.',
    timestamp: new Date(Date.now() - 7200000)
  },
  {
    callId: 'CALL-002',
    leadId: 'LEAD-006',
    phone: '+919833445566',
    agent: 'A1 Voice Agent',
    durationSeconds: 210,
    callOutcome: 'Interested - High Intent',
    transcript: 'Inquired about Plasma Cutter specifications and 10% advance payment details.',
    timestamp: new Date(Date.now() - 14400000)
  }
];

const mockWhatsAppTemplates = [
  {
    id: 'payment_reminder_advance_10pct',
    name: 'Payment Reminder (10% Advance Gate)',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    header: 'APS Enterprise — Order Advance Notice',
    bodyText: 'Hello {{1}}, your booking for {{2}} (Total ₹{{3}}) is approved! To release your machine order to the manufacturing queue, please confirm the 10% advance payment of ₹{{4}}. Click the payment link below or reply to this message.',
    buttons: ['Verify & Pay Advance', 'Speak to Account Manager'],
    triggerStage: 'Confirmed Lead',
    delayDescription: 'Auto-triggered after 24h of booking approval if payment pending'
  },
  {
    id: 'order_confirmation_factory_release',
    name: 'Client Order Confirmation & Factory Release',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    header: 'APS Enterprise — Production Release Confirmed',
    bodyText: 'Congratulations {{1}}! Your 10% advance payment for {{2}} has been verified against our Tally ledger. Your order #{{3}} is now officially released to the factory floor. Expected completion in 14 business days.',
    buttons: ['Track Production Status', 'Download Tally Receipt'],
    triggerStage: 'Client (Paid)',
    delayDescription: 'Immediate trigger upon Tally payment verification'
  },
  {
    id: 'production_update_milestone',
    name: 'Manufacturing Milestone Progress Alert',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    header: 'APS Enterprise — Factory Floor Update',
    bodyText: 'Hello {{1}}, exciting news! Your {{2}} has completed {{3}} at our central manufacturing unit. Factory testing & calibration will commence shortly.',
    buttons: ['View Inspection Photos', 'Contact Factory Rep'],
    triggerStage: 'In Production',
    delayDescription: 'Triggered at 50% & 90% production milestones'
  },
  {
    id: 'dispatch_tracking_alert',
    name: 'Courier & Freight Dispatch Notice',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    header: 'APS Enterprise — Consignment Dispatched',
    bodyText: 'Dear {{1}}, your machinery {{2}} has been safely loaded and dispatched via {{3}} (Docket/LR: {{4}}). Estimated delivery: {{5}}.',
    buttons: ['Live Consignment Tracking', 'Installation Guide'],
    triggerStage: 'Dispatched',
    delayDescription: 'Triggered when dispatch paperwork is logged in ERP'
  },
  {
    id: 'qualified_lead_brochure_pack',
    name: 'Qualified Lead Brochure & Specs Deck',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    header: 'APS Enterprise — Machine Catalog',
    bodyText: 'Hi {{1}}, thank you for speaking with our AI specialist about the {{2}}. Attached is the full technical datasheet, tooling matrix, and ROI calculator.',
    buttons: ['Open PDF Specs', 'Book Video Demo'],
    triggerStage: 'Qualified',
    delayDescription: 'Triggered 1 hour after A1 voice agent qualifies lead'
  }
];

const mockWhatsAppSequences = [
  {
    id: 'SEQ-01',
    name: 'Confirmed Lead 10% Advance Payment Reminder',
    triggerStage: 'Confirmed Lead',
    targetAudience: 'Leads with approved booking awaiting Tally payment',
    delayHours: 24,
    templateId: 'payment_reminder_advance_10pct',
    status: 'Active',
    sentCount: 342,
    readRate: '94.2%',
    conversionRate: '41.8%',
    description: 'Enforces Tally payment gate by auto-reminding confirmed leads to deposit 10% advance before cold-off.'
  },
  {
    id: 'SEQ-02',
    name: 'Client (Paid) Order Confirmation & Factory Release',
    triggerStage: 'Client (Paid)',
    targetAudience: 'Clients whose payment is verified in Tally ledger',
    delayHours: 0,
    templateId: 'order_confirmation_factory_release',
    status: 'Active',
    sentCount: 218,
    readRate: '98.6%',
    conversionRate: '100%',
    description: 'Switches messaging automatically to order confirmation & factory release upon verified payment.'
  },
  {
    id: 'SEQ-03',
    name: 'In Production Milestone Updates',
    triggerStage: 'In Production',
    targetAudience: 'Orders currently on factory floor',
    delayHours: 48,
    templateId: 'production_update_milestone',
    status: 'Active',
    sentCount: 185,
    readRate: '92.0%',
    conversionRate: '85.4%',
    description: 'Keeps buyers informed with automated progress updates to prevent customer anxiety during assembly.'
  },
  {
    id: 'SEQ-04',
    name: 'Dispatched Logistics & Courier Tracking',
    triggerStage: 'Dispatched',
    targetAudience: 'Orders loaded and in transit',
    delayHours: 0,
    templateId: 'dispatch_tracking_alert',
    status: 'Active',
    sentCount: 146,
    readRate: '99.1%',
    conversionRate: '96.2%',
    description: 'Dispatches freight LR docket and transporter link immediately upon dock exit.'
  },
  {
    id: 'SEQ-05',
    name: 'Qualified Lead Brochure & Specs Deck',
    triggerStage: 'Qualified',
    targetAudience: 'Newly qualified leads from A1 voice agent',
    delayHours: 1,
    templateId: 'qualified_lead_brochure_pack',
    status: 'Paused',
    sentCount: 420,
    readRate: '88.5%',
    conversionRate: '28.1%',
    description: 'Nurtures warm leads qualified by AI voice with machine specification PDF.'
  }
];

const mockWhatsAppMessages = [
  {
    messageId: 'WA-001',
    leadId: 'LEAD-004',
    leadName: 'Global Tech',
    phone: '+91 99887 76655',
    template: 'payment_reminder_advance_10pct',
    sequenceType: 'PAYMENT_REMINDER',
    product: 'Hydraulic Press 200T',
    advanceAmount: '4,200',
    totalBudget: '42,000',
    status: 'Delivered',
    sentAt: new Date(Date.now() - 3600000),
    preview: 'Hello Global Tech, your booking for Hydraulic Press 200T (Total ₹42,000) is approved! To release your machine order to the manufacturing queue, please confirm the 10% advance payment of ₹4,200.',
    lastEvent: 'Delivered to handset (✓✓)'
  },
  {
    messageId: 'WA-002',
    leadId: 'LEAD-005',
    leadName: 'Elite Builders',
    phone: '+91 91234 56789',
    template: 'order_confirmation_factory_release',
    sequenceType: 'ORDER_CONFIRMATION',
    product: 'CNC Router Pro 4-Axis',
    advanceAmount: '1,800',
    totalBudget: '18,000',
    status: 'Read',
    sentAt: new Date(Date.now() - 1800000),
    preview: 'Congratulations Elite Builders! Your 10% advance payment for CNC Router Pro 4-Axis has been verified against our Tally ledger. Your order #APS-ORD-902 is now officially released to the factory floor.',
    lastEvent: 'Read by recipient (✓✓ Blue)'
  },
  {
    messageId: 'WA-003',
    leadId: 'LEAD-006',
    leadName: 'Precision Works',
    phone: '+91 98334 45566',
    template: 'production_update_milestone',
    sequenceType: 'PRODUCTION_UPDATE',
    product: 'High-Def Plasma Cutter',
    advanceAmount: '3,500',
    totalBudget: '35,000',
    status: 'Read',
    sentAt: new Date(Date.now() - 86400000 * 1.5),
    preview: 'Hello Precision Works, exciting news! Your High-Def Plasma Cutter has completed Milestone 2 (CNC Assembly) at our central manufacturing unit.',
    lastEvent: 'Read by recipient (✓✓ Blue)'
  },
  {
    messageId: 'WA-004',
    leadId: 'LEAD-007',
    leadName: 'ModernFab',
    phone: '+91 97123 41234',
    template: 'dispatch_tracking_alert',
    sequenceType: 'DISPATCH_NOTICE',
    product: 'CNC Sheet Bender 120T',
    advanceAmount: '2,800',
    totalBudget: '28,000',
    status: 'Delivered',
    sentAt: new Date(Date.now() - 86400000 * 1.2),
    preview: 'Dear ModernFab, your machinery CNC Sheet Bender 120T has been safely loaded and dispatched via V-Trans (Docket: #TRK-99210). Estimated delivery: 2 business days.',
    lastEvent: 'Delivered to handset (✓✓)'
  },
  {
    messageId: 'WA-005',
    leadId: 'LEAD-002',
    leadName: 'Jane Smith',
    phone: '+91 98234 56789',
    template: 'qualified_lead_brochure_pack',
    sequenceType: 'BROCHURE_NURTURE',
    product: 'Laser Cutter Pro',
    advanceAmount: '2,500',
    totalBudget: '25,000',
    status: 'Read',
    sentAt: new Date(Date.now() - 86400000 * 3.8),
    preview: 'Hi Jane Smith, thank you for speaking with our AI specialist about the Laser Cutter Pro. Attached is the full technical datasheet, tooling matrix, and ROI calculator.',
    lastEvent: 'Read by recipient (✓✓ Blue)'
  }
];

const mockTimeInStage = [
  { 
    stage: 'Enquiry', 
    avgHours: 4.2, 
    targetSlaHours: 6.0, 
    dealsCount: 1, 
    status: 'On Target',
    healthScore: 98,
    stalledDeals: [] 
  },
  { 
    stage: 'Qualified', 
    avgHours: 12.5, 
    targetSlaHours: 16.0, 
    dealsCount: 1, 
    status: 'On Target',
    healthScore: 92,
    stalledDeals: [] 
  },
  { 
    stage: 'Booked', 
    avgHours: 8.0, 
    targetSlaHours: 12.0, 
    dealsCount: 1, 
    status: 'On Target',
    healthScore: 95,
    stalledDeals: [] 
  },
  { 
    stage: 'Confirmed Lead', 
    avgHours: 48.5, 
    targetSlaHours: 24.0, 
    dealsCount: 1, 
    status: 'Critical Warning',
    healthScore: 42,
    warning: 'Deals going cold while sitting unpaid awaiting 10% Tally advance gate',
    stalledDeals: [
      {
        leadId: 'LEAD-004',
        leadName: 'Global Tech',
        hoursInStage: 58.2,
        budget: 42000,
        assignedTo: 'Aaditya',
        advanceRequired: 4200,
        risk: 'High — 2.4x SLA threshold exceeded'
      }
    ]
  },
  { 
    stage: 'Client (Paid)', 
    avgHours: 6.0, 
    targetSlaHours: 8.0, 
    dealsCount: 1, 
    status: 'On Target',
    healthScore: 96,
    stalledDeals: [] 
  },
  { 
    stage: 'In Production', 
    avgHours: 72.0, 
    targetSlaHours: 120.0, 
    dealsCount: 1, 
    status: 'On Target',
    healthScore: 90,
    stalledDeals: [] 
  },
  { 
    stage: 'Dispatched', 
    avgHours: 0, 
    targetSlaHours: 0, 
    dealsCount: 1, 
    status: 'Complete',
    healthScore: 100,
    stalledDeals: [] 
  }
];

const systemConfig = {
  approvalPolicy: 'single-action', // 'single-action' vs 'countersign' (dual-approval)
  paymentGatePercentage: 10,
  autoSendPaymentReminders: true,
  reminderDelayHours: 24,
  whatsappProvider: 'Meta Cloud API (WABA Live)',
  wabaPhoneNumber: '+91 99880 01122',
  webhookUrl: 'https://api.aps-enterprise.com/webhooks/whatsapp'
};

module.exports = {
  mockLeads,
  mockActivityLogs,
  mockEmployees,
  mockCallLogs,
  mockWhatsAppMessages,
  mockWhatsAppSequences,
  mockWhatsAppTemplates,
  mockTimeInStage,
  systemConfig
};

