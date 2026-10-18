'use strict';
/**
 * ============================================================
 * APS ENTERPRISE — STRICT PRODUCTION DATABASE POLICY ENGINE
 * Enforces PostgreSQL ACID durability in production environments.
 * Prevents silent degradation to ephemeral in-memory/JSON stores.
 * ============================================================
 */

const { isDbConnected } = require('../config/db');

/**
 * Custom operational error thrown when database is offline or query fails in production
 */
class DatabaseUnavailableError extends Error {
  constructor(message = 'Database service unavailable. Active PostgreSQL connection required.', details = null) {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.statusCode = 503;
    this.code = 'DATABASE_UNAVAILABLE';
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Checks whether active runtime mode strictly mandates real PostgreSQL persistence
 */
function isStrictDbMode() {
  return process.env.NODE_ENV === 'production' || process.env.STRICT_DB_MODE === 'true';
}

/**
 * Safe database execution wrapper.
 * - In Strict/Production mode:
 *     Requires isDbConnected() === true.
 *     If DB is offline or dbOperation() rejects, throws DatabaseUnavailableError (HTTP 503).
 *     NEVER executes fallbackFn() in production.
 * - In Non-strict/Dev/Test mode:
 *     Executes dbOperation() if DB is available, otherwise invokes fallbackFn().
 */
async function withDb(dbOperation, fallbackFn) {
  const strict = isStrictDbMode();

  if (isDbConnected()) {
    try {
      return await dbOperation();
    } catch (err) {
      if (strict) {
        console.error(`[Production DB Error] Transaction failed: ${err.message}`);
        throw new DatabaseUnavailableError(`Database transaction failed: ${err.message}`, {
          originalError: err.message
        });
      }
      console.warn(`[Dev DB Warning] ${err.message}. Invoking local fallback.`);
      if (typeof fallbackFn === 'function') {
        return await fallbackFn();
      }
      throw err;
    }
  }

  if (strict) {
    throw new DatabaseUnavailableError(
      'Active database connection is required for production operations. In-memory fallback is disabled.'
    );
  }

  if (typeof fallbackFn === 'function') {
    return await fallbackFn();
  }

  throw new DatabaseUnavailableError('Database is offline and no fallback was specified.');
}

module.exports = {
  DatabaseUnavailableError,
  isStrictDbMode,
  withDb
};
