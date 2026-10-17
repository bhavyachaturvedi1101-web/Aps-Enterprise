'use strict';
/**
 * A3 Intent Classifier
 * Categorized pattern rules for conversational and operational query understanding.
 */

const INTENTS = [
  // ── AI Persistent Memory Intents (Evaluated early to capture commands & recall) ──
  { name: 'ai_memory_teach', patterns: [
    /^(please\s+)?(remember\s+that|remember|yaad\s+rakhna\s+ki|yaad\s+rakho\s+ki|yaad\s+rakhna|yaad\s+rakho|note\s+down\s+that|note\s+down|note\s+that|save\s+to\s+memory|save\s+this\s+fact|teach\s+ai|keep\s+in\s+mind\s+that|keep\s+in\s+mind)/i,
    /save.*?(memory|fact|note)/i,
    /teach.*?(ai|assistant)/i
  ] },
  { name: 'ai_memory_recall', patterns: [
    /\b(what\s+do\s+you\s+remember|show\s+memory|show\s+ai\s+memory|recall\s+memory|search\s+memory|past\s+memories|learned\s+facts|ai\s+memory)\b/i,
    /\b(who\s+is\s+animesh|animesh\s+kaun\s+hai|tell\s+me\s+about\s+animesh|animesh\s+ke\s+baare\s+mein|about\s+animesh)\b/i,
    /^(?!.*(task|assign|kaam|work|duty|bhejo|allot)).*?\banimesh\b/i
  ] },

  // ── Options Flow Intents ──
  { name: 'landing_assign_tasks_options', patterns: [/assign team tasks options/i] },
  { name: 'landing_invoices_options',     patterns: [/billing & invoices options/i] },
  { name: 'landing_voice_dialer_options', patterns: [/voice dialer options/i] },
  { name: 'landing_factory_options',      patterns: [/production progress options/i] },
  
  // ── Action Creation & Mutation Intents (Must be evaluated FIRST) ──
  { name: 'action_create_lead', patterns: [
    /(create|generate|add|register|insert|make|new|naya|nayi)\s*(\d+)?\s*(new)?\s*(lead|client|prospect|customer|inquiry|deal|grahak)/i,
    /(lead|client|prospect|customer|grahak).*?(create|add|generate|register|banao|entry|daalo|dalo|karo)/i,
    /new lead/i,
    /naya lead/i,
    /nayi lead/i,
    /lead add/i,
    /nayi entry/i,
    /lead banao/i,
    /^lead\s*[:=\-]/i
  ] },
  { name: 'action_create_user', patterns: [
    /(create|generate|add|register|hire|insert|new|invite|make|onboard)\s*(\d+)?\s*(new)?\s*(user|employee|staff|member|worker|telecaller|sales rep|executive|fitter|technician|supervisor|accountant|admin|super admin|operator|account)/i,
    /(user|employee|staff|member|worker|telecaller|rep|fitter|supervisor|admin|super admin|account).*?(create|add|generate|hire|banao|register|new|role|invite|name)/i,
    /name\s*[:=\-].*?role\s*[:=\-]/i,
    /role\s*[:=\-].*?name\s*[:=\-]/i,
    /name\s*[:=\-].*?(add|create|user)/i,
    /(add|create|invite|register).*?name\s*[:=\-]/i,
    /(add|create|invite|register).*?(admin|super admin|operations|telecaller|accountant|agent)/i,
    /new (user|employee|staff|worker|member|account|admin)/i,
    /add (user|employee|staff|worker|member|account|admin)/i,
    /hire (user|employee|staff|worker|telecaller|rep)/i
  ] },
  { name: 'action_transition_lead', patterns: [
    /move.*lead/i, /transition.*lead/i, /change.*stage/i, /update.*stage/i, /set.*stage/i, /mark.*as/i, /promote.*lead/i, /stage badlo/i, /stage change/i, /move karo/i, /paid mark/i,
    /(stage|status)\s*(change|badlo|update|move)/i,
    /ko\s*.*?(stage|production|dispatched|booked|paid|qualified|confirmed)\s*(me|mai|mein)?\s*(move|daalo|dalo|bhejo|karo)/i,
    /(move|dalo|daalo|shift|advance)\s*.*?(stage|production|dispatched|booked|paid|qualified|confirmed)/i
  ] },
  { name: 'action_post_tally', patterns: [
    /(create|generate|add|post|make|insert|record|new)\s*(\d+)?\s*(new)?\s*(record|voucher|entry|payment|advance|receipt|transaction).*?(tally|ledger|accounting|sync)/i,
    /(tally|ledger|voucher).*?(create|generate|add|post|make|insert|record|banao|entry|new|karo|generate)/i,
    /generate.*record.*tally/i,
    /add.*record.*tally/i,
    /post.*tally/i,
    /add.*tally/i,
    /create.*voucher/i,
    /post.*voucher/i,
    /reconcile.*tally/i,
    /verify.*payment/i,
    /tally voucher/i,
    /tally entry/i,
    /paisa receive/i,
    /advance voucher/i,
    /verify.*(advance|deposit|payment)/i
  ] },
  { name: 'action_erp_booking', patterns: [
    /(create|generate|add|register|insert|make|release|new)\s*(\d+)?\s*(new)?\s*(job card|erp|manufacturing booking|production booking|factory booking)/i,
    /(job card|erp|factory|production).*?(create|generate|add|release|banao|booking|karo)/i,
    /job\s*card\s*(release|banao|generate|karo|bana\s*do|kaat\s*do)/i,
    /release.*(factory|production|job\s*card)/i,
    /start.*production/i,
    /factory\s*(me|mai)?\s*(release|bhejo|order)/i
  ] },
  { name: 'action_queue_dialer', patterns: [
    /(create|queue|schedule|add|trigger)\s*(\d+)?\s*(new)?\s*(call|dialer|phone call|voice call)/i,
    /call.*(queue|schedule|add|trigger)/i,
    /dialer me daalo/i,
    /call karo/i,
    /dialer\s*(me|mai)?\s*(daalo|dalo|add)/i
  ] },
  { name: 'action_send_whatsapp', patterns: [
    /send.*whatsapp/i, /whatsapp.*reminder/i, /trigger.*sequence/i, /send.*reminder/i, /whatsapp bhejo/i, /reminder bhejo/i, /msg karo/i,
    /(whatsapp|wa)\s*(bhejo|msg|message|reminder|send|karo)/i,
    /payment\s*reminder\s*(bhejo|send|karo)/i
  ] },
  { name: 'action_send_email', patterns: [/send.*email/i, /email.*quotation/i, /mail/i, /send.*pdf.*email/i, /email bhejo/i, /send email/i] },
  { name: 'action_check_inventory', patterns: [
    /inventory/i, /warehouse/i, /\bstock\b/i, /available units/i, /raw material/i, /kitna stock/i, /inventory stock/i,
    /godown/i, /maal kitna/i, /rolls kitne/i, /stock\s*(check|kitna|batao|dikhao)/i
  ] },
  { name: 'invoice_generator', patterns: [
    /\bgst\b/i, /tax invoice/i, /\bhsn\b/i, /generate invoice/i, /create invoice/i, /billing details/i, /make.*invoice/i, /invoice.*banao/i, /invoice.*generate/i,
    /invoice\s*(banao|generate|create|karo|chahiye|do)/i,
    /bill\s*(banao|generate|kat\s*do|kaato|karo)/i
  ] },
  { name: 'assign_employee_tasks', patterns: [
    /(task|tasks|kaam)\s*(assign|allocate|allot|do|de\s*do|bhejo|lagao)/i,
    /(assign|allocate|allot|give|distribute)\s*(a\s*)?(new\s*)?(task|tasks|work|kaam)/i,
    /(task|tasks|kaam)\s*(karo|kar\s*do|de\s*do|do)/i,
    /(task|tasks)\s*(to|for|ko)/i,
    /ko\s*(task|kaam)\s*(assign|do|de|lagao)/i,
    /ko\s*.*?(task|kaam)/i,
    /\btasks?\b.*?\b(assign|allocate|karo|do|de)\b/i,
    /\b(assign|allocate)\b.*?\btasks?\b/i,
    /give.*task/i,
    /assign.*task/i,
    /tasks? (to|for) (sales|telecaller|caller|factory|dispatch|logistics|finance|team|staff|employees?)/i,
    /(sales|telecaller|caller|factory|dispatch|logistics|finance|team|staff|employees?).*tasks?/i,
    /task.*(every|all|employee|role|staff|team|member|worker|sales|telecaller|caller)/i,
    /(employee|staff|team|sales|caller|factory|dispatch).*task/i,
    /assign.*work/i,
    /give.*work/i,
    /distribute.*task/i,
    /allocate.*task/i,
    /role.*task/i,
    /work.*role/i,
    /kaam\s*do/i,
    /task\s*assign/i,
    /assign\s*task/i,
    /\b(task|kaam)\b.*?\b(assign|allocate|de\s*do|bhejo|lagao|karo|do)\b/i,
    /\b(assign|allocate|de\s*do|bhejo|lagao|karo|do)\b.*?\b(task|kaam)\b/i,
    /\b(task|tasks|kaam)\s*(de|dena|karna|karwana)\b/i,
    /\b(bolo|kaho)\b.*?\b(ki|that)\b/i
  ] },

  // ── Query & Reporting Intents ──
  { name: 'company_info', patterns: [
    /where.*(is|located|situated|based|hq|office|aps|company)/i,
    /where is aps/i,
    /\blocation\b/i,
    /\blocated\b/i,
    /\baddress\b/i,
    /\bheadquarters\b/i,
    /\bhq\b/i,
    /about (aps|the company|enterprise|business)/i,
    /what is aps/i,
    /who is aps/i,
    /tell me about aps/i,
    /contact (details|number|info|aps|us)/i,
    /helpline/i,
    /official website/i,
    /apsenterprises/i,
    /kahan (hai|h|he|par|pe)/i,
    /aps.*(kahan|address|location|kya hai|details|products|machines|plants)/i,
    /products.*(aps|company|sell|make|produce)/i,
    /machine.*(sell|make|manufacture|price|catalog|list)/i
  ] },
  { name: 'dashboard_info', patterns: [
    /dashboard (options|features|modules|tools|contain|overview|guide|summary)/i,
    /what.*(options|features|modules|contain|does this dashboard|can this dashboard|dashboard do|is this system)/i,
    /explain.*(dashboard|system|platform|features|options|modules|menu)/i,
    /how.*use.*(dashboard|system|platform|app)/i,
    /all.*(options|features|modules|pages|tabs)/i,
    /features.*(kya hai|list|overview)/i,
    /dashboard me kya kya hai/i
  ] },
  { name: 'sales_team_report', patterns: [
    /sales\s*team.*?report/i,
    /report.*?sales\s*team/i,
    /sales.*?report/i,
    /report.*?sales/i,
    /team.*?sales.*?report/i,
    /sales.*?team.*?(gene?ra?t?e?|download|pdf|export|banao|nikalo|chahiye|do|de|karo)/i,
    /(gene?ra?t?e?|download|pdf|export|banao|nikalo|chahiye).*?sales\s*team/i,
    /sales\s*team\s*ki\s*report/i,
    /sales.*?ki.*?report/i,
    /report\s*gene?ra?t?e?.*?(karo|do|kro)?.*?sales/i,
    /sales\s*report\s*gene?ra?t?e?/i,
    /gene?ra?t?e?\s*sales\s*report/i,
    /sales\s*performance\s*report/i,
    /sales\s*audit\s*report/i,
    /team\s*report/i,
    /report\s*(gene?ra?t?e?|banao).*?(sales|team)/i,
    /(sales|team).*?pdf/i,
    /pdf.*?(sales|team)/i
  ] },
  { name: 'generate_report', patterns: [
    /generate.*report/i,
    /executive report/i,
    /full report/i,
    /create.*report/i,
    /business report/i,
    /operations report/i,
    /complete report/i,
    /management report/i,
    /download.*report/i,
    /report download/i,
    /report generate/i,
    /report banao/i,
    /report chahiye/i,
    /poori report/i
  ] },
  { name: 'normal_chat', patterns: [
    /^\s*(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|ha\b|haa|ok|okay|cool|nice)\s*$/i,
    /kaise ho|how are you|kaise hain|kya haal|what's up|sup\b|how do you do/i,
    /who are you|aap kaun ho|who created you|tum kaun ho|who r u|what are you/i,
    /what can you do|kya kar sakte ho|features kya hai|help me|kya kya kar sakte ho/i,
    /thank you|thanks|shukriya|dhanyawad|thank u|thx|awesome|great/i,
    /bye|goodbye|alvida|cya|see you/i
  ] },
  { name: 'invoices', patterns: [
    /show.*(invoice|billing|ledger)/i,
    /list.*(invoice|billing|ledger)/i,
    /all.*(invoice|billing|ledger)/i,
    /view.*(invoice|billing|ledger)/i,
    /invoice.*(list|history|records|table|ledger)/i,
    /invoice dikhao/i,
    /saare invoice/i
  ] },
  { name: 'factory_tracker', patterns: [
    /track.*status/i,
    /status.*track/i,
    /\b(track|tracking|tracker|shopfloor|assembly|production|factory|mfg|manufacturing|job card|jobcard)\b/i,
    /production.*(track|status|progress|update|data)/i,
    /assembly.*(track|status|progress|update|data|line)/i,
    /machine.*(track|status|progress|build)/i,
    /order.*(status|progress|track)/i,
    /milestone/i,
    /progress/i
  ] },
  { name: 'call_sentiment', patterns: [/sentiment/i, /call transcript/i, /call analysis/i, /customer mood/i, /speech analysis/i, /voice call/i] },
  { name: 'whatsapp_analytics', patterns: [/whatsapp analytics/i, /open rate/i, /delivery rate/i, /campaign performance/i, /waba stats/i, /whatsapp campaign/i] },
  { name: 'doc_search', patterns: [/search.*doc/i, /manual/i, /specification/i, /datasheet/i, /warranty/i, /pdf catalog/i, /find document/i, /technical spec/i, /spindle/i, /search pdf/i, /rag/i] },
  { name: 'sales_leaderboard', patterns: [
    /^\s*sales\s*$/i,
    /^\s*sales (data|overview|summary|report|team|pipeline|reps|performance|ranking)\s*$/i,
    /leaderboard/i,
    /badge/i,
    /rankings?/i,
    /top seller/i,
    /gamification/i,
    /sales (leaderboard|ranking|top|performance|rank|reps|champion)/i,
    /top (sales|rep|closer|seller|performer)/i
  ] },
  { name: 'employee_performance', patterns: [
    /(employee|employer|sales rep|team member|staff|worker).*?(perform|profit|spent|revenue|gain|roi|kpi|cost|figures|graph|report)/i,
    /(perform|profit|spent|revenue|gain|roi|kpi|cost).*?(employee|employer|sales rep|team member|staff|worker)/i,
    /(spent|gain profit|profit gain|cost spent).*?(employee|employer|sales rep|team|staff)/i,
    /all (employers|employees) (performance|spent|profit|gain)/i,
    /(employers|employees) (profit|spent|revenue|gain)/i
  ] },
  { name: 'predictive_forecast', patterns: [/predict/i, /forecast/i, /next month.*sales/i, /revenue forecast/i, /future revenue/i, /september revenue/i, /predictive sales/i] },
  { name: 'churn_risk', patterns: [/churn/i, /\brisk\b/i, /drop out/i, /stalled leads/i, /at risk/i, /cold lead/i, /churn risk/i] },
  { name: 'margin_calculator', patterns: [
    /(order|machine|product|cnc|laser|dona|pattal|unit|item|hydraulic).*?(margin|profit|markup|cost breakdown)/i,
    /profit margin/i,
    /margin calculator/i,
    /(margin|cost breakdown) for/i,
    /order margin/i
  ] },
  { name: 'schedule_call', patterns: [
    /schedule.*(call|dial|phone|voice|followup|meeting)/i,
    /call.*(schedule|queue|set|book|reminder|time|at|for)/i,
    /(phone|voice|dialer|telecaller).*call/i,
    /book.*call/i,
    /set.*call/i,
    /call.*kar do/i,
    /call.*bhejo/i,
    /call.*queue/i,
    /can it schedule call/i,
    /schedule call/i
  ] },
  { name: 'export_file', patterns: [
    /\bexport\b/i,
    /\bcsv\b/i,
    /\bexcel\b/i,
    /\bxlsx\b/i,
    /\bxml\b/i,
    /\bdocx\b/i,
    /\bjson\b/i,
    /\bformat\b/i,
    /download (file|data|leads|report|all|csv|excel|xlsx|pdf|xml|docx|json)/i,
    /save (file|data|as|to)/i,
    /generate (file|data|csv|excel|xlsx|pdf|xml|docx|json|format|report in)/i,
    /(kisi bhi|kisi|koi bhi|kisi format|format me|format mai|format mein)/i,
    /(csv|excel|xlsx|pdf|xml|docx|word|json|file)\s*(format|mai|me|mein|banao|karo|kr do|kardo|chahiye|nikalo|generate|export|download)/i
  ] },
  { name: 'explain_metrics', patterns: [/explain.*kpi/i, /explain.*metric/i, /explain.*formula/i, /what is kpi/i, /how is.*calculated/i, /business metrics/i, /definition of/i] },
  { name: 'trend_analysis', patterns: [/trend analysis/i, /anomaly/i, /anomalies/i, /growth rate/i, /decline/i, /variance/i, /sales velocity/i, /pipeline health/i] },
  { name: 'leads_by_stage', patterns: [/confirmed lead/i, /qualified lead/i, /enquir/i, /in production/i, /dispatched/i, /booked lead/i, /client.*paid/i, /paid.*client/i] },
  { name: 'show_all_crm_leads', patterns: [
    /show.*crm/i,
    /show.*all.*lead/i,
    /show.*lead/i,
    /list.*all.*lead/i,
    /list.*lead/i,
    /all.*crm.*lead/i,
    /crm.*lead/i,
    /display.*lead/i,
    /get.*all.*lead/i,
    /view.*lead/i,
    /see.*all.*lead/i,
    /all lead/i,
    /lead.*list/i,
    /lead.*table/i,
    /lead.*data/i,
    /lead.*database/i,
    /full.*lead/i,
    /complete.*lead/i,
    /saare lead/i,
    /sab lead/i,
    /lead dikhao/i,
    /sabke lead/i
  ] },
  { name: 'lead_count', patterns: [/how many lead/i, /total lead/i, /count.*lead/i, /lead.*count/i, /number of lead/i, /kitne lead/i, /total kitne/i] },
  { name: 'pending_payment', patterns: [/pending payment/i, /awaiting payment/i, /payment.*pending/i, /not.*paid/i, /unpaid/i, /due payment/i, /advance.*due/i, /kiska payment/i, /paise baki/i, /advance baaki/i] },
  { name: 'top_performer', patterns: [/top perform/i, /top employee/i, /best.*employee/i, /highest.*sales/i, /most.*lead/i, /who.*sold/i, /best.*agent/i, /who.*best/i, /highest.*kpi/i, /sabse achha/i, /kaun top/i, /best seller/i] },
  { name: 'compare_period', patterns: [/this month.*last month/i, /compare.*month/i, /vs last month/i, /month.*comparison/i, /month over month/i, /month.*month/i, /sales trend/i, /revenue trend/i, /lead trend/i, /compare.*period/i, /iske pehle.*mahine/i] },
  { name: 'recent_activity', patterns: [/recent activity/i, /latest.*activity/i, /what happened/i, /activity log/i, /last.*action/i, /recent.*update/i, /kya hua/i, /recent audit/i] },
  { name: 'pipeline_summary', patterns: [/pipeline/i, /overview/i, /summary/i, /all stage/i, /breakdown/i, /distribution/i, /status.*lead/i, /lead.*status/i, /pipeline summary/i] },
  { name: 'revenue_summary', patterns: [
    /payment.*(receiv|reciev|collect|got|deposit|aaya|mila|done|verified|status|summary|total|kitna|check)/i,
    /(how much|total|kitna|all).*?(payment|money|advance|revenue|collection|deposit)/i,
    /(payment|money|revenue|advance|collection|deposit).*?(receiv|reciev|collect|total|summary|status|kitna|aaya)/i,
    /revenue/i,
    /money.*collect/i,
    /collect.*money/i,
    /saved/i,
    /earned/i,
    /sales of/i,
    /sale.*month/i,
    /income/i,
    /earning/i,
    /how much.*made/i,
    /how much.*earn/i,
    /what.*sales/i,
    /total.*sale/i,
    /sale.*august/i,
    /august.*sale/i,
    /this month.*sale/i,
    /kitna revenue/i,
    /kitni sale/i,
    /kitna kamaya/i,
    /paisa kitna/i
  ] },
  { name: 'employee_list', patterns: [/list.*employee/i, /all employee/i, /\bteam\b/i, /\bstaff\b/i, /who.*work/i, /show.*employee/i, /our.*team/i, /kaun kaun kaam/i, /saare employee/i] },
  { name: 'hot_leads', patterns: [/hot lead/i, /priority lead/i, /urgent/i, /follow.*up.*today/i, /today.*lead/i, /needs.*attention/i, /important.*lead/i, /kaunsa lead/i, /urgent lead/i] },
  { name: 'kpi_stats', patterns: [/kpi/i, /\bperformance\b/i, /\bscore\b/i, /\btarget\b/i, /conversion rate/i, /calls handled/i, /how.*doing/i, /team.*perform/i, /kpi score/i] },
  { name: 'dialer', patterns: [/dialer/i, /call queue/i, /voice agent/i, /\ba1\b/i, /calls made/i, /call log/i] },
  { name: 'whatsapp', patterns: [/whatsapp/i, /reminder/i, /message sent/i, /\ba5\b/i, /automation/i, /template/i] }
];

function detectIntent(query) {
  if (!query || typeof query !== 'string') return 'unknown';
  for (const intent of INTENTS) {
    for (const pat of intent.patterns) {
      if (pat.test(query)) return intent.name;
    }
  }
  return 'unknown';
}

function detectStage(query) {
  if (!query || typeof query !== 'string') return null;
  const lower = query.toLowerCase();
  if (lower.includes('confirmed'))  return 'Confirmed Lead';
  if (lower.includes('qualified'))  return 'Qualified';
  if (lower.includes('enquir'))     return 'Enquiry';
  if (lower.includes('production')) return 'In Production';
  if (lower.includes('dispatch'))   return 'Dispatched';
  if (lower.includes('booked'))     return 'Booked';
  if (lower.includes('paid'))       return 'Client (Paid)';
  return null;
}

module.exports = {
  INTENTS,
  detectIntent,
  detectStage
};
