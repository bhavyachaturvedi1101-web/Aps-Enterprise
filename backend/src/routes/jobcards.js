const express = require('express');
const router = express.Router();
const { JobCard, Booking, Lead } = require('../models');
const whatsappService = require('../services/whatsappService');

const MILESTONE_NAMES = ['Material Procured', 'CNC Assembly', 'Quality Testing', 'Dispatch Ready'];

function nextJobNumber(count) {
  return `JC-${String(count + 992).padStart(4, '0')}`;
}

// ─── Mock job cards (fallback) ────────────────────────────────────────────────
const MOCK_JOB_CARDS = [
  {
    id: 'jc-001', leadId: 'LEAD-007', bookingId: null, jobNumber: 'JC-0992',
    product: 'Slipper Making Machine', clientName: 'Sahil Joshi', status: 'In Progress',
    currentMilestoneIndex: 2, priority: 'High',
    estimatedCompletionDate: '2026-09-15', assignedTeam: 'Assembly Floor A',
    milestones: [
      { name: 'Material Procured', completedAt: '2026-08-20T10:00:00Z', completedBy: 'Store Manager', notes: 'Steel sheets + motors sourced' },
      { name: 'CNC Assembly', completedAt: '2026-08-28T15:30:00Z', completedBy: 'Assembly Lead', notes: 'Frame welded and mounted' },
      { name: 'Quality Testing', completedAt: null, completedBy: null, notes: '' },
      { name: 'Dispatch Ready', completedAt: null, completedBy: null, notes: '' }
    ]
  },
  {
    id: 'jc-002', leadId: 'LEAD-010', bookingId: null, jobNumber: 'JC-0993',
    product: 'Paper Bag Making Machine', clientName: 'Dhruv Tripathi', status: 'In Progress',
    currentMilestoneIndex: 1, priority: 'Normal',
    estimatedCompletionDate: '2026-09-20', assignedTeam: 'Assembly Floor B',
    milestones: [
      { name: 'Material Procured', completedAt: '2026-08-22T09:00:00Z', completedBy: 'Store Manager', notes: 'All parts procured' },
      { name: 'CNC Assembly', completedAt: null, completedBy: null, notes: '' },
      { name: 'Quality Testing', completedAt: null, completedBy: null, notes: '' },
      { name: 'Dispatch Ready', completedAt: null, completedBy: null, notes: '' }
    ]
  },
  {
    id: 'jc-003', leadId: 'LEAD-011', bookingId: null, jobNumber: 'JC-0994',
    product: '4-Die Dona Pattal Machine', clientName: 'Kunal Bose', status: 'Dispatch Ready',
    currentMilestoneIndex: 4, priority: 'Urgent',
    estimatedCompletionDate: '2026-08-30', assignedTeam: 'Assembly Floor A',
    milestones: [
      { name: 'Material Procured', completedAt: '2026-08-10T10:00:00Z', completedBy: 'Store Manager', notes: '' },
      { name: 'CNC Assembly', completedAt: '2026-08-18T12:00:00Z', completedBy: 'Assembly Lead', notes: '' },
      { name: 'Quality Testing', completedAt: '2026-08-25T16:00:00Z', completedBy: 'QC Team', notes: 'All specs passed' },
      { name: 'Dispatch Ready', completedAt: '2026-08-27T11:00:00Z', completedBy: 'Dispatch Lead', notes: 'Packed & labelled' }
    ]
  }
];

// GET /api/jobcards — all job cards
router.get('/', async (req, res) => {
  try {
    let cards = [];
    try { cards = (await JobCard.findAll({ order: [['createdAt', 'DESC']] })).map(c => c.toJSON()); }
    catch {}
    if (cards.length === 0) cards = MOCK_JOB_CARDS;
    res.json({ jobCards: cards, count: cards.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job cards' });
  }
});

// GET /api/jobcards/:id — single job card
router.get('/:id', async (req, res) => {
  try {
    let card = null;
    try { card = await JobCard.findByPk(req.params.id); } catch {}
    if (!card) card = MOCK_JOB_CARDS.find(c => c.id === req.params.id || c.jobNumber === req.params.id);
    if (!card) return res.status(404).json({ error: 'Job card not found' });
    res.json({ jobCard: card });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job card' });
  }
});

// POST /api/jobcards — create job card for a booking/lead
router.post('/', async (req, res) => {
  try {
    const { leadId, bookingId, product, clientName, priority, estimatedCompletionDate, assignedTeam } = req.body;
    if (!leadId || !product || !clientName) {
      return res.status(400).json({ error: 'leadId, product and clientName are required' });
    }

    let count = 0;
    try { count = await JobCard.count(); } catch {}
    const id = `jc-${Date.now()}`;
    const jobNumber = nextJobNumber(count);

    const defaultMilestones = MILESTONE_NAMES.map(name => ({ name, completedAt: null, completedBy: null, notes: '' }));

    let card = null;
    try {
      card = await JobCard.create({
        id, leadId, bookingId: bookingId || null, jobNumber, product, clientName,
        milestones: defaultMilestones, currentMilestoneIndex: 0,
        status: 'Open', priority: priority || 'Normal',
        estimatedCompletionDate: estimatedCompletionDate || null,
        assignedTeam: assignedTeam || 'Assembly Floor A'
      });
    } catch {
      card = { id, leadId, bookingId, jobNumber, product, clientName, milestones: defaultMilestones, currentMilestoneIndex: 0, status: 'Open', priority: priority || 'Normal', estimatedCompletionDate, assignedTeam: assignedTeam || 'Assembly Floor A' };
    }

    res.status(201).json({ success: true, jobCard: card });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job card' });
  }
});

// PATCH /api/jobcards/:id/milestone — complete current milestone
router.patch('/:id/milestone', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedBy, notes } = req.body;

    let card = null;
    try { card = await JobCard.findByPk(id); } catch {}
    const mockCard = !card ? MOCK_JOB_CARDS.find(c => c.id === id) : null;
    const cardData = card ? card.toJSON() : mockCard;
    if (!cardData) return res.status(404).json({ error: 'Job card not found' });

    const milestones = [...(cardData.milestones || [])];
    const currentIdx = cardData.currentMilestoneIndex || 0;
    if (currentIdx >= milestones.length) {
      return res.status(400).json({ error: 'All milestones already completed' });
    }

    milestones[currentIdx] = {
      ...milestones[currentIdx],
      completedAt: new Date().toISOString(),
      completedBy: completedBy || req.user?.name || 'Team Lead',
      notes: notes || ''
    };

    const nextIdx = currentIdx + 1;
    const allDone = nextIdx >= milestones.length;
    const newStatus = allDone ? 'Dispatch Ready' : (currentIdx === 0 ? 'In Progress' : 'In Progress');

    if (card) {
      card.milestones = milestones;
      card.currentMilestoneIndex = nextIdx;
      card.status = newStatus;
      try { await card.save(); } catch {}
    } else if (mockCard) {
      mockCard.milestones = milestones;
      mockCard.currentMilestoneIndex = nextIdx;
      mockCard.status = newStatus;
    }

    // Auto WhatsApp notification to client on milestone completion
    const milestoneName = milestones[currentIdx].name;
    try {
      let lead = null;
      try { lead = await Lead.findByPk(cardData.leadId); } catch {}
      if (!lead) {
        const { mockLeads } = require('../config/inMemoryStore');
        lead = (mockLeads || []).find(l => l.id === cardData.leadId);
      }
      if (lead) {
        await whatsappService.sendTextMessage?.(
          lead.phone || '+919988001122',
          `Dear ${cardData.clientName},\n\nMilestone Update for your *${cardData.product}* (Job: ${cardData.jobNumber}):\n\n✅ *${milestoneName}* — Completed\n\n${allDone ? '🚚 Your machine is now DISPATCH READY!' : `Next: ${milestones[nextIdx]?.name || 'Final dispatch'}`}\n\n— APS Enterprises`
        ).catch(() => {});
      }
    } catch {}

    res.json({
      success: true,
      milestoneName,
      milestones,
      currentMilestoneIndex: nextIdx,
      status: newStatus,
      allMilestonesComplete: allDone
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

module.exports = router;
