const crmService = require('../services/crmService');
const erpService = require('../services/erpService');
const dialerService = require('../services/dialerService');
const tallyService = require('../services/tallyService');

// Strict state transition map — NO optimistic jumps allowed
const VALID_TRANSITIONS = {
  'Enquiry': ['Qualified'],
  'Qualified': ['Booked'],
  'Booked': ['Confirmed Lead'],
  'Confirmed Lead': ['Client (Paid)'],   // HARD GATE: Requires Tally verification
  'Client (Paid)': ['In Production'],   // Auto-triggers factory release
  'In Production': ['Dispatched'],
  'Dispatched': []
};

/**
 * Validates whether a given state transition is allowed.
 * @param {string} from - Current stage
 * @param {string} to - Requested next stage
 * @returns {boolean}
 */
const isValidTransition = (from, to) => {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

/**
 * Executes all side effects for a given transition.
 * - Calls external integration services
 * - Returns metadata for activity logging
 * @param {object} lead - Lead model instance
 * @param {string} toStage - Target stage
 * @param {object} options - Extra options (simulateError, etc.)
 * @returns {Promise<object>} - { success, integrationData, reason }
 */
const executeTransition = async (lead, toStage, options = {}) => {
  const fromStage = lead.stage;
  const integrationData = {};

  // ─── GATE: Confirmed Lead → Client (Paid) ───────────────────────────────
  // This is the HARD PAYMENT GATE. Must verify 10% advance with Tally.
  if (fromStage === 'Confirmed Lead' && toStage === 'Client (Paid)') {
    const budget = parseFloat(lead.budget);
    const tallyResult = await tallyService.verify10PercentPayment(
      lead.id,
      budget,
      options.simulateError || false
    );

    if (!tallyResult.verified) {
      return {
        success: false,
        reason: tallyResult.reason,
        integrationData: {}
      };
    }

    integrationData.tally = tallyResult;
    console.log(`[StateMachine] Payment gate PASSED for Lead ${lead.id}. Transitioning to Client (Paid).`);
  }

  // ─── Client (Paid) → In Production ─────────────────────────────────────
  // Triggers factory order release in ERP
  if (fromStage === 'Client (Paid)' && toStage === 'In Production') {
    const erpResult = await erpService.releaseToFactory(lead.id);
    integrationData.erp = erpResult;
    console.log(`[StateMachine] Factory release triggered for Lead ${lead.id}.`);
  }

  // ─── CRM Sync: Always sync status on any transition ────────────────────
  const crmResult = await crmService.syncLeadStatus(lead.id, toStage);
  integrationData.crm = crmResult;

  return {
    success: true,
    integrationData
  };
};

module.exports = {
  isValidTransition,
  executeTransition,
  VALID_TRANSITIONS
};
