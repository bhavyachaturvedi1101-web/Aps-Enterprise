const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { systemConfig, companyProfile } = require('../config/inMemoryStore');
const { authorize } = require('../middleware/rbacMiddleware');

const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');

const SETTINGS_FILE = path.join(__dirname, '../../settings_data.json');

// Initialize settings from disk if available
const saved = safeReadJson(SETTINGS_FILE, null);
if (saved) {
  if (saved.config) Object.assign(systemConfig, saved.config);
  if (saved.companyProfile) Object.assign(companyProfile, saved.companyProfile);
}

function saveToDisk(data) {
  safeWriteJson(SETTINGS_FILE, data);
}

// GET /api/config — Get system configuration & business rules (Admin & Manager only)
router.get('/', authorize(['admin', 'manager']), (req, res) => {
  let diskData = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      diskData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  res.json({
    config: systemConfig,
    companyProfile,
    allSettings: diskData.allSettings || null
  });
});

// POST /api/config — Save all system settings & company profile
router.post('/', authorize(['admin']), (req, res) => {
  try {
    const { config, companyProfile: newProfile, allSettings } = req.body;
    if (config && typeof config === 'object') {
      Object.assign(systemConfig, config);
    }
    if (newProfile && typeof newProfile === 'object') {
      Object.assign(companyProfile, newProfile);
    }
    
    // Save to disk
    saveToDisk({
      config: systemConfig,
      companyProfile,
      allSettings: allSettings || req.body.allSettings || req.body
    });

    console.log('[SystemConfig] Full system configuration saved to disk.');
    res.json({
      success: true,
      message: 'System settings saved successfully to disk.',
      config: systemConfig,
      companyProfile,
      allSettings: allSettings || req.body
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save configuration', message: err.message });
  }
});

// POST /api/config/approval-policy — Update single-action vs countersign policy
router.post('/approval-policy', authorize(['admin']), (req, res) => {
  const { policy } = req.body;
  if (!['single-action', 'countersign'].includes(policy)) {
    return res.status(400).json({
      error: 'Invalid policy option. Allowed values: "single-action", "countersign".'
    });
  }

  systemConfig.approvalPolicy = policy;
  console.log(`[SystemConfig] Business approval policy updated to: "${policy}".`);
  res.json({
    success: true,
    message: `System approval policy updated to "${policy}".`,
    config: systemConfig
  });
});

module.exports = router;
