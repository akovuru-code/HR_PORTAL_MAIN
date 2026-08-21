const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/onboardingController');
const { saveOnboardingValidators, requestEditValidators, submitOnboardingValidators, saveDraftValidators } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/:employeeId', controller.getOnboarding);
router.get('/:employeeId/draft', controller.getDraft);
router.post('/:employeeId', saveOnboardingValidators, controller.saveOnboarding);
router.post('/:employeeId/submit', submitOnboardingValidators, controller.submitOnboarding);
router.post('/:employeeId/request-edit', requestEditValidators, controller.requestEdit);
router.get('/:employeeId/edit-requests', controller.listEditRequests);
router.post('/:employeeId/save-draft', saveDraftValidators, controller.saveDraft);


// Admin approve/reject
router.post('/:employeeId/approve', controller.approve);
router.post('/:employeeId/reject', controller.reject);

module.exports = router;
