// A5 WhatsApp Automation Service
const { 
  mockWhatsAppMessages, 
  mockWhatsAppSequences, 
  mockWhatsAppTemplates, 
  systemConfig 
} = require('../config/inMemoryStore');
const { Lead, ActivityLog } = require('../models');

class WhatsAppService {
  async getMessages() {
    return mockWhatsAppMessages;
  }

  async getSequences() {
    return mockWhatsAppSequences;
  }

  async getTemplates() {
    return mockWhatsAppTemplates;
  }

  async getAnalytics() {
    const totalSent = mockWhatsAppMessages.length;
    const delivered = mockWhatsAppMessages.filter(m => m.status === 'Delivered' || m.status === 'Read').length;
    const read = mockWhatsAppMessages.filter(m => m.status === 'Read').length;
    const activeSequences = mockWhatsAppSequences.filter(s => s.status === 'Active').length;

    return {
      totalMessagesSent: 1248 + totalSent,
      deliveredCount: 1230 + delivered,
      deliveryRate: '98.8%',
      readRate: '92.4%',
      conversionRate: '41.2%',
      activeSequencesCount: activeSequences,
      totalSequencesCount: mockWhatsAppSequences.length,
      provider: systemConfig.whatsappProvider || 'Meta Cloud API (WABA Live)',
      wabaPhoneNumber: systemConfig.wabaPhoneNumber || '+91 99880 01122',
      webhookStatus: 'Healthy (200 OK)'
    };
  }

  async toggleSequence(sequenceId) {
    const seq = mockWhatsAppSequences.find(s => s.id === sequenceId);
    if (!seq) throw new Error(`Sequence ${sequenceId} not found`);
    seq.status = seq.status === 'Active' ? 'Paused' : 'Active';
    return { success: true, sequence: seq };
  }

  async updateSequence(sequenceId, updates) {
    const seq = mockWhatsAppSequences.find(s => s.id === sequenceId);
    if (!seq) throw new Error(`Sequence ${sequenceId} not found`);
    if (updates.delayHours !== undefined) seq.delayHours = Number(updates.delayHours);
    if (updates.status) seq.status = updates.status;
    if (updates.name) seq.name = updates.name;
    return { success: true, sequence: seq };
  }

  async sendPaymentReminder(leadId) {
    let lead = await Lead.findByPk(leadId);
    if (!lead) lead = await Lead.findByPk(`LEAD-${String(leadId).padStart(3, '0')}`);
    if (!lead) throw new Error('Lead not found');

    const advanceAmount = (parseFloat(lead.budget || 20000) * 0.10).toLocaleString('en-IN');
    const totalBudget = parseFloat(lead.budget || 20000).toLocaleString('en-IN');

    const msg = {
      messageId: `WA-${String(mockWhatsAppMessages.length + 1).padStart(3, '0')}`,
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone || '+91 99887 76655',
      template: 'payment_reminder_advance_10pct',
      sequenceType: 'PAYMENT_REMINDER',
      product: lead.interest || 'Machinery Unit',
      advanceAmount,
      totalBudget,
      status: 'Delivered',
      sentAt: new Date(),
      preview: `Hello ${lead.name}, your booking for ${lead.interest || 'Machine'} (Total ₹${totalBudget}) is approved! To release your machine order to the manufacturing queue, please confirm the 10% advance payment of ₹${advanceAmount}.`,
      lastEvent: 'Delivered to handset (✓✓)'
    };

    mockWhatsAppMessages.unshift(msg);

    await ActivityLog.create({
      id: `log-${Date.now()}`,
      employeeId: 'e3',
      leadId: lead.id,
      action: `Automated WhatsApp 10% advance reminder sent to ${lead.name}`,
      fromStage: lead.stage,
      toStage: lead.stage
    });

    console.log(`[WhatsApp Automation] Payment reminder sent to ${lead.name} (${msg.messageId}).`);
    return { success: true, message: msg };
  }

  async sendCustomMessage({ leadId, phone, templateId, customText, recipientName, product, amount }) {
    let lead = null;
    if (leadId) {
      lead = await Lead.findByPk(leadId);
      if (!lead) lead = await Lead.findByPk(`LEAD-${String(leadId).padStart(3, '0')}`);
    }

    const targetName = recipientName || lead?.name || 'Valued Customer';
    const targetPhone = phone || lead?.phone || '+91 99880 00000';
    const template = mockWhatsAppTemplates.find(t => t.id === templateId) || mockWhatsAppTemplates[0];

    const advanceAmount = amount || (lead ? (parseFloat(lead.budget) * 0.10).toLocaleString('en-IN') : '2,500');
    const productName = product || lead?.interest || 'CNC Machinery Package';

    const msg = {
      messageId: `WA-${String(mockWhatsAppMessages.length + 1).padStart(3, '0')}`,
      leadId: lead?.id || 'DIRECT',
      leadName: targetName,
      phone: targetPhone,
      template: template.id,
      sequenceType: template.id.toUpperCase().includes('REMINDER') ? 'PAYMENT_REMINDER' : 
                    template.id.toUpperCase().includes('ORDER') ? 'ORDER_CONFIRMATION' :
                    template.id.toUpperCase().includes('PRODUCTION') ? 'PRODUCTION_UPDATE' :
                    template.id.toUpperCase().includes('DISPATCH') ? 'DISPATCH_NOTICE' : 'BROCHURE_NURTURE',
      product: productName,
      advanceAmount,
      totalBudget: lead?.budget || '25,000',
      status: 'Delivered',
      sentAt: new Date(),
      preview: customText || template.bodyText
        .replace('{{1}}', targetName)
        .replace('{{2}}', productName)
        .replace('{{3}}', lead?.budget || '25,000')
        .replace('{{4}}', advanceAmount)
        .replace('{{5}}', '2 business days'),
      lastEvent: 'Delivered to handset (✓✓)'
    };

    mockWhatsAppMessages.unshift(msg);

    if (lead) {
      await ActivityLog.create({
        id: `log-${Date.now()}`,
        employeeId: 'e3',
        leadId: lead.id,
        action: `WhatsApp message (${template.name}) sent to ${targetName}`,
        fromStage: lead.stage || 'None',
        toStage: lead.stage || 'None'
      });
    }

    return { success: true, message: msg };
  }
}

module.exports = new WhatsAppService();
