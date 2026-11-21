const express = require('express');
const router = express.Router();
const { getActivityLogs, getTimeInStage } = require('../controllers/employeesController');

// GET audit activity log
router.get('/', getActivityLogs);

// GET time-in-stage KPI metrics (A4 module)
router.get('/time-in-stage', getTimeInStage);

module.exports = router;
