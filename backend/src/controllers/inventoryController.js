const fs = require('fs');
const path = require('path');
const inMemoryStore = require('../config/inMemoryStore');
const { isDbConnected } = require('../config/db');

const INVENTORY_FILE = path.join(__dirname, '../../inventory_data.json');

// Helper to load inventory from persistent JSON file
function loadInventory() {
  try {
    if (fs.existsSync(INVENTORY_FILE)) {
      const raw = fs.readFileSync(INVENTORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryStore.mockInventory = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading inventory_data.json:', e);
  }
  return inMemoryStore.mockInventory || [];
}

// Helper to save inventory to persistent JSON file
function saveInventory(items) {
  inMemoryStore.mockInventory = items;
  try {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing inventory_data.json:', e);
  }
}

// Summary calculation helper
function calculateSummary(inventory) {
  const totalStock = inventory.reduce((sum, item) => sum + (Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0), 0);
  const totalBooked = inventory.reduce((sum, item) => sum + (Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0), 0);
  const totalAvailable = inventory.reduce((sum, item) => {
    const t = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
    const b = Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0;
    const a = item.availableStock !== undefined ? Number(item.availableStock) : Math.max(0, t - b);
    return sum + a;
  }, 0);

  const lowStockItems = inventory.filter(item => {
    const t = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
    const b = Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0;
    const a = item.availableStock !== undefined ? Number(item.availableStock) : Math.max(0, t - b);
    const thresh = Number(item.minStockThreshold) || Number(item.minThreshold) || Number(item.reorderLevel) || 3;
    return a > 0 && a <= thresh;
  });

  const outOfStockItems = inventory.filter(item => {
    const t = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
    const b = Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0;
    const a = item.availableStock !== undefined ? Number(item.availableStock) : Math.max(0, t - b);
    return a === 0;
  });

  const totalInventoryValue = inventory.reduce((sum, item) => {
    const t = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
    const p = Number(item.unitPrice) || 0;
    return sum + (t * p);
  }, 0);

  return {
    totalStock,
    totalBooked,
    totalAvailable,
    totalInventoryValue,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    inStockCount: Math.max(0, inventory.length - lowStockItems.length - outOfStockItems.length),
    totalSKUs: inventory.length
  };
}

// GET /api/inventory
const getInventory = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let inventory = loadInventory();

    if (category && category !== 'All') {
      inventory = inventory.filter(item => item.category === category);
    }
    if (status && status !== 'All') {
      inventory = inventory.filter(item => item.status?.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      inventory = inventory.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }

    const formatted = inventory.map(item => {
      const total = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
      const booked = Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0;
      const available = item.availableStock !== undefined ? Number(item.availableStock) : Math.max(0, total - booked);
      const thresh = Number(item.minStockThreshold) || Number(item.minThreshold) || Number(item.reorderLevel) || 3;
      
      let derivedStatus = 'In Stock';
      if (available === 0) derivedStatus = 'Out of Stock';
      else if (available <= thresh) derivedStatus = 'Low Stock';

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category || 'Machinery',
        totalStock: total,
        bookedStock: booked,
        availableStock: available,
        minStockThreshold: thresh,
        unitPrice: Number(item.unitPrice) || 0,
        status: item.status || derivedStatus,
        warehouse: item.warehouse || item.location || 'Indore Main Plant',
        lastRestocked: item.lastRestocked || new Date().toISOString().split('T')[0]
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      inventory: formatted
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

// GET /api/inventory/summary
const getInventorySummary = async (req, res) => {
  try {
    const raw = loadInventory();
    const inventory = raw.map(item => {
      const total = Number(item.totalStock) || Number(item.stockUnits) || Number(item.stock) || 0;
      const booked = Number(item.bookedStock) || Number(item.reservedUnits) || Number(item.reserved) || 0;
      const available = item.availableStock !== undefined ? Number(item.availableStock) : Math.max(0, total - booked);
      const thresh = Number(item.minStockThreshold) || Number(item.minThreshold) || Number(item.reorderLevel) || 3;

      let derivedStatus = 'In Stock';
      if (available === 0) derivedStatus = 'Out of Stock';
      else if (available <= thresh) derivedStatus = 'Low Stock';

      const utilizationPct = total > 0 ? Math.round((booked / total) * 100) : 0;

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category || 'Machinery',
        totalStock: total,
        bookedStock: booked,
        availableStock: available,
        minStockThreshold: thresh,
        unitPrice: Number(item.unitPrice) || 0,
        status: item.status || derivedStatus,
        warehouse: item.warehouse || item.location || 'Indore Main Plant',
        lastRestocked: item.lastRestocked || new Date().toISOString().split('T')[0],
        utilizationPct,
        availablePct: 100 - utilizationPct
      };
    });

    const summary = calculateSummary(inventory);

    return res.json({
      success: true,
      summary,
      topItems: inventory,
      recentLogs: (inMemoryStore.mockInventoryLogs || []).slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory summary' });
  }
};

// POST /api/inventory (Single Item Add / Edit)
const createOrUpdateInventory = async (req, res) => {
  try {
    const { id, sku, name, category, totalStock, bookedStock, minStockThreshold, unitPrice, location, warehouse } = req.body;

    if (!name && !sku) {
      return res.status(400).json({ success: false, message: 'SKU and Name are required' });
    }

    const currentInventory = loadInventory();
    const cleanSku = (sku || `APS-${Date.now().toString().slice(-4)}`).trim().toUpperCase();
    const cleanName = (name || 'New Machinery').trim();
    const total = Math.max(0, parseInt(totalStock !== undefined ? totalStock : 0, 10) || 0);
    const booked = Math.max(0, parseInt(bookedStock !== undefined ? bookedStock : 0, 10) || 0);
    const available = Math.max(0, total - booked);
    const thresh = Math.max(1, parseInt(minStockThreshold !== undefined ? minStockThreshold : 3, 10) || 3);
    const price = Math.max(0, parseFloat(unitPrice || 0) || 0);
    const wh = (warehouse || location || 'Indore Main Plant').trim();

    let status = 'In Stock';
    if (available === 0) status = 'Out of Stock';
    else if (available <= thresh) status = 'Low Stock';

    const existingIdx = currentInventory.findIndex(i => (id && i.id === id) || (i.sku && i.sku.toUpperCase() === cleanSku));

    const itemData = {
      id: (existingIdx >= 0 ? currentInventory[existingIdx].id : null) || id || `INV-${Date.now()}`,
      sku: cleanSku,
      name: cleanName,
      category: category || 'Machinery',
      warehouse: wh,
      totalStock: total,
      bookedStock: booked,
      availableStock: available,
      unitPrice: price,
      minStockThreshold: thresh,
      status,
      lastRestocked: new Date().toISOString().split('T')[0]
    };

    if (existingIdx >= 0) {
      currentInventory[existingIdx] = { ...currentInventory[existingIdx], ...itemData };
    } else {
      currentInventory.unshift(itemData);
    }

    saveInventory(currentInventory);
    const summary = calculateSummary(currentInventory);

    return res.json({
      success: true,
      message: existingIdx >= 0 ? 'Stock item updated successfully' : 'Stock item added successfully',
      item: itemData,
      inventory: currentInventory,
      summary
    });
  } catch (error) {
    console.error('Error creating/updating inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to save inventory' });
  }
};

// POST /api/inventory/bulk (Bulk Excel / CSV Import)
const bulkUploadInventory = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided in bulk upload. Please provide an array of inventory items.'
      });
    }

    const currentInventory = loadInventory();
    let addedCount = 0;
    let updatedCount = 0;

    items.forEach((uploadItem, idx) => {
      if (!uploadItem.name && !uploadItem.sku) return;

      const cleanSku = (uploadItem.sku || `APS-${Date.now().toString().slice(-4)}-${idx + 1}`).trim().toUpperCase();
      const cleanName = (uploadItem.name || uploadItem.itemName || 'Machinery Equipment').trim();
      const category = (uploadItem.category || 'Machinery').trim();
      const warehouse = (uploadItem.warehouse || uploadItem.location || 'Indore Main Plant').trim();
      
      const totalStock = Math.max(0, parseInt(uploadItem.totalStock || uploadItem.stock || uploadItem.quantity || uploadItem.stockUnits || 0, 10) || 0);
      const bookedStock = Math.max(0, parseInt(uploadItem.bookedStock || uploadItem.booked || uploadItem.reservedUnits || 0, 10) || 0);
      const unitPrice = Math.max(0, parseFloat(uploadItem.unitPrice || uploadItem.price || uploadItem.rate || 0) || 0);
      const minStockThreshold = Math.max(1, parseInt(uploadItem.minStockThreshold || uploadItem.threshold || uploadItem.minThreshold || uploadItem.reorderLevel || 3, 10) || 3);
      const availableStock = Math.max(0, totalStock - bookedStock);

      let status = 'In Stock';
      if (availableStock === 0) status = 'Out of Stock';
      else if (availableStock <= minStockThreshold) status = 'Low Stock';

      // Check if item already exists by SKU or Exact Name
      const existingIdx = currentInventory.findIndex(
        i => (i.sku && i.sku.toUpperCase() === cleanSku) || 
             (i.name && i.name.toLowerCase() === cleanName.toLowerCase())
      );

      if (existingIdx >= 0) {
        // Update existing item
        currentInventory[existingIdx] = {
          ...currentInventory[existingIdx],
          name: cleanName,
          category,
          warehouse,
          totalStock,
          bookedStock: currentInventory[existingIdx].bookedStock !== undefined ? currentInventory[existingIdx].bookedStock : bookedStock,
          availableStock: Math.max(0, totalStock - (currentInventory[existingIdx].bookedStock || bookedStock)),
          unitPrice: unitPrice > 0 ? unitPrice : (currentInventory[existingIdx].unitPrice || 0),
          minStockThreshold,
          status,
          lastRestocked: new Date().toISOString().split('T')[0]
        };
        updatedCount++;
      } else {
        // Create new item
        currentInventory.unshift({
          id: `INV-${Date.now()}-${idx}`,
          sku: cleanSku,
          name: cleanName,
          category,
          warehouse,
          totalStock,
          bookedStock,
          availableStock,
          unitPrice,
          minStockThreshold,
          status,
          lastRestocked: new Date().toISOString().split('T')[0]
        });
        addedCount++;
      }
    });

    saveInventory(currentInventory);
    const summary = calculateSummary(currentInventory);

    return res.json({
      success: true,
      message: `Bulk import completed: ${addedCount} added, ${updatedCount} updated.`,
      addedCount,
      updatedCount,
      totalCount: currentInventory.length,
      inventory: currentInventory,
      summary
    });
  } catch (error) {
    console.error('Error in bulkUploadInventory:', error);
    res.status(500).json({ success: false, message: 'Failed to process bulk inventory upload' });
  }
};

// DELETE /api/inventory/:id
const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    let currentInventory = loadInventory();
    const initialLen = currentInventory.length;
    currentInventory = currentInventory.filter(i => i.id !== id && i.sku !== id);

    if (currentInventory.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Item not found in inventory' });
    }

    saveInventory(currentInventory);
    const summary = calculateSummary(currentInventory);

    return res.json({
      success: true,
      message: 'Item removed from inventory',
      inventory: currentInventory,
      summary
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inventory item' });
  }
};

// PATCH /api/inventory/:id/adjust
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta, type, reason } = req.body;

    if (delta === undefined) {
      return res.status(400).json({ success: false, message: 'Delta number is required' });
    }

    const items = loadInventory();
    const item = items.find(i => i.id === id || i.sku === id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (type === 'BOOKING') {
      item.bookedStock = Math.max(0, (item.bookedStock || 0) + Number(delta));
      item.availableStock = Math.max(0, (item.totalStock || 0) - item.bookedStock);
    } else {
      item.totalStock = Math.max(0, (item.totalStock || 0) + Number(delta));
      item.availableStock = Math.max(0, item.totalStock - (item.bookedStock || 0));
    }

    const thresh = item.minStockThreshold || 3;
    if (item.availableStock === 0) item.status = 'Out of Stock';
    else if (item.availableStock <= thresh) item.status = 'Low Stock';
    else item.status = 'In Stock';

    saveInventory(items);
    const summary = calculateSummary(items);

    return res.json({ success: true, message: 'Stock adjusted successfully', item, inventory: items, summary });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

module.exports = {
  getInventory,
  getInventorySummary,
  createOrUpdateInventory,
  bulkUploadInventory,
  deleteInventory,
  adjustStock
};
