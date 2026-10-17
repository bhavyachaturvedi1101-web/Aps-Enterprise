/**
 * Enterprise Structured Logger using Winston
 * Provides unified logging with timestamps, log levels, structured JSON outputs,
 * and environment-aware transport management.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.LAMBDA_TASK_ROOT
);

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

// Custom format for local development console
const devConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Structured JSON format for production / cloud log aggregators
const prodJsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [];

// 1. Console Transport
transports.push(
  new winston.transports.Console({
    format: isProd ? prodJsonFormat : devConsoleFormat,
    silent: isTest
  })
);

// 2. File Transports (Only on traditional servers, disabled on read-only serverless / test)
if (!isServerless && !isTest) {
  try {
    const logDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: prodJsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: prodJsonFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );
  } catch (err) {
    // If filesystem logging is not permitted, console remains active
  }
}

const logger = winston.createLogger({
  level: isTest ? 'error' : (process.env.LOG_LEVEL || (isProd ? 'info' : 'debug')),
  levels: winston.config.npm.levels,
  defaultMeta: { service: 'aps-enterprise-core' },
  transports,
  exitOnError: false
});

/**
 * Express HTTP Request Logging Middleware
 * Tracks HTTP method, route, status code, response time, and remote IP
 */
const httpLoggerMiddleware = (req, res, next) => {
  if (isTest) return next();

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

    logger[logLevel](`${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`, {
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      durationMs: parseFloat(durationMs),
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  });

  next();
};

module.exports = {
  logger,
  httpLoggerMiddleware
};
