// Teleforce CRM Integration Service for APS Enterprise
const axios = require('axios');

class CRMService {
  constructor() {
    this.provider = process.env.CRM_PROVIDER || 'teleforce';
    this.apiUrl = process.env.TELEFORCE_CRM_API_URL || '';
    this.clientId = process.env.TELEFORCE_CRM_CLIENT_ID || 'apsenter';
    this.clientSecret = process.env.TELEFORCE_CRM_CLIENT_SECRET || '';
    this.orgId = process.env.TELEFORCE_CRM_ORG_ID || '3226';
    this.loginEmail = process.env.TELEFORCE_CRM_LOGIN_EMAIL || '';
  }

  // Reload config from environment at runtime
  refreshConfig() {
    this.provider = process.env.CRM_PROVIDER || 'teleforce';
    this.apiUrl = process.env.TELEFORCE_CRM_API_URL || '';
    this.clientId = process.env.TELEFORCE_CRM_CLIENT_ID || 'apsenter';
    this.clientSecret = process.env.TELEFORCE_CRM_CLIENT_SECRET || '';
    this.orgId = process.env.TELEFORCE_CRM_ORG_ID || '3226';
    this.loginEmail = process.env.TELEFORCE_CRM_LOGIN_EMAIL || '';
  }

  // Helper to resolve Teleforce lead ID from internal ID if needed
  resolveTeleforceLeadId(leadId, leadData = {}) {
    if (leadData.teleforceLeadId) return String(leadData.teleforceLeadId);
    if (leadData.leadid) return String(leadData.leadid);
    if (typeof leadId === 'string' && leadId.startsWith('LEAD-')) {
      try {
        const { mockLeads } = require('../config/inMemoryStore');
        const found = mockLeads?.find(l => l.id === leadId);
        if (found?.teleforceLeadId) return String(found.teleforceLeadId);
      } catch {}
    }
    return String(leadId);
  }

  // Push new lead to Teleforce CRM & return Teleforce's assigned leadid
  async createLead(leadData) {
    this.refreshConfig();
    if (process.env.NODE_ENV === 'test' || !this.apiUrl || this.provider !== 'teleforce') {
      return { success: true, localOnly: true, teleforceLeadId: 'TF-MOCK-LEAD', lead: leadData };
    }

    try {
      console.log(`[Teleforce CRM] Creating lead "${leadData.name}" (${leadData.phone || leadData.mobile}) in Teleforce CRM...`);

      const rawPhone = leadData.phone || leadData.mobile || '';
      const cleanDigits = String(rawPhone).replace(/\D/g, '');
      const mobile = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      const payload = {
        name: leadData.name || 'Website Inquiry',
        mobile: mobile,
        phone: mobile,
        email: leadData.email || '',
        organization_id: this.orgId,
        source: leadData.source || 'APS Web System',
        interest: leadData.interest || leadData.product || 'Paper Plate Machine',
        budget: leadData.budget || 0,
        stage: leadData.stage || 'Enquiry',
        remarks: leadData.notes || `Created via APS Enterprise System by ${leadData.assignedEmployeeId || 'Admin'}`
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`,
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'x-teleforce-secret': this.clientSecret
        },
        timeout: 8000
      });

      // Extract Teleforce's assigned lead ID from response
      const teleforceLeadId = response.data?.leadid ||
        response.data?.lead_id ||
        response.data?.id ||
        response.data?.data?.leadid ||
        response.data?.data?.lead_id ||
        response.data?.data?.id ||
        null;

      console.log(`[Teleforce CRM] Lead "${leadData.name}" synced successfully. Assigned Teleforce ID:`, teleforceLeadId || 'N/A', 'Response:', response.status);
      return {
        success: true,
        syncedAt: new Date(),
        teleforceLeadId: teleforceLeadId ? String(teleforceLeadId) : null,
        data: response.data
      };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Failed to push to Teleforce (${err.message}). Local record retained.`);
      return { success: false, error: err.message, localOnly: true };
    }
  }

  // Sync lead stage status updates to CRM (Uses "leadid" spelling without underscore)
  async syncLeadStatus(leadId, status, leadData = {}) {
    this.refreshConfig();
    const targetLeadId = this.resolveTeleforceLeadId(leadId, leadData);
    console.log(`[Teleforce CRM] Syncing Lead ${targetLeadId} (internal: ${leadId}) status to "${status}"...`);

    if (process.env.NODE_ENV === 'test' || !this.apiUrl || this.provider !== 'teleforce' || !this.clientSecret) {
      return { success: true, localOnly: true, leadid: targetLeadId, syncedAt: new Date() };
    }

    try {
      const updateUrl = process.env.TELEFORCE_CRM_STATUS_URL || 
        (this.apiUrl.includes('/createlead') 
          ? this.apiUrl.replace('/createlead', '/updatelead') 
          : `${this.apiUrl}/status`);

      const payload = {
        ...leadData,
        leadid: targetLeadId, // Teleforce strictly expects "leadid" (no underscore)
        stage: status,
        organization_id: this.orgId,
        updated_at: new Date().toISOString()
      };

      // Ensure no underscore spelling is sent to Teleforce
      delete payload.lead_id;
      payload.leadid = targetLeadId;

      const response = await axios.post(updateUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`,
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'x-teleforce-secret': this.clientSecret
        },
        timeout: 8000
      });

      console.log(`[Teleforce CRM] Lead ${targetLeadId} status updated to "${status}". Response:`, response.status);
      return { success: true, syncedAt: new Date(), leadid: targetLeadId, data: response.data };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Sync status error (${err.message}). Local transition preserved.`);
      return { success: true, warning: err.message, leadid: targetLeadId, localOnly: true };
    }
  }

  // Sync CRM edits (phone, budget, interest, notes, etc.) to Teleforce CRM
  async updateLead(leadId, leadData = {}) {
    this.refreshConfig();
    const targetLeadId = this.resolveTeleforceLeadId(leadId, leadData);
    console.log(`[Teleforce CRM] Syncing CRM edits for Lead ${targetLeadId} (internal: ${leadId}) to Teleforce...`);

    if (process.env.NODE_ENV === 'test' || !this.apiUrl || this.provider !== 'teleforce' || !this.clientSecret) {
      return { success: true, localOnly: true, leadid: targetLeadId, syncedAt: new Date() };
    }

    try {
      const updateUrl = process.env.TELEFORCE_CRM_STATUS_URL || 
        (this.apiUrl.includes('/createlead') 
          ? this.apiUrl.replace('/createlead', '/updatelead') 
          : `${this.apiUrl}/updatelead`);

      const rawPhone = leadData.phone || leadData.mobile || '';
      const cleanDigits = String(rawPhone).replace(/\D/g, '');
      const mobile = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      const payload = {
        leadid: targetLeadId, // Strictly "leadid" without underscore
        organization_id: this.orgId,
        updated_at: new Date().toISOString()
      };

      if (leadData.name !== undefined) payload.name = leadData.name;
      if (mobile) {
        payload.mobile = mobile;
        payload.phone = mobile;
      }
      if (leadData.email !== undefined) payload.email = leadData.email;
      if (leadData.interest !== undefined || leadData.product !== undefined) {
        payload.interest = leadData.interest || leadData.product;
      }
      if (leadData.budget !== undefined) payload.budget = leadData.budget;
      if (leadData.stage !== undefined) payload.stage = leadData.stage;
      if (leadData.notes !== undefined || leadData.remarks !== undefined) {
        payload.remarks = leadData.notes || leadData.remarks;
      }

      // Ensure no underscore spelling is present
      delete payload.lead_id;

      const response = await axios.post(updateUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`,
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'x-teleforce-secret': this.clientSecret
        },
        timeout: 8000
      });

      console.log(`[Teleforce CRM] Lead ${targetLeadId} edits synced successfully to Teleforce. Response:`, response.status);
      return { success: true, syncedAt: new Date(), leadid: targetLeadId, data: response.data };
    } catch (err) {
      console.warn(`[Teleforce CRM Warning] Failed to sync lead edits to Teleforce (${err.message}). Local record preserved.`);
      return { success: false, error: err.message, leadid: targetLeadId, localOnly: true };
    }
  }

  // Get integration configuration and bridge status
  getStatus() {
    this.refreshConfig();
    const isConfigured = Boolean(this.apiUrl && this.clientSecret);
    return {
      provider: this.provider,
      configured: isConfigured,
      apiUrl: this.apiUrl ? this.apiUrl.replace(/\/[^/]+$/, '/***') : 'Not Set',
      clientId: this.clientId || 'apsenter',
      organizationId: this.orgId || '3226',
      loginEmail: this.loginEmail || 'Not Set',
      mode: isConfigured ? 'Live Teleforce CRM Bridge' : 'Local Standalone / Demo Mode'
    };
  }
}

module.exports = new CRMService();
