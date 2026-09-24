const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const ctrl = require('../controllers/documentsController');
const {
  accountType,
  requireEmployeeSelfOrPermission,
  requireEmployeeOrPermission,
} = require('../middleware/authorization');
const { requireApprovedDelete } = require('../services/deleteAuthorizationService');

router.use(authenticateToken);

function canEditOrDeleteDirectly(user) {
  return accountType(user) === 'root_admin';
}

function requireRootOrHrOrApprovedDelete(req, res, next) {
  if (canEditOrDeleteDirectly(req.user)) return next();
  return requireApprovedDelete('document', request => request.params.docId)(req, res, next);
}

router.get('/employee/:employeeId', requireEmployeeSelfOrPermission('documents:manage', 'employeeId'), ctrl.getDocumentsForEmployee);
router.get('/', ctrl.getDocuments);
router.post('/register', requireEmployeeOrPermission('documents:manage'), ctrl.registerDocument);
router.post('/', requireEmployeeOrPermission('employee:update'), ctrl.createDocument);
router.delete('/type/:documentType', requireEmployeeOrPermission('documents:manage'), ctrl.deleteByType);
router.delete('/:docId', requireEmployeeOrPermission('documents:manage'), requireRootOrHrOrApprovedDelete, ctrl.deleteDocument);

module.exports = router;
