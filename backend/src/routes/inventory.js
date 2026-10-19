const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/rbacMiddleware');
const {
  getInventory,
  getInventorySummary,
  createOrUpdateInventory,
  bulkUploadInventory,
  deleteInventory,
  adjustStock
} = require('../controllers/inventoryController');

// @route   GET /api/inventory/summary
// @desc    Get aggregated stock metrics & top items for dashboard
router.get('/summary', authorize(['admin', 'manager', 'accountant', 'employee']), getInventorySummary);

// @route   GET /api/inventory
// @desc    Get all inventory items with optional filters
router.get('/', authorize(['admin', 'manager', 'accountant', 'employee']), getInventory);

// @route   POST /api/inventory
// @desc    Create or update a single inventory item (Admin / Manager)
router.post('/', authorize(['admin', 'manager']), createOrUpdateInventory);

// @route   POST /api/inventory/bulk
// @desc    Bulk upload inventory items from Excel / CSV (Admin / Manager)
router.post('/bulk', authorize(['admin', 'manager']), bulkUploadInventory);

// @route   DELETE /api/inventory/:id
// @desc    Delete an inventory item (Admin / Manager)
router.delete('/:id', authorize(['admin', 'manager']), deleteInventory);

// @route   PATCH /api/inventory/:id/adjust
// @desc    Adjust inventory stock level (Admin / Manager)
router.patch('/:id/adjust', authorize(['admin', 'manager']), adjustStock);

module.exports = router;
