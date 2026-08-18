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

// A2 Admin API Routes (Week 1 Contract)
app.use('/api/leads', require('./routes/leads'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/config', require('./routes/config'));
app.use('/api/chat', require('./routes/chat'));


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
  ║  Server running on port ${PORT}                                  ║
  ║                                                                 ║
  ║  Module Endpoints (Week 1 API Contract):                        ║
  ║   [A1 Voice Agent]   POST /api/calls/outcome                   ║
  ║   [A1 Dialer]        GET  /api/dialer/queue                     ║
  ║   [A2 State Machine] POST /api/leads/:id/transition             ║
  ║   [A2 System Config] GET  /api/config                           ║
  ║   [A4 Performance]   GET  /api/employees/:id/performance        ║
  ║   [A4 Time-in-stage] GET  /api/activity/time-in-stage           ║
  ║   [A5 WhatsApp]      POST /api/whatsapp/send-reminder           ║
  ╚═════════════════════════════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
