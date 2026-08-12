const express = require('express');
const router = express.Router();
const { getEmployees, getActivityLogs } = require('../controllers/employeesController');

// GET employee performance metrics (A4 module)
router.get('/', getEmployees);

module.exports = router;
