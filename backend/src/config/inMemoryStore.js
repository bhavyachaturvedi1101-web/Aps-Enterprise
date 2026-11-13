const fs = require('fs');
const path = require('path');

const isTestEnv = process.env.NODE_ENV === 'test';

function loadJsonSafe(filename, fallback) {
  try {
    const filePath = path.join(__dirname, '../../', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`[inMemoryStore] Failed to load ${filename}:`, e.message);
  }
  return fallback;
}

// Test fixtures used exclusively when running the automated Jest test suite
const testFixtureLeads = isTestEnv ? [
  {
    id: "LEAD-001",
    name: "Rajesh Sharma",
    company: "Sharma Dona Udhyog",
    phone: "+91 98260 12345",
    email: "rajesh.sharma@sharmadona.com",
    interest: "Fully Automatic Double Die Dona Pattal Machine",
    budget: 125000,
    stage: "Enquiry",
    priority: "Hot",
    notes: "Looking to set up dona pattal plant near Bhopal.",
    source: "IndiaMART",
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    assignedEmployeeId: "e4",
    createdAt: "2026-10-15T09:30:00.000Z"
  },
  {
    id: "LEAD-002",
    name: "Jane Smith",
    company: "Patel Paper Products",
    phone: "+91 98795 23456",
    email: "jane.smith@patelpaper.in",
    interest: "Semi-Automatic Heavy Paper Roll Cutter Machine",
    budget: 95000,
    stage: "Qualified",
    priority: "Warm",
    notes: "Requires 36-inch roll cutter for cutting silver craft raw paper rolls.",
    source: "Meta Ads",
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    assignedEmployeeId: "e4",
    createdAt: "2026-10-15T10:15:00.000Z"
  },
  {
    id: "LEAD-004",
    name: "Ramesh Gupta",
    company: "Gupta Traders",
    phone: "+91 97550 45678",
    email: "ramesh.gupta@guptatraders.in",
    interest: "Single Die High-Speed Crank Dona Making Machine",
    budget: 65000,
    stage: "Confirmed Lead",
    priority: "Cold",
    notes: "Initial budget constraint. Enquired about finance and EMI options.",
    source: "Direct Web",
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    assignedEmployeeId: "e4",
    createdAt: "2026-10-14T14:20:00.000Z"
  }
] : [];

const loadedLeads = loadJsonSafe('leads_data.json', []);
const mockLeads = (isTestEnv && loadedLeads.length === 0) ? testFixtureLeads : loadedLeads;
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

const mockWhatsAppMessages = [];
const mockCallLogs = [];

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
