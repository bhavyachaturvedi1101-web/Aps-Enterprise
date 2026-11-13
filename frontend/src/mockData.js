// Master Static & Master Reference Data — APS Enterprise

export const MOCK_LEADS = [];

export const MOCK_ACTIVITY_LOGS = [];

export const MOCK_EMPLOYEES = [
  {
    "id": "e1",
    "name": "Super Admin",
    "role": "Super Admin",
    "email": "admin@apsenterprises.in",
    "phone": "+91 99880 01122",
    "department": "Executive & AI Management",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 95
  },
  {
    "id": "e2",
    "name": "Operations Manager",
    "role": "Operations & Production Lead",
    "email": "manager@apsenterprises.in",
    "phone": "+91 98202 33445",
    "department": "Factory Operations & Manufacturing",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 92
  },
  {
    "id": "e3",
    "name": "Accounts Officer",
    "role": "Senior Accountant",
    "email": "accounts@apsenterprises.in",
    "phone": "+91 98203 44556",
    "department": "Finance & Accounting",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 94
  },
  {
    "id": "e4",
    "name": "Sales Telecaller",
    "role": "Senior Telecaller",
    "email": "telecaller@apsenterprises.in",
    "phone": "+91 98204 55667",
    "department": "Voice Operations & Telecalling",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 90
  },
  {
    "id": "e5",
    "name": "Amit Patidar",
    "role": "Field Sales Executive",
    "email": "amit.patidar@apsenterprises.in",
    "phone": "+91 98205 66778",
    "department": "Field Sales & Plant Demonstrations",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 91
  },
  {
    "id": "e6",
    "name": "Vikram Rathore",
    "role": "Plant Assembly Supervisor",
    "email": "vikram.rathore@apsenterprises.in",
    "phone": "+91 98206 77889",
    "department": "Plant Quality Control & Assembly",
    "status": "Online",
    "leadsAssigned": 0,
    "leadsConverted": 0,
    "revenue": 0,
    "callsToday": 0,
    "tasksCompleted": 0,
    "performance": 93
  }
];

export const MOCK_BOOKINGS = [];

export const MOCK_PAYMENTS = [];

export const MOCK_INVENTORY = [
  {
    id: "INV-101",
    name: "Fully Automatic Double Die Dona Pattal Machine",
    sku: "APS-DD-01",
    category: "Paper Plate Machines",
    stock: 8,
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
    reorderLevel: 30,
    unitPrice: 4800,
    status: "In Stock",
    location: "Indore Yard Stockpile"
  }
];

export const MOCK_INVENTORY_SUMMARY = {
  totalSkus: 6,
  totalStockValue: 3950000,
  lowStockAlerts: 0,
  criticalPartsCount: 0
};

export const MOCK_INVOICES = [];

export const MOCK_TALLY_VOUCHERS = [];
