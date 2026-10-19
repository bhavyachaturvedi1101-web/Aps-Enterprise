'use strict';

let _store = null;
function getStore() {
  if (!_store) {
    try { _store = require('../../../config/inMemoryStore'); } catch { _store = {}; }
  }
  return _store;
}

async function handleFactoryOptions() {
  return {
    text: `### Factory Operations Controls\nSelect factory operation command:`,
    options: [
      'Track assembly progress on active job cards',
      'Check warehouse stock of raw materials & machinery',
      'Release 10% payment verified orders to shop floor'
    ]
  };
}

async function handleFactoryTracker() {
  return {
    text: `### 🏭 Factory Shop Floor Assembly Tracker\n\n• **Active Job Cards:** 4 Units in Assembly\n• **Stage:** CNC Frame Welding & Motor Mount\n• **On-Time Rate:** 96.2%`,
    table: [
      { 'Job #': 'JC-0992', Machine: 'Slipper Making Machine', Stage: 'Quality Testing', Priority: 'High' },
      { 'Job #': 'JC-0993', Machine: 'Paper Bag Making Machine', Stage: 'CNC Assembly', Priority: 'Normal' }
    ],
    chart: null
  };
}

async function handleActionCheckInventory() {
  const store = await getStore();
  const inv = store.mockInventory || [];
  return {
    text: `### 📦 Warehouse Inventory Report\n\nFound **${inv.length} SKU categories** monitored in Plant 1.`,
    table: inv.slice(0, 10).map(i => ({
      SKU: i.sku,
      Name: i.name,
      'Total Stock': i.totalStock || i.stockUnits || 0,
      'Booked Stock': i.bookedStock || 0,
      Status: i.status || 'In Stock'
    })),
    chart: null
  };
}

async function handleActionErpBooking(query) {
  const erpService = require('../../erpService');
  const res = await erpService.createBooking('LEAD-001', { interest: 'Automatic Dona Machine' });
  return {
    text: `### ⚙️ ERP Booking Registered\n\nBooking ID: \`${res.bookingId}\` created in enterprise ERP system.`,
    table: [{ 'Booking ID': res.bookingId, Status: 'Confirmed', Mode: res.mode }],
    chart: null
  };
}

async function handleDocSearch(query) {
  return {
    text: `### 📄 Technical Specification Search (RAG)\n\nFound matching specification document for query: "${query}". Automatic Dona Making Machine features 2.5kW motor, 4000 pcs/hr output.`,
    table: null,
    chart: null
  };
}

async function handleCompanyInfo() {
  return {
    text: `### 🏢 APS Enterprises India\nLeading manufacturer of high-speed paper plate, dona, and packaging machinery headquartered in Indore, MP.`,
    table: null,
    chart: null
  };
}

async function handleDashboardInfo() {
  return {
    text: `### 🖥️ APS Cockpit Overview\nCentral operational panel connecting CRM, Tally ERP 9, Factory Shop Floor, Meta WhatsApp API, and AI Voice Dialer.`,
    table: null,
    chart: null
  };
}

async function handleNormalChat(query) {
  return {
    text: `Hello! I am your APS Enterprise Operations Assistant. You can ask me about pipeline leads, factory job cards, Tally payments, WhatsApp broadcasts, or inventory stock levels.`,
    table: null,
    chart: null
  };
}

module.exports = {
  handleFactoryOptions,
  handleFactoryTracker,
  handleActionCheckInventory,
  handleActionErpBooking,
  handleDocSearch,
  handleCompanyInfo,
  handleDashboardInfo,
  handleNormalChat
};
