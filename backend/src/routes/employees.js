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

const { validateBody, createEmployeeSchema } = require('../middleware/validate');
const { authorize } = require('../middleware/rbacMiddleware');

// GET all employees (A4 module)
router.get('/', getEmployees);

// POST create employee (Admin & Manager only)
router.post('/', authorize(['admin', 'manager']), validateBody(createEmployeeSchema), createEmployee);

// GET employee detailed performance profile (A4 module)
router.get('/:id/performance', getEmployeePerformance);

// POST mark task complete and auto-assign next task from queue (A4 module)
router.post('/:id/complete-task', authorize(['admin', 'manager', 'employee']), completeTask);

// POST manually assign/queue task to employee (Admin & Manager only)
router.post('/:id/assign-task', authorize(['admin', 'manager']), assignTask);

// DELETE employee member (Admin only)
router.delete('/:id', authorize(['admin']), deleteEmployee);

module.exports = router;



