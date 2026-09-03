// Employee routes for onboarding personal details
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController_pg');
const auth = require('../middleware/auth');
const { requirePermission, requireEmployeeSelfOrPermission } = require('../middleware/authorization');

router.get('/:id', auth, requireEmployeeSelfOrPermission('employee:read'), employeeController.getEmployee);
router.post('/', auth, requirePermission('employee:create'), employeeController.createEmployee);
router.put('/:id', auth, requireEmployeeSelfOrPermission('employee:update'), employeeController.updateEmployee);
router.delete('/:id', auth, requirePermission('employee:deactivate'), employeeController.deleteEmployee);

// If you want to protect the personal details route with auth middleware:
// router.post('/personal-details', auth, employeeController.createEmployee);

module.exports = router;
