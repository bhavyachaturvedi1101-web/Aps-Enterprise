const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// GET /api/whatsapp/messages — Audit log of sent automated WhatsApp messages
router.get('/messages', async (req, res) => {
  const messages = await whatsappService.getMessages();
  res.json({ messages, count: messages.length });
});

// GET /api/whatsapp/sequences — Active WhatsApp messaging sequences
router.get('/sequences', async (req, res) => {
  const sequences = await whatsappService.getSequences();
  res.json({ sequences });
});

// GET /api/whatsapp/templates — Approved Meta WhatsApp message templates
router.get('/templates', async (req, res) => {
  const templates = await whatsappService.getTemplates();
  res.json({ templates });
});

// GET /api/whatsapp/analytics — WhatsApp deliverability & engagement metrics
router.get('/analytics', async (req, res) => {
  const analytics = await whatsappService.getAnalytics();
  res.json({ analytics });
});

// POST /api/whatsapp/sequences/:id/toggle — Toggle sequence active/paused
router.post('/sequences/:id/toggle', async (req, res) => {
  try {
    const result = await whatsappService.toggleSequence(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/whatsapp/sequences/:id/update — Update sequence delay / params
router.post('/sequences/:id/update', async (req, res) => {
  try {
    const result = await whatsappService.updateSequence(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/whatsapp/send-reminder — Trigger payment reminder sequence for a lead
router.post('/send-reminder', async (req, res) => {
  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId is required' });

  try {
    const result = await whatsappService.sendPaymentReminder(leadId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/whatsapp/send-custom — Send arbitrary template message
router.post('/send-custom', async (req, res) => {
  try {
    const result = await whatsappService.sendCustomMessage(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

