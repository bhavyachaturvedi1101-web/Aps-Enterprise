const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// GET /api/whatsapp/messages — Audit log of sent automated WhatsApp messages
router.get('/messages', async (req, res) => {
  const messages = await whatsappService.getMessages();
  res.json({ messages });
});

// GET /api/whatsapp/sequences — Active WhatsApp messaging sequences
router.get('/sequences', async (req, res) => {
  const sequences = await whatsappService.getSequences();
  res.json({ sequences });
});

// POST /api/whatsapp/send-reminder — Trigger payment reminder sequence
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

module.exports = router;
