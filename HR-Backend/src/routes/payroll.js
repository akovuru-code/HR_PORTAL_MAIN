const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/payrollController');
const { requirePermission, requireEmployeeOrPermission } = require('../middleware/authorization');

router.use(authenticateToken);

// Employees retain access to their own payroll records; Admin write actions
// remain restricted to payroll-authorized Admins or the Root Admin.
router.get('/', requireEmployeeOrPermission('payroll:view'), controller.getPayrolls);
router.post('/', requirePermission('payroll:create'), controller.createPayroll);
router.patch('/:id', requirePermission('payroll:update'), controller.updatePayroll);
router.put('/:id', requirePermission('payroll:update'), controller.updatePayroll);
router.delete('/:id', requirePermission('payroll:delete'), controller.deletePayroll);
router.get('/file/:id', requireEmployeeOrPermission('payroll:view'), controller.getFile);

module.exports = router;
