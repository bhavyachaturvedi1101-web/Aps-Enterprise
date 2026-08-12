// Mock Tally Accounting Integration
class TallyService {
  async verify10PercentPayment(leadId, budget, simulateError = false) {
    console.log(`[Tally Integration] Checking ledger payment entry for Lead ${leadId}...`);
    await new Promise(resolve => setTimeout(resolve, 600));

    if (simulateError) {
      console.log(`[Tally Integration] Verification failed: No matching transaction found for Lead ${leadId}.`);
      return {
        verified: false,
        reason: 'Payment transaction matching 10% advance ($' + (budget * 0.10).toFixed(2) + ') not found in ledger.'
      };
    }

    const tenPercent = budget * 0.10;
    console.log(`[Tally Integration] Verified matching payment of $${tenPercent.toFixed(2)} (10% advance) for Lead ${leadId}.`);
    return {
      verified: true,
      amountReceived: tenPercent,
      transactionId: `TXN-TLY-${Math.floor(Math.random() * 90000) + 10000}`,
      verifiedAt: new Date()
    };
  }
}

module.exports = new TallyService();
