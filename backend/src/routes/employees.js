const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeePerformance, createEmployee, deleteEmployee } = require('../controllers/employeesController');

// GET all employees (A4 module)
router.get('/', getEmployees);

// POST create employee (A4 module)
router.post('/', createEmployee);

// GET employee detailed performance profile (A4 module)
router.get('/:id/performance', getEmployeePerformance);

// DELETE employee member (A4 module)
router.delete('/:id', deleteEmployee);

module.exports = router;


