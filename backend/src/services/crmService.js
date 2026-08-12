// Mock CRM Service Client
class CRMService {
  async syncLeadStatus(leadId, status) {
    console.log(`[CRM Integration] Syncing Lead ${leadId} status to CRM: "${status}"...`);
    // Simulate CRM API latency
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`[CRM Integration] Lead ${leadId} status synced successfully.`);
    return { success: true, syncedAt: new Date() };
  }
}

module.exports = new CRMService();
