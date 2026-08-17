const crmService = require('../services/crmService');
const erpService = require('../services/erpService');
const dialerService = require('../services/dialerService');
const tallyService = require('../services/tallyService');
const { systemConfig } = require('../config/inMemoryStore');

// Strict state transition map — NO optimistic jumps allowed
const VALID_TRANSITIONS = {
  'Enquiry': ['Qualified'],
  'Qualified': ['Booked'],
  'Booked': ['Confirmed Lead'],
  'Confirmed Lead': ['Client (Paid)'],   // HARD GATE: Requires Tally verification & Countersign if configured
  'Client (Paid)': ['In Production'],   // Auto-triggers factory release & Countersign if configured
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
 * Supports single-action vs countersign dual-approval workflow.
 * @param {object} lead - Lead model instance
 * @param {string} toStage - Target stage
 * @param {object} options - { employeeId, countersignedBy, simulateError }
 * @returns {Promise<object>} - { success, integrationData, reason }
 */
const executeTransition = async (lead, toStage, options = {}) => {
  const fromStage = lead.stage;
  const integrationData = {};

  const isHighStakes = (fromStage === 'Confirmed Lead' && toStage === 'Client (Paid)') ||
                       (fromStage === 'Client (Paid)' && toStage === 'In Production');

  // Check Dual-Approval Policy Requirement
  if (systemConfig.approvalPolicy === 'countersign' && isHighStakes) {
    if (!options.countersignedBy) {
      console.log(`[StateMachine] Transition REJECTED for Lead ${lead.id}: Countersign required under dual-approval policy.`);
      return {
        success: false,
        reason: 'Countersign Required: Under active dual-approval business policy, high-stakes stage transitions require a second approver signature.',
        code: 'COUNTERSIGN_REQUIRED'
      };
    }

    if (options.countersignedBy === options.employeeId) {
      return {
        success: false,
        reason: 'Dual-Approval Violation: Countersigning officer must be distinct from the primary initiating staff member.',
        code: 'DUAL_APPROVAL_VIOLATION'
      };
    }

    integrationData.countersign = {
      initiatedBy: options.employeeId || 'staff-1',
      countersignedBy: options.countersignedBy,
      approvedAt: new Date()
    };
  }

  // ─── GATE: Confirmed Lead → Client (Paid) ───────────────────────────────
  // HARD PAYMENT GATE: Verify 10% advance with Tally.
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
        code: 'PAYMENT_VERIFICATION_FAILED',
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
