'use strict';

const crm = require('./crmHandlers');
const sales = require('./salesHandlers');
const operations = require('./operationsHandlers');
const finance = require('./financeHandlers');
const comms = require('./commsHandlers');
const memory = require('./memoryHandlers');

const HANDLERS = {
  // AI Persistent Memory
  ai_memory_teach: memory.handleAiMemoryTeach,
  ai_memory_recall: memory.handleAiMemoryRecall,

  // Navigation / Landing Options
  landing_assign_tasks_options: sales.handleAssignTasksOptions,
  landing_invoices_options: finance.handleInvoicesOptions,
  landing_voice_dialer_options: comms.handleVoiceDialerOptions,
  landing_factory_options: operations.handleFactoryOptions,

  // Operations & Factory
  company_info: operations.handleCompanyInfo,
  dashboard_info: operations.handleDashboardInfo,
  normal_chat: operations.handleNormalChat,
  factory_tracker: operations.handleFactoryTracker,
  doc_search: operations.handleDocSearch,
  action_check_inventory: operations.handleActionCheckInventory,
  action_erp_booking: operations.handleActionErpBooking,

  // Finance & Invoices
  invoices: finance.handleInvoices,
  invoice_generator: finance.handleInvoiceGenerator,
  margin_calculator: finance.handleMarginCalculator,
  action_post_tally: finance.handleActionPostTally,
  explain_metrics: finance.handleExplainMetrics,

  // Communications & Dialer
  call_sentiment: comms.handleCallSentiment,
  whatsapp_analytics: comms.handleWhatsAppAnalytics,
  action_send_email: comms.handleActionSendEmail,
  action_queue_dialer: comms.handleActionQueueDialer,
  schedule_call: comms.handleScheduleCall,
  action_send_whatsapp: comms.handleActionSendWhatsApp,
  dialer: comms.handleDialer,
  whatsapp: comms.handleWhatsApp,
  generate_report: comms.handleGenerateReport,
  export_file: comms.handleExportFile,

  // Sales & Team
  sales_team_report: sales.handleSalesTeamReport,
  sales_leaderboard: sales.handleSalesLeaderboard,
  employee_performance: sales.handleEmployeePerformance,
  predictive_forecast: sales.handlePredictiveForecast,
  assign_employee_tasks: sales.handleAssignEmployeeTasks,
  action_create_user: sales.handleActionCreateUser,
  top_performer: sales.handleTopPerformer,
  revenue_summary: sales.handleRevenueSummary,
  employee_list: sales.handleEmployeeList,
  kpi_stats: sales.handleKpiStats,

  // CRM & Pipeline
  show_all_crm_leads: crm.handleShowAllCrmLeads,
  action_create_lead: crm.handleActionCreateLead,
  action_transition_lead: crm.handleActionTransitionLead,
  leads_by_stage: crm.handleLeadsByStage,
  lead_count: crm.handleLeadCount,
  pending_payment: crm.handlePendingPayment,
  hot_leads: crm.handleHotLeads,
  compare_period: crm.handleComparePeriod,
  recent_activity: crm.handleRecentActivity,
  pipeline_summary: crm.handlePipelineSummary,
  churn_risk: crm.handleChurnRisk,
  trend_analysis: crm.handleTrendAnalysis
};

function getHandler(intentName) {
  return HANDLERS[intentName] || null;
}

module.exports = {
  HANDLERS,
  getHandler
};
