const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { authenticate } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── DB Init ───
let _dbConnected = false;
let _dbAttempted = false;

const initDB = async () => {
  if (_dbAttempted) return _dbConnected;
  _dbAttempted = true;
  try {
    if (!process.env.DATABASE_URL) {
      console.log('[DB] No DATABASE_URL provided. Running in in-memory store mode.');
      return false;
    }
    await connectDB();
    _dbConnected = true;
    return true;
  } catch (err) {
    console.warn(`[Warning] Database unavailable (${err.message}). Proceeding with in-memory store.`);
    _dbConnected = false;
    return false;
  }
};

// Core Middleware
app.use(cors());
app.use(express.json());
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

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'A2 Admin Backend System',
    milestone: 'Week 1 Deliverables Complete',
    modules: ['A1 Voice Agent', 'A2 Admin Cockpit', 'A3 Chatbot API', 'A4 Performance Profiles', 'A5 WhatsApp Automation']
  });
});

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



// Safe Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Stack]', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on our end.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`APS Enterprise backend running on port ${PORT}`);
  });
  initDB().catch(err => {
    console.warn('DB connection failed on startup, using in-memory store:', err.message);
  });
}

module.exports = app;
