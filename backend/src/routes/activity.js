const express = require('express');
const router = express.Router();
const { getActivityLogs, getTimeInStage } = require('../controllers/employeesController');
const { authorize } = require('../middleware/rbacMiddleware');

// GET audit activity log (All authenticated operators, filtered horizontally for employees)
router.get('/', authorize(['admin', 'manager', 'accountant', 'employee']), getActivityLogs);

// GET time-in-stage KPI metrics (A4 module)
router.get('/time-in-stage', authorize(['admin', 'manager', 'accountant', 'employee']), getTimeInStage);

module.exports = router;
