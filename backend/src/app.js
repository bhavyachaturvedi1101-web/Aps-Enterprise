const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, isDbConnected } = require('./config/db');
const { authenticate } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── DB Init ───
let _dbAttempted = false;

const initDB = async () => {
  if (_dbAttempted) return isDbConnected();
  _dbAttempted = true;
  try {
    if (!process.env.DATABASE_URL) {
      console.log('[DB] No DATABASE_URL provided. Running in in-memory store mode.');
      return false;
    }
    await connectDB();
    return true;
  } catch (err) {
    console.warn(`[Warning] Database unavailable (${err.message}). Proceeding with in-memory store.`);
    return false;
  }
};

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Core Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());

const { logger, httpLoggerMiddleware } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Request Correlation ID Middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Structured HTTP Request Logging
app.use(httpLoggerMiddleware);

// Rate Limiting (generous in test environment, strictly enforced in dev/production)
const isTestEnv = process.env.NODE_ENV === 'test';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 5000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// Auth verification & session parsing
app.use(authenticate);

// Initialize DB on cold start without blocking requests on failure
app.use(async (req, res, next) => {
  if (!_dbAttempted) {
    await initDB();
  }
  next();
});

// Disable caching for API responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Production Deep Health Diagnostics Endpoint
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      heapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100
    },
    database: {
      status: isDbConnected() ? 'connected' : 'in-memory-fallback',
      connected: isDbConnected()
    },
    timestamp: new Date().toISOString(),
    service: 'APS Enterprise Core Backend',
    environment: process.env.NODE_ENV || 'development',
    modules: [
      'A1 Teleforce CRM & Inbound Agent',
      'A2 Enterprise Operations & ERP Gateway',
      'A3 Deep Intelligence NL Query Engine',
      'A4 Teleforce Smart Dialer & Agent Workspace',
      'A5 Meta / DoubleTick WhatsApp Business Cloud'
    ]
  });
});

// Liveness Probe (Kubernetes / Cloud Container orchestrators)
app.get('/api/health/live', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Readiness Probe
app.get('/api/health/ready', (req, res) => {
  res.status(200).json({
    status: 'READY',
    database: isDbConnected() ? 'connected' : 'in-memory-fallback',
    timestamp: new Date().toISOString()
  });
});

// Prometheus Standard Metrics Endpoint
app.get('/api/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const queueManager = require('./services/queueService');
  const qMetrics = queueManager.getAllMetrics();

  const metrics = [
    '# HELP process_uptime_seconds The process uptime in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${Math.floor(uptime)}`,
    '# HELP nodejs_heap_size_used_bytes Process heap size used in bytes.',
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes ${mem.heapUsed}`,
    '# HELP nodejs_heap_size_total_bytes Process heap size total in bytes.',
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes ${mem.heapTotal}`,
    '# HELP process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${mem.rss}`,
    '# HELP aps_database_connected 1 if PostgreSQL connected, 0 for in-memory fallback.',
    '# TYPE aps_database_connected gauge',
    `aps_database_connected ${isDbConnected() ? 1 : 0}`
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return res.send(metrics);
});

// Auth Routes
app.use('/api/auth', require('./routes/auth'));

// A2 Admin API Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/invoices', require('./routes/invoices'));

// A3 AI Chatbot — Internal NL Query Engine
app.use('/api/a3', require('./routes/a3'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/config', require('./routes/config'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

// Analytics & Reports
app.use('/api/analytics', require('./routes/analytics'));

// ERP — Job Cards & Production Milestones
app.use('/api/jobcards', require('./routes/jobcards'));

// Tally ERP Bridge
app.use('/api/tally', require('./routes/tally'));

// Google Tasks Integration
app.use('/api/google-tasks', require('./routes/googleTasks'));

// Catch unmatched API routes with 404
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`APS Enterprise core backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  initDB().catch(err => {
    logger.warn(`DB connection failed on startup, using in-memory store: ${err.message}`);
  });

  // Graceful Shutdown & Process Crash Protection
  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed. Releasing active database connections...');
      try {
        const { sequelize } = require('./config/db');
        await sequelize.close();
        logger.info('Database connection pool cleanly closed.');
      } catch (err) {
        logger.warn(`Error during DB pool closure: ${err.message}`);
      }
      logger.info('Process terminated gracefully.');
      process.exit(0);
    });

    // Force terminate if graceful shutdown hangs past 10s
    setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded (10s). Forcing termination.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED PROMISE REJECTION at:', { promise, reason });
  });
}

module.exports = app;
