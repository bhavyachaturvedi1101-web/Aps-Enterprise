// Mock ERP Service Client
class ERPService {
  async createBooking(leadId, configuration) {
    console.log(`[ERP Integration] Creating booking for Lead ${leadId} in ERP...`);
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log(`[ERP Integration] Booking created for Lead ${leadId}.`);
    return { success: true, bookingId: `ERP-BK-${Math.floor(Math.random() * 9000) + 1000}` };
  }

  async releaseToFactory(leadId) {
    console.log(`[ERP Integration] RELEASING ORDER TO FACTORY for Lead ${leadId}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[ERP Integration] Order released to manufacturing queue for Lead ${leadId}.`);
    return { success: true, factoryOrderId: `FAC-ORD-${Math.floor(Math.random() * 9000) + 1000}` };
  }
}

module.exports = new ERPService();
