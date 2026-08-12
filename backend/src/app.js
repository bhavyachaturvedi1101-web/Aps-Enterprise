const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'A2 Admin Backend'
  });
});

// A2 Admin API Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/activity', require('./routes/activity'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on our end.'
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       APS Enterprise — A2 Admin Backend              ║
╠══════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                       ║
║                                                      ║
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
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
