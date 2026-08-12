const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/employeesController');

// GET audit activity log
router.get('/', getActivityLogs);

module.exports = router;
