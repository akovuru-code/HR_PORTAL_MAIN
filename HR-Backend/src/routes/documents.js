const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const ctrl = require('../controllers/documentsController');
const {
  requireEmployeeSelfOrPermission,
  requireEmployeeOrPermission,
} = require('../middleware/authorization');

router.use(authenticateToken);

router.get('/employee/:employeeId', requireEmployeeSelfOrPermission('documents:manage', 'employeeId'), ctrl.getDocumentsForEmployee);
router.get('/', ctrl.getDocuments);
router.post('/register', requireEmployeeOrPermission('employee:update'), ctrl.registerDocument);
router.post('/', requireEmployeeOrPermission('employee:update'), ctrl.createDocument);
router.delete('/type/:documentType', requireEmployeeOrPermission('employee:update'), ctrl.deleteByType);
router.delete('/:docId', requireEmployeeOrPermission('employee:update'), ctrl.deleteDocument);

module.exports = router;
