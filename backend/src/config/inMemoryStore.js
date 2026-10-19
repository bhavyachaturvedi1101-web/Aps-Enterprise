const fs = require('fs');
const path = require('path');

function loadJsonSafe(filename, fallback) {
  try {
    const filePath = path.join(__dirname, '../../', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const seedPath = path.join(__dirname, '../../seeds', filename);
    if (fs.existsSync(seedPath)) {
      return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    }
  } catch (e) {
    console.warn(`[inMemoryStore] Failed to load ${filename}:`, e.message);
  }
  return fallback;
}

const mockLeads = loadJsonSafe('leads_data.json', []);
const mockEmployees = loadJsonSafe('employees_data.json', []);
const mockUsers = loadJsonSafe('users_data.json', []);
const mockActivityLogs = loadJsonSafe('logs_data.json', []);
const mockInvoices = loadJsonSafe('invoices_data.json', []);
const mockVouchers = loadJsonSafe('tally_data.json', []);
const mockInventory = loadJsonSafe('inventory_data.json', [
  {
    id: "INV-101",
    name: "Fully Automatic Double Die Dona Pattal Machine",
    sku: "APS-DD-01",
    category: "Paper Plate Machines",
    stock: 8,
    reserved: 0,
    reorderLevel: 2,
    unitPrice: 125000,
    status: "In Stock",
    location: "Indore Warehouse Bay A-1"
  },
  {
    id: "INV-102",
    name: "Heavy Duty Hydraulic Paper Plate & Thali Press",
    sku: "APS-HYD-50",
    category: "Hydraulic Equipment",
    stock: 5,
    reserved: 0,
    reorderLevel: 2,
    unitPrice: 245000,
    status: "In Stock",
    location: "Indore Warehouse Bay A-2"
  },
  {
    id: "INV-103",
    name: "Single Die High-Speed Crank Dona Making Machine",
    sku: "APS-SD-02",
    category: "Paper Plate Machines",
    stock: 12,
    reserved: 0,
    reorderLevel: 3,
    unitPrice: 65000,
    status: "In Stock",
    location: "Indore Warehouse Bay B-1"
  },
  {
    id: "INV-104",
    name: "Automatic High-Speed Paper Cup Making Machine",
    sku: "APS-CUP-90",
    category: "Paper Cup Equipment",
    stock: 3,
    reserved: 0,
    reorderLevel: 1,
    unitPrice: 750000,
    status: "In Stock",
    location: "Indore Warehouse Bay C-1"
  },
  {
    id: "INV-105",
    name: "Semi-Automatic Heavy Paper Roll Cutter Machine",
    sku: "APS-CUT-36",
    category: "Cutting Machines",
    stock: 6,
    reserved: 0,
    reorderLevel: 2,
    unitPrice: 95000,
    status: "In Stock",
    location: "Indore Warehouse Bay B-3"
  },
  {
    id: "INV-106",
    name: "Raw Material Silver Craft Paper Roll (80-140 GSM)",
    sku: "APS-RM-ROLL",
    category: "Raw Materials",
    stock: 150,
    reserved: 0,
    reorderLevel: 30,
    unitPrice: 4800,
    status: "In Stock",
    location: "Indore Yard Stockpile"
  }
]);

const mockWhatsAppMessages = [
  {
    messageId: "WA-001",
    leadId: "LEAD-012",
    leadName: "Harish Choudhary",
    phone: "+91 98260 11223",
    sequenceType: "PAYMENT_REMINDER",
    product: "Heavy Duty Hydraulic Paper Plate & Thali Press",
    advanceAmount: "24,500",
    totalBudget: "2,45,000",
    status: "Delivered",
    sentAt: "2026-10-15T16:30:00.000Z",
    preview: "Dear Harish Choudhary, your 10% advance invoice (₹24,500) for Heavy Duty Hydraulic Press is ready.",
    lastEvent: "Delivered to handset"
  },
  {
    messageId: "WA-002",
    leadId: "LEAD-016",
    leadName: "Neeraj Malviya",
    phone: "+91 94250 88771",
    sequenceType: "PRODUCTION_KICKOFF",
    product: "Fully Automatic Double Die Dona Pattal Machine",
    advanceAmount: "12,500",
    totalBudget: "1,25,000",
    status: "Read",
    sentAt: "2026-10-15T14:20:00.000Z",
    preview: "Production kicked off on Assembly Floor A for your Double Die Dona Machine. Job Card: JC-0992.",
    lastEvent: "Read by client"
  },
  {
    messageId: "WA-003",
    leadId: "LEAD-018",
    leadName: "Alok Mishra",
    phone: "+91 98390 44551",
    sequenceType: "DISPATCH_NOTICE",
    product: "Automatic High-Speed Paper Cup Making Machine",
    advanceAmount: "75,000",
    totalBudget: "7,50,000",
    status: "Read",
    sentAt: "2026-10-16T09:25:00.000Z",
    preview: "Great news! Your Paper Cup Machine has been dispatched via VRL Logistics. Tracking: APS-TRK-882910.",
    lastEvent: "Read by client"
  },
  {
    messageId: "WA-004",
    leadId: "LEAD-014",
    leadName: "Sanjay Tiwari",
    phone: "+91 97550 33442",
    sequenceType: "BOOKING_CONFIRMATION",
    product: "Fully Automatic Double Die Dona Pattal Machine",
    advanceAmount: "12,500",
    totalBudget: "1,25,000",
    status: "Delivered",
    sentAt: "2026-10-16T10:50:00.000Z",
    preview: "Payment received! ₹12,500 advance confirmed via Tally. Factory order released for manufacturing.",
    lastEvent: "Delivered to handset"
  },
  {
    messageId: "WA-005",
    leadId: "LEAD-001",
    leadName: "Rajesh Sharma",
    phone: "+91 98260 12345",
    sequenceType: "CATALOG_BROCHURE",
    product: "Fully Automatic Double Die Dona Pattal Machine",
    advanceAmount: "12,500",
    totalBudget: "1,25,000",
    status: "Read",
    sentAt: "2026-10-15T09:40:00.000Z",
    preview: "Hello Rajesh ji, here is the full machinery technical catalog and operating video for APS-DD-01.",
    lastEvent: "Read by client"
  }
];

const mockCallLogs = [
  {
    callId: "CALL-101",
    leadId: "LEAD-005",
    name: "Vikram Singh",
    phone: "+91 98290 56789",
    agent: "A1 Voice Agent",
    durationSeconds: 185,
    callOutcome: "Qualified",
    transcript: "Customer confirmed requirement for 100 BPM Paper Cup Machine. Has shed ready in Jaipur Industrial Area. Budget ₹7.5 Lakhs confirmed.",
    timestamp: "2026-10-16T08:50:00.000Z"
  },
  {
    callId: "CALL-102",
    leadId: "LEAD-006",
    name: "Manoj Kumar",
    phone: "+91 98270 67890",
    agent: "Priya Sharma (Telecaller)",
    durationSeconds: 240,
    callOutcome: "Interested",
    transcript: "Discussed double cylinder hydraulic thali machine. Inquired about die sizes (10, 12, 14 inch). Requested formal quote on WhatsApp.",
    timestamp: "2026-10-15T15:20:00.000Z"
  },
  {
    callId: "CALL-103",
    leadId: "LEAD-001",
    name: "Rajesh Sharma",
    phone: "+91 98260 12345",
    agent: "A1 Voice Agent",
    durationSeconds: 110,
    callOutcome: "Interested",
    transcript: "Customer inquiring about dona pattal plant setup near Bhopal. Shared unit price ₹1,25,000 and power requirement (2 HP single phase).",
    timestamp: "2026-10-15T09:32:00.000Z"
  },
  {
    callId: "CALL-104",
    leadId: "LEAD-008",
    name: "Deepak Agarwal",
    phone: "+91 98930 89012",
    agent: "Rahul Verma (Manager)",
    durationSeconds: 310,
    callOutcome: "Quoted",
    transcript: "Discussed bulk order: Hydraulic plate press + 5 tons silver craft raw paper rolls. Quote sent ₹2.45 Lakhs.",
    timestamp: "2026-10-14T16:45:00.000Z"
  }
];

const data = {
  mockLeads,
  mockEmployees,
  mockUsers,
  mockActivityLogs,
  mockInventory,
  mockInvoices,
  mockVouchers,
  mockWhatsAppMessages,
  mockCallLogs,
  mockInventoryLogs: [],

  companyProfile: {
    name: "APS Enterprises",
    website: "https://www.apsenterprises.in",
    tagline: "Leading Dona Pattal & Paper Plate Machine Manufacturer in Madhya Pradesh",
    address: "832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, MP - 452001",
    phones: [
      "+91-7869755871",
      "+91-8827848099"
    ],
    emails: [
      "admin@apsenterprises.in",
      "support.apsenterprises@gmail.com"
    ],
    products: [
      "Fully Automatic Double Die Dona Pattal Machine",
      "Hydraulic Paper Plate & Thali Making Machine",
      "Automatic High-Speed Paper Cup Making Machine",
      "Semi-Automatic Heavy Paper Cutter Machine",
      "Raw Material Paper Roll & Lamination Machine"
    ]
  },

  systemConfig: {
    approvalPolicy: "single-action",
    paymentGatePercentage: 10,
    autoSendPaymentReminders: true,
    reminderDelayHours: 24,
    whatsappProvider: "DoubleTick / Meta Cloud API",
    wabaPhoneNumber: "+91 99880 01122",
    webhookUrl: "https://platformapi.teleforce.cx/api/v1"
  }
};

module.exports = data;
