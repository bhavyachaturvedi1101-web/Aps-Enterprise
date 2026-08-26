const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventorySummary,
  createOrUpdateInventory,
  adjustStock
} = require('../controllers/inventoryController');

// @route   GET /api/inventory/summary
// @desc    Get aggregated stock metrics & top items for dashboard
// @access  Public / Authenticated
router.get('/summary', getInventorySummary);

// @route   GET /api/inventory
// @desc    Get all inventory items with optional filters
// @access  Public / Authenticated
router.get('/', getInventory);

// @route   POST /api/inventory
// @desc    Create or update an inventory item
// @access  Public / Authenticated
router.post('/', createOrUpdateInventory);

// @route   PATCH /api/inventory/:id/adjust
// @desc    Adjust inventory stock level
// @access  Public / Authenticated
router.patch('/:id/adjust', adjustStock);

module.exports = router;
