/**
 * Enterprise Centralized Global Error Handler & 404 Handler
 * Guarantees consistent error envelopes, prevents sensitive stack trace leakage,
 * and provides structured logging of all application failures.
 */

const { logger } = require('../utils/logger');

/**
 * Standard Application Error with custom status and error codes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Catch-All Middleware for unmatched API endpoints
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Resource Not Found',
    code: 'RESOURCE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred.';
  let details = err.details || null;

  // 1. Handle Database Availability & Connection Errors (503 Service Unavailable)
  if (
    err.name === 'DatabaseUnavailableError' ||
    err.code === 'DATABASE_UNAVAILABLE' ||
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeConnectionRefusedError' ||
    err.name === 'SequelizeHostNotFoundError' ||
    err.name === 'SequelizeHostNotReachableError' ||
    err.name === 'SequelizeInvalidConnectionError' ||
    err.name === 'SequelizeConnectionTimedOutError' ||
    err.name === 'TimeoutError'
  ) {
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
    message = err.message || 'Database service is temporarily unavailable. Please retry shortly.';
    res.setHeader('Retry-After', '5');
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Database validation failed';
    details = err.errors ? err.errors.map(e => ({ field: e.path, message: e.message })) : null;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'A record with this identifier already exists';
    details = err.errors ? err.errors.map(e => ({ field: e.path, value: e.value })) : null;
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }

  // 2. Handle JWT Auth Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // 3. Handle Syntax / Bad JSON Body Errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'MALFORMED_JSON';
    message = 'Malformed JSON payload in request body';
  }

  // 4. Log the error with structured context
  logger.error(`[API Error] ${req.method} ${req.originalUrl || req.url}: ${message}`, {
    statusCode,
    errorCode,
    url: req.originalUrl || req.url,
    method: req.method,
    stack: statusCode >= 500 ? err.stack : undefined,
    ip: req.ip || req.headers['x-forwarded-for']
  });

  // 5. Hide internal stack trace details in production for 500 errors
  const isProduction = process.env.NODE_ENV === 'production';
  const responsePayload = {
    error: statusCode >= 500 && isProduction ? 'Internal Server Error' : message,
    code: errorCode,
    timestamp: new Date().toISOString()
  };

  if (details) {
    responsePayload.details = details;
  }

  if (!isProduction && statusCode >= 500 && err.stack) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
