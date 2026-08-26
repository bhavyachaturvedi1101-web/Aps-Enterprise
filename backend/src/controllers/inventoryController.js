const { Inventory } = require('../models');
const inMemoryStore = require('../config/inMemoryStore');

// Helper to check if DB is connected and model usable
const isDbAvailable = () => {
  try {
    return Inventory && typeof Inventory.findAll === 'function' && process.env.DATABASE_URL;
  } catch (e) {
    return false;
  }
};

// GET /api/inventory
const getInventory = async (req, res) => {
  try {
    const { category, status, search } = req.query;

    if (isDbAvailable()) {
      const items = await Inventory.findAll({ order: [['name', 'ASC']] });
      if (items && items.length > 0) {
        return res.json({ success: true, count: items.length, inventory: items });
      }
    }

    // Fallback to in-memory store
    let inventory = inMemoryStore.mockInventory || [];

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

    // Format fields consistently
    const formatted = inventory.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      totalStock: item.stockUnits !== undefined ? item.stockUnits : (item.totalStock || 0),
      bookedStock: item.reservedUnits !== undefined ? item.reservedUnits : (item.bookedStock || 0),
      availableStock: item.availableUnits !== undefined ? item.availableUnits : Math.max(0, (item.totalStock || 0) - (item.bookedStock || 0)),
      minStockThreshold: item.minThreshold !== undefined ? item.minThreshold : (item.minStockThreshold || 5),
      unitPrice: item.unitPrice || 0,
      status: item.status || 'In Stock',
      warehouse: item.warehouse || 'Indore Main Plant',
      lastRestocked: item.lastRestocked || new Date().toISOString().split('T')[0]
    }));

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
    let inventory = [];

    if (isDbAvailable()) {
      const dbItems = await Inventory.findAll();
      if (dbItems && dbItems.length > 0) {
        inventory = dbItems.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          totalStock: item.totalStock,
          bookedStock: item.bookedStock,
          availableStock: Math.max(0, item.totalStock - item.bookedStock),
          minStockThreshold: item.minStockThreshold,
          unitPrice: Number(item.unitPrice),
          status: item.status,
          warehouse: item.location
        }));
      }
    }

    if (inventory.length === 0) {
      const raw = inMemoryStore.mockInventory || [];
      inventory = raw.map(item => {
        const total = item.stockUnits !== undefined ? item.stockUnits : (item.totalStock || 0);
        const booked = item.reservedUnits !== undefined ? item.reservedUnits : (item.bookedStock || 0);
        const available = item.availableUnits !== undefined ? item.availableUnits : Math.max(0, total - booked);
        const threshold = item.minThreshold !== undefined ? item.minThreshold : (item.minStockThreshold || 5);
        
        let derivedStatus = 'In Stock';
        if (available === 0) derivedStatus = 'Out of Stock';
        else if (available <= threshold) derivedStatus = 'Low Stock';

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          totalStock: total,
          bookedStock: booked,
          availableStock: available,
          minStockThreshold: threshold,
          unitPrice: item.unitPrice || 0,
          status: item.status || derivedStatus,
          warehouse: item.warehouse || 'Indore Main Plant'
        };
      });
    }

    // Calculations
    const totalStock = inventory.reduce((sum, item) => sum + (Number(item.totalStock) || 0), 0);
    const totalBooked = inventory.reduce((sum, item) => sum + (Number(item.bookedStock) || 0), 0);
    const totalAvailable = inventory.reduce((sum, item) => sum + (Number(item.availableStock) || 0), 0);
    const lowStockItems = inventory.filter(item => item.availableStock <= item.minStockThreshold);
    const outOfStockItems = inventory.filter(item => item.availableStock === 0);

    // Total Inventory Value (in INR)
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.totalStock * item.unitPrice), 0);

    // Filter top machinery items for Dashboard showcase
    const machineryItems = inventory.slice(0, 6).map(item => {
      const utilizationPct = item.totalStock > 0 
        ? Math.round((item.bookedStock / item.totalStock) * 100) 
        : 0;
      return {
        ...item,
        utilizationPct,
        availablePct: 100 - utilizationPct
      };
    });

    return res.json({
      success: true,
      summary: {
        totalStock,
        totalBooked,
        totalAvailable,
        totalInventoryValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        inStockCount: inventory.length - lowStockItems.length - outOfStockItems.length,
        totalSKUs: inventory.length
      },
      topItems: machineryItems,
      recentLogs: (inMemoryStore.mockInventoryLogs || []).slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory summary' });
  }
};

// POST /api/inventory
const createOrUpdateInventory = async (req, res) => {
  try {
    const { id, sku, name, category, totalStock, bookedStock, minStockThreshold, unitPrice, location } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'SKU and Name are required' });
    }

    if (isDbAvailable()) {
      let item;
      if (id) {
        item = await Inventory.findByPk(id);
        if (item) {
          await item.update({ sku, name, category, totalStock, bookedStock, minStockThreshold, unitPrice, location });
          return res.json({ success: true, message: 'Inventory updated', item });
        }
      }
      item = await Inventory.create({ sku, name, category, totalStock, bookedStock, minStockThreshold, unitPrice, location });
      return res.status(201).json({ success: true, message: 'Inventory created', item });
    }

    // In-memory update
    const items = inMemoryStore.mockInventory || [];
    const existingIndex = items.findIndex(i => i.id === id || i.sku === sku);

    const available = Math.max(0, (Number(totalStock) || 0) - (Number(bookedStock) || 0));
    const threshold = Number(minStockThreshold) || 5;
    let status = 'In Stock';
    if (available === 0) status = 'Out of Stock';
    else if (available <= threshold) status = 'Low Stock';

    const newItem = {
      id: id || `INV-${Date.now()}`,
      sku,
      name,
      category: category || 'Machinery',
      stockUnits: Number(totalStock) || 0,
      reservedUnits: Number(bookedStock) || 0,
      availableUnits: available,
      minThreshold: threshold,
      unitPrice: Number(unitPrice) || 0,
      warehouse: location || 'Indore Main Plant',
      status,
      lastRestocked: new Date().toISOString().split('T')[0]
    };

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...newItem };
    } else {
      items.unshift(newItem);
    }

    return res.json({ success: true, message: 'Inventory saved in memory', item: newItem });
  } catch (error) {
    console.error('Error creating/updating inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to save inventory' });
  }
};

// PATCH /api/inventory/:id/adjust
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta, type, reason } = req.body; // delta can be positive (restock) or negative (booking/dispatch)

    if (delta === undefined) {
      return res.status(400).json({ success: false, message: 'Delta number is required' });
    }

    // In-memory fallback
    const items = inMemoryStore.mockInventory || [];
    const item = items.find(i => i.id === id || i.sku === id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (type === 'BOOKING') {
      item.reservedUnits = Math.max(0, (item.reservedUnits || 0) + Number(delta));
      item.availableUnits = Math.max(0, (item.stockUnits || 0) - item.reservedUnits);
    } else {
      item.stockUnits = Math.max(0, (item.stockUnits || 0) + Number(delta));
      item.availableUnits = Math.max(0, item.stockUnits - (item.reservedUnits || 0));
    }

    if (item.availableUnits === 0) item.status = 'Out of Stock';
    else if (item.availableUnits <= (item.minThreshold || 5)) item.status = 'Low Stock';
    else item.status = 'In Stock';

    // Log the change
    if (!inMemoryStore.mockInventoryLogs) inMemoryStore.mockInventoryLogs = [];
    inMemoryStore.mockInventoryLogs.unshift({
      id: `LOG-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      change: Number(delta),
      type: type || 'Adjustment',
      reason: reason || 'Manual Admin Adjustment',
      user: 'Admin Cockpit',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    return res.json({ success: true, message: 'Stock adjusted successfully', item });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

module.exports = {
  getInventory,
  getInventorySummary,
  createOrUpdateInventory,
  adjustStock
};
