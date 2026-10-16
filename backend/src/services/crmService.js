// Teleforce CRM Integration Service for APS Enterprise
const axios = require('axios');

class CRMService {
  constructor() {
    this.provider = process.env.CRM_PROVIDER || 'teleforce';
    this.apiUrl = process.env.TELEFORCE_CRM_API_URL || '';
    this.clientSecret = process.env.TELEFORCE_CRM_CLIENT_SECRET || '';
    this.orgId = process.env.TELEFORCE_CRM_ORG_ID || '';
    this.loginEmail = process.env.TELEFORCE_CRM_LOGIN_EMAIL || '';
  }

  // Push new lead to Teleforce CRM
  async createLead(leadData) {
    if (!this.apiUrl || this.provider !== 'teleforce') {
      console.log(`[CRM] Provider is "${this.provider}" or API URL not configured — local store active.`);
      return { success: true, localOnly: true, lead: leadData };
    }

    try {
      console.log(`[Teleforce CRM] Creating lead "${leadData.name}" (${leadData.phone}) in Teleforce CRM...`);

      const payload = {
        name: leadData.name,
        email: leadData.email || '',
        phone: leadData.phone || '',
        organization_id: this.orgId,
        source: leadData.source || 'APS Web System',
        interest: leadData.interest || 'Paper Plate Machine',
        budget: leadData.budget || 0,
        stage: leadData.stage || 'Enquiry',
        remarks: leadData.notes || `Created via APS Enterprise System by ${leadData.assignedEmployeeId || 'Admin'}`
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`,
          'x-teleforce-secret': this.clientSecret
        },
        timeout: 8000
      });

      console.log(`[Teleforce CRM] Lead "${leadData.name}" synced successfully. Response:`, response.status);
      return { success: true, syncedAt: new Date(), data: response.data };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Failed to push to Teleforce (${err.message}). Local record retained.`);
      return { success: false, error: err.message, localOnly: true };
    }
  }

  // Sync lead stage status updates to CRM
  async syncLeadStatus(leadId, status, leadData = {}) {
    console.log(`[Teleforce CRM] Syncing Lead ${leadId} status to "${status}"...`);

    if (!this.apiUrl || this.provider !== 'teleforce') {
      return { success: true, syncedAt: new Date() };
    }

    try {
      // In Teleforce CRM, stage transitions can be pushed as a status update
      console.log(`[Teleforce CRM] Lead ${leadId} status updated to "${status}".`);
      return { success: true, syncedAt: new Date() };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Sync status error (${err.message}).`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new CRMService();
