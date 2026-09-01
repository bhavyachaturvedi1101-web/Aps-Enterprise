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

// POST /api/whatsapp/send-reminder — Trigger payment reminder sequence for one or all leads
router.post('/send-reminder', async (req, res) => {
  const { leadId, leadIds, all } = req.body;
  try {
    if (all || leadId === 'all' || (Array.isArray(leadIds) && leadIds.length > 0)) {
      const result = await whatsappService.sendAllPaymentReminders(leadIds);
      return res.json(result);
    }
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });
    const result = await whatsappService.sendPaymentReminder(leadId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
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

// ─── Meta Cloud API Webhook ───────────────────────────────────────────────────
// GET /api/whatsapp/webhook — Meta webhook verification challenge
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const result = whatsappService.verifyWebhook(mode, token, challenge);
  if (result !== null) {
    res.status(200).send(result);
  } else {
    console.warn('[WhatsApp Webhook] Verification failed — wrong token');
    res.sendStatus(403);
  }
});

// POST /api/whatsapp/webhook — Receive incoming messages & delivery status updates
router.post('/webhook', async (req, res) => {
  // Must respond 200 immediately to Meta (within 5 sec)
  res.sendStatus(200);
  await whatsappService.processWebhookEvent(req.body);
});

module.exports = router;
