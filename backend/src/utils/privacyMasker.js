'use strict';
/**
 * ============================================================
 * APS ENTERPRISE — PRIVACY & PII REDACTION ENGINE
 * Complies with Digital Personal Data Protection (DPDP) standards.
 * Masks customer phone numbers, personal emails, identities in logs,
 * and sanitizes data payloads before transmission to 3rd-party LLMs.
 * ============================================================
 */

/**
 * Masks a phone number for logs and external telemetry
 * e.g., "+91 98260 12345" -> "+91 98*** **345"
 *       "9826012345"      -> "98*****345"
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '[PHONE_REDACTED]';
  const clean = phone.trim();
  const digitsOnly = clean.replace(/\D/g, '');

  if (digitsOnly.length < 7) return '[PHONE_REDACTED]';

  // Format with country code preserved if present
  const hasPlus = clean.startsWith('+');
  if (digitsOnly.length === 10) {
    return `${hasPlus ? '+91 ' : ''}${digitsOnly.slice(0, 2)}*****${digitsOnly.slice(-3)}`;
  } else if (digitsOnly.length > 10) {
    const cc = digitsOnly.slice(0, digitsOnly.length - 10);
    const national = digitsOnly.slice(-10);
    return `+${cc} ${national.slice(0, 2)}*****${national.slice(-3)}`;
  }
  return `${digitsOnly.slice(0, 2)}***${digitsOnly.slice(-2)}`;
}

/**
 * Masks an email address
 * e.g., "rajesh.sharma@sharmadona.com" -> "r***a@sharmadona.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[EMAIL_REDACTED]';
  const clean = email.trim();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 1) return '[EMAIL_REDACTED]';

  const user = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex);

  if (user.length <= 2) {
    return `${user.charAt(0)}*${domain}`;
  }
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}${domain}`;
}

/**
 * Masks an individual's name for privacy in external contexts
 * e.g., "Rajesh Sharma" -> "Rajesh S."
 */
function maskName(name) {
  if (!name || typeof name !== 'string') return 'Client';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${parts[0]} ${lastInitial}.`;
}

/**
 * Scans arbitrary text / messages / transcripts and redacts phone numbers & emails
 */
function maskText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Redact emails
  let result = text.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, u, d) => `${u.charAt(0)}***@${d}`
  );

  // Redact 10-12 digit phone numbers (with optional spaces or dashes between digit blocks)
  result = result.replace(
    /(?:(?:\+|0{0,2})91[\s-]?)?[6789](?:[\s-]?\d){9}/g,
    (match) => maskPhone(match)
  );

  return result;
}

/**
 * Sanitizes a lead object specifically for 3rd-party LLMs (Groq, OpenAI, Gemini)
 * Strips phone, email, and raw personal identifiers while preserving business domain data.
 */
function sanitizeLeadForLLM(lead) {
  if (!lead) return null;
  const l = typeof lead.toJSON === 'function' ? lead.toJSON() : lead;

  return {
    id: l.id,
    maskedName: maskName(l.name),
    company: l.company || `${maskName(l.name)} Enterprise`,
    stage: l.stage || 'Enquiry',
    budget: Number(l.budget || l.dealValue || l.value || 0),
    interest: l.interest || l.product || 'Industrial Machinery',
    assignedTo: l.assignedTo || l.assignedEmployeeId || 'Unassigned',
    city: l.city || l.location || 'Indore Region',
    source: l.source || 'Direct',
    tallyPaymentVerified: Boolean(l.tallyPaymentVerified),
    erpBookingCreated: Boolean(l.erpBookingCreated)
    // Contact phone numbers and personal emails are intentionally OMITTED for privacy
  };
}

/**
 * Sanitizes an employee profile for 3rd-party LLMs
 * Strips direct mobile numbers and personal email addresses.
 */
function sanitizeEmployeeForLLM(emp) {
  if (!emp) return null;
  const e = typeof emp.toJSON === 'function' ? emp.toJSON() : emp;

  return {
    id: e.id,
    name: e.name,
    role: e.role,
    department: e.department,
    kpiScore: e.kpiScore || '90%',
    salesClosed: e.salesClosed || 0,
    totalRevenue: e.totalRevenue || 0,
    callsHandled: e.callsHandled || 0,
    activeTask: e.activeTask ? {
      title: maskText(e.activeTask.title),
      priority: e.activeTask.priority,
      dueIn: e.activeTask.dueIn
    } : null,
    taskQueueCount: Array.isArray(e.taskQueue) ? e.taskQueue.length : 0
    // Phone numbers and personal emails are intentionally OMITTED for privacy
  };
}

/**
 * Sanitizes call/activity log entries before feeding into external LLM prompts
 */
function sanitizeLogForLLM(log) {
  if (!log) return null;
  const l = typeof log.toJSON === 'function' ? log.toJSON() : log;

  return {
    id: l.id || l.callId,
    action: maskText(l.action || l.callOutcome || 'Log Entry'),
    transcript: maskText(l.transcript || l.notes || ''),
    durationSeconds: l.durationSeconds || 0,
    timestamp: l.timestamp || l.createdAt
  };
}

module.exports = {
  maskPhone,
  maskEmail,
  maskName,
  maskText,
  sanitizeLeadForLLM,
  sanitizeEmployeeForLLM,
  sanitizeLogForLLM
};
