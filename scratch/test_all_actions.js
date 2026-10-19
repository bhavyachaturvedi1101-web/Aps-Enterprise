const a3Service = require('../backend/src/services/a3Service');
const fs = require('fs');
const path = require('path');

async function testAll() {
  console.log('=== TESTING COMPLETE APS AI AUTOMATION ===\n');

  const queries = [
    { label: '1. CREATE LEAD', text: 'Naya lead banao: Mohan Lal, phone 9826011223, Double Die Dona machine, budget 140000' },
    { label: '2. MOVE LEAD STAGE', text: 'Mohan Lal ko Booked stage me move karo' },
    { label: '3. TALLY VOUCHER & 10% ADVANCE', text: 'Tally voucher generate karo ₹14,000 for Mohan Lal' },
    { label: '4. FACTORY JOB CARD ERP', text: 'Job card release karo for Mohan Lal' },
    { label: '5. GST TAX INVOICE & PDF', text: 'GST invoice generate karo ₹1,40,000 for Mohan Lal' },
    { label: '6. WHATSAPP REMINDER', text: 'WhatsApp payment reminder bhejo to Mohan Lal' },
    { label: '7. VOICE DIALER CALL', text: 'Call schedule karo Mohan Lal kal 11 am' },
    { label: '8. INVENTORY AUDIT', text: 'Warehouse inventory check karo' },
    { label: '9. TEAM TASK ASSIGNMENT', text: 'Assign tasks to all employees' },
    { label: '10. USER CREATION', text: 'Naya user banao: Rohit Sharma, role Admin' }
  ];

  for (const q of queries) {
    console.log(`\n--------------------------------------------------`);
    console.log(`RUNNING [${q.label}]: "${q.text}"`);
    try {
      const res = await a3Service.processQuery(q.text, 'test-conv-session');
      console.log(`INTENT DETECTED:`, res.intent || 'direct/matched');
      console.log(`RESPONSE SUMMARY:`, (res.text || '').slice(0, 150).replace(/\n/g, ' ') + '...');
      if (res.createdLead) console.log(`✓ createdLead ID:`, res.createdLead.id, `Name:`, res.createdLead.name, `Stage:`, res.createdLead.stage);
      if (res.updatedLead) console.log(`✓ updatedLead ID:`, res.updatedLead.id, `Stage:`, res.updatedLead.stage, `Tally:`, res.updatedLead.tallyPaymentVerified);
      if (res.createdVoucher) console.log(`✓ createdVoucher No:`, res.createdVoucher.voucherNo, `Amount:`, res.createdVoucher.amount);
      if (res.createdJobCard) console.log(`✓ createdJobCard No:`, res.createdJobCard.jobCardNo, `Plant:`, res.createdJobCard.plant);
      if (res.createdInvoice) console.log(`✓ createdInvoice No:`, res.createdInvoice.id, `Total:`, res.createdInvoice.baseAmount + res.createdInvoice.gst);
      if (res.exportFile) console.log(`✓ exportFile:`, res.exportFile.fileName, `Format:`, res.exportFile.fileFormat);
      if (res.queuedCall) console.log(`✓ queuedCall ID:`, res.queuedCall.callId, `Target:`, res.queuedCall.leadName);
      if (res.sentWhatsAppMessage) console.log(`✓ sentWhatsAppMessage ID:`, res.sentWhatsAppMessage.messageId, `Template:`, res.sentWhatsAppMessage.template);
      if (res.assignedEmployees) console.log(`✓ assignedEmployees count:`, res.assignedEmployees.length);
      if (res.createdSystemUsers) console.log(`✓ createdSystemUsers count:`, res.createdSystemUsers.length);
    } catch (err) {
      console.error(`[FAIL] ERROR:`, err);
    }
  }

  // Check persistence to disk
  const leadsPath = path.join(__dirname, '../backend/leads_data.json');
  if (fs.existsSync(leadsPath)) {
    const savedLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    const mohan = savedLeads.find(l => l.name.toLowerCase().includes('mohan lal'));
    console.log('\n=== DISK VERIFICATION (leads_data.json) ===');
    console.log('Mohan Lal found on disk?:', !!mohan);
    if (mohan) {
      console.log('Stage on disk:', mohan.stage);
      console.log('Tally verified on disk:', mohan.tallyPaymentVerified);
      console.log('ERP Booking on disk:', mohan.erpBookingCreated);
    }
  }

  console.log('\n=== ALL TESTS FINISHED ===');
}

testAll();
