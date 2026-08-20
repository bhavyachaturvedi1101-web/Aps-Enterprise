const express = require('express');
const router = express.Router();
const { 
  getEmployees, 
  getEmployeePerformance, 
  createEmployee, 
  completeTask,
  assignTask,
  deleteEmployee 
} = require('../controllers/employeesController');

// GET all employees (A4 module)
router.get('/', getEmployees);

// POST create employee (A4 module)
router.post('/', createEmployee);

// GET employee detailed performance profile (A4 module)
router.get('/:id/performance', getEmployeePerformance);

// POST mark task complete and auto-assign next task from queue (A4 module)
router.post('/:id/complete-task', completeTask);

// POST manually assign/queue task to employee (A4 module)
router.post('/:id/assign-task', assignTask);

// DELETE employee member (A4 module)
router.delete('/:id', deleteEmployee);

module.exports = router;



