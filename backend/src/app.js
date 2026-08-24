const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authenticate } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(authenticate);

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
app.use('/api/activity', require('./routes/activity'));

// A3 AI Chatbot — Internal NL Query Engine
app.use('/api/a3', require('./routes/a3'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/config', require('./routes/config'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));


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
    console.log(`
  ╔═════════════════════════════════════════════════════════════════╗
  ║          APS Enterprise — A2 Admin Backend System               ║
  ║               Week 1 Parallel Development Complete             ║
  ╠═════════════════════════════════════════════════════════════════╣
  ║  Integration Layer (Mock Mode):                      ║
║   ✓ CRM   — Lead sync                               ║
║   ✓ ERP   — Booking & Factory release               ║
║   ✓ Dialer — Call queue status                      ║
║   ✓ Tally  — Payment verification (Hard Gate)       ║
║                                                      ║
║  API Routes:                                         ║
║   GET    /api/health                                ║
║   GET    /api/leads                                 ║
║   GET    /api/leads/:id                             ║
║   POST   /api/leads/:id/transition                  ║
║   GET    /api/employees                             ║
║   GET    /api/activity                              ║
║   POST   /api/a3/query     (A3 AI Chatbot)          ║
║   GET    /api/a3/suggestions                        ║
  ║   [A4 Performance]   GET  /api/employees/:id/performance        ║
  ║   [A4 Time-in-stage] GET  /api/activity/time-in-stage           ║
  ║   [A5 WhatsApp]      POST /api/whatsapp/send-reminder           ║
  ╚═════════════════════════════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
