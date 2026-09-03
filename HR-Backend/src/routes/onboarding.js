const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/onboardingController');
const { saveOnboardingValidators, requestEditValidators, submitOnboardingValidators, saveDraftValidators } = require('../middleware/validators');
const { requireEmployeeSelfOrPermission, requirePermission } = require('../middleware/authorization');

router.use(authenticateToken);

router.get('/:employeeId', requireEmployeeSelfOrPermission('employee:read', 'employeeId'), controller.getOnboarding);
router.get('/:employeeId/draft', requireEmployeeSelfOrPermission('employee:read', 'employeeId'), controller.getDraft);
router.post('/:employeeId', requireEmployeeSelfOrPermission('employee:update', 'employeeId'), saveOnboardingValidators, controller.saveOnboarding);
router.post('/:employeeId/submit', requireEmployeeSelfOrPermission('employee:update', 'employeeId'), submitOnboardingValidators, controller.submitOnboarding);
router.post('/:employeeId/request-edit', requireEmployeeSelfOrPermission('employee:update', 'employeeId'), requestEditValidators, controller.requestEdit);
router.get('/:employeeId/edit-requests', requireEmployeeSelfOrPermission('employee:read', 'employeeId'), controller.listEditRequests);
router.post('/:employeeId/save-draft', requireEmployeeSelfOrPermission('employee:update', 'employeeId'), saveDraftValidators, controller.saveDraft);


// Admin approve/reject
router.post('/:employeeId/approve', requirePermission('onboarding:manage'), controller.approve);
router.post('/:employeeId/reject', requirePermission('onboarding:manage'), controller.reject);

module.exports = router;
