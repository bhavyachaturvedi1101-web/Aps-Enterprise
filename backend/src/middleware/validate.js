/**
 * Request Validation Middleware using Zod
 * Enforces strict API contracts across inbound requests
 */
const { z } = require('zod');

/**
 * Higher-order middleware function to validate req.body against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0];
      const fieldPath = firstIssue.path.join('.');
      let errorMessage = firstIssue.message;
      if (!errorMessage || errorMessage.startsWith('Invalid input') || errorMessage.startsWith('Required')) {
        if (fieldPath === 'toStage') {
          errorMessage = 'toStage is required in the request body.';
        } else if (fieldPath === 'name') {
          errorMessage = req.baseUrl?.includes('employees') || req.originalUrl?.includes('employees')
            ? 'Name and email are required.'
            : 'Lead name is required.';
        } else if (fieldPath === 'email') {
          errorMessage = 'Name and email are required. Valid email address is required.';
        } else {
          errorMessage = `${fieldPath} is required`;
        }
      }
      return res.status(400).json({
        error: errorMessage,
        code: 'VALIDATION_ERROR',
        details: err.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
          rule: i.code
        }))
      });
    }
    return res.status(400).json({ error: 'Invalid request data', code: 'BAD_REQUEST' });
  }
};

/**
 * Middleware function to validate req.query against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.validatedQuery = schema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0];
      return res.status(400).json({
        error: firstIssue.message,
        code: 'QUERY_VALIDATION_ERROR',
        details: err.issues
      });
    }
    return res.status(400).json({ error: 'Invalid query parameters', code: 'BAD_REQUEST' });
  }
};

// ─── Predefined Schemas ────────────────────────────────────────────────────────

const createLeadSchema = z.object({
  name: z.string({
    required_error: 'Lead name is required',
    invalid_type_error: 'Lead name must be a string'
  }).min(1, 'Lead name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  company: z.string().optional(),
  interest: z.string().optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  stage: z.enum(['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched']).optional(),
  priority: z.enum(['Hot', 'Warm', 'Cold']).optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

const transitionLeadSchema = z.object({
  toStage: z.string({
    required_error: 'toStage is required in the request body.',
    invalid_type_error: 'toStage must be a string.'
  }).min(1, 'toStage is required in the request body.'),
  employeeId: z.string().optional(),
  countersignedBy: z.string().optional().nullable(),
  simulateError: z.boolean().optional()
});

const createEmployeeSchema = z.object({
  name: z.string({
    required_error: 'Name is required.',
    invalid_type_error: 'Name must be a string.'
  }).min(1, 'Name is required.'),
  email: z.string({
    required_error: 'Email is required.',
    invalid_type_error: 'Email must be a string.'
  }).email('Valid email address is required.'),
  phone: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  initialTask: z.string().optional()
});

const createInvoiceSchema = z.object({
  clientName: z.string().optional(),
  product: z.string().optional(),
  baseAmount: z.union([z.number(), z.string()]).optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  leadId: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  gstNo: z.string().optional(),
  poNo: z.string().optional(),
  hsnCode: z.string().optional(),
  paymentTerms: z.string().optional(),
  items: z.array(z.any()).optional(),
  notes: z.string().optional()
});

module.exports = {
  validateBody,
  validateQuery,
  createLeadSchema,
  transitionLeadSchema,
  createEmployeeSchema,
  createInvoiceSchema
};
