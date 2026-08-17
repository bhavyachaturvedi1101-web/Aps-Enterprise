const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeePerformance } = require('../controllers/employeesController');

// GET all employees
router.get('/', getEmployees);

// GET employee detailed performance profile (A4 module)
router.get('/:id/performance', getEmployeePerformance);

module.exports = router;
