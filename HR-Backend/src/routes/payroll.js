const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/payrollController');
const { requirePermission, requireEmployeeOrPermission } = require('../middleware/authorization');
const { requireApprovedDelete, requireApprovedEdit } = require('../services/deleteAuthorizationService');

router.use(authenticateToken);

// Employees retain access to their own payroll records; Admin write actions
// remain restricted to payroll-authorized Admins or the Root Admin.
router.get('/', requireEmployeeOrPermission('payroll:view'), controller.getPayrolls);
router.post('/', requirePermission('payroll:create'), controller.createPayroll);
router.patch('/:id', requirePermission('payroll:update'), requireApprovedEdit('payroll'), controller.updatePayroll);
router.put('/:id', requirePermission('payroll:update'), requireApprovedEdit('payroll'), controller.updatePayroll);
router.delete('/:id', requirePermission('payroll:delete'), requireApprovedDelete('payroll'), controller.deletePayroll);
router.get('/file/:id', requireEmployeeOrPermission('payroll:view'), controller.getFile);

module.exports = router;
