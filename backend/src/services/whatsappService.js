// A5 WhatsApp Automation Service
const { mockWhatsAppMessages, mockLeads } = require('../config/inMemoryStore');

class WhatsAppService {
  async getMessages() {
    return mockWhatsAppMessages;
  }

  async getSequences() {
    return [
      {
        id: 'SEQ-01',
        name: 'Confirmed Lead Payment Reminder',
        triggerStage: 'Confirmed Lead',
        delayHours: 24,
        template: 'payment_reminder_advance_10pct',
        status: 'Active'
      },
      {
        id: 'SEQ-02',
        name: 'Client (Paid) Order Confirmation & Production Update',
        triggerStage: 'Client (Paid)',
        delayHours: 0,
        template: 'order_confirmation_factory_release',
        status: 'Active'
      }
    ];
  }

  async sendPaymentReminder(leadId) {
    const lead = mockLeads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const msg = {
      messageId: `WA-${String(mockWhatsAppMessages.length + 1).padStart(3, '0')}`,
      leadId: lead.id,
      leadName: lead.name,
      phone: '+919988776655',
      template: 'payment_reminder_advance_10pct',
      sequenceType: 'PAYMENT_REMINDER',
      status: 'Sent',
      sentAt: new Date()
    };

    mockWhatsAppMessages.unshift(msg);
    console.log(`[A5 WhatsApp] Payment reminder sent to ${lead.name} (${msg.messageId}).`);
    return { success: true, message: msg };
  }
}

module.exports = new WhatsAppService();
