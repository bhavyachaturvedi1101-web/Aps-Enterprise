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
    if (process.env.NODE_ENV === 'test' || !this.apiUrl || this.provider !== 'teleforce') {
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

    if (process.env.NODE_ENV === 'test' || !this.apiUrl || this.provider !== 'teleforce' || !this.clientSecret) {
      return { success: true, localOnly: true, syncedAt: new Date() };
    }

    try {
      const updateUrl = process.env.TELEFORCE_CRM_STATUS_URL || 
        (this.apiUrl.includes('/createlead') 
          ? this.apiUrl.replace('/createlead', '/updatelead') 
          : `${this.apiUrl}/status`);

      const payload = {
        lead_id: leadId,
        stage: status,
        organization_id: this.orgId,
        updated_at: new Date().toISOString(),
        ...leadData
      };

      const response = await axios.post(updateUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`,
          'x-teleforce-secret': this.clientSecret
        },
        timeout: 8000
      });

      console.log(`[Teleforce CRM] Lead ${leadId} status updated to "${status}". Response:`, response.status);
      return { success: true, syncedAt: new Date(), data: response.data };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Sync status error (${err.message}). Local transition preserved.`);
      return { success: true, warning: err.message, localOnly: true };
    }
  }

  // Get integration configuration and bridge status
  getStatus() {
    const isConfigured = Boolean(this.apiUrl && this.clientSecret);
    return {
      provider: this.provider,
      configured: isConfigured,
      apiUrl: this.apiUrl ? this.apiUrl.replace(/\/[^/]+$/, '/***') : 'Not Set',
      organizationId: this.orgId || 'Not Set',
      loginEmail: this.loginEmail || 'Not Set',
      mode: isConfigured ? 'Live Teleforce CRM Bridge' : 'Local Standalone / Demo Mode'
    };
  }
}

module.exports = new CRMService();
