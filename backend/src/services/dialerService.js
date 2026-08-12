// Mock Dialer Service Client
class DialerService {
  async getCallOutcomes(leadId) {
    console.log(`[Dialer Integration] Fetching call logs for Lead ${leadId}...`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      leadId,
      calls: [
        { id: 'c1', timestamp: new Date(Date.now() - 3600000), agent: 'A1 Voice Agent', duration: '45s', outcome: 'Interested - Scheduled ERP configuration' }
      ]
    };
  }
}

module.exports = new DialerService();
