const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { systemConfig, companyProfile } = require('../config/inMemoryStore');

const SETTINGS_FILE = path.join(__dirname, '../../settings_data.json');

// Initialize settings from disk if available
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (saved.config) Object.assign(systemConfig, saved.config);
    if (saved.companyProfile) Object.assign(companyProfile, saved.companyProfile);
  }
} catch (e) {
  console.warn('[SystemConfig] Failed to load settings_data.json:', e.message);
}

function saveToDisk(data) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[SystemConfig] Failed to save settings to disk:', err.message);
  }
}

// GET /api/config — Get system configuration & business rules
router.get('/', (req, res) => {
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
router.post('/', (req, res) => {
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
router.post('/approval-policy', (req, res) => {
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
