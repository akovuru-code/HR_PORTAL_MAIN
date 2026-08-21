// Employee routes for onboarding personal details
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController_pg');
const auth = require('../middleware/auth');

router.get('/:id', employeeController.getEmployee);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// If you want to protect the personal details route with auth middleware:
// router.post('/personal-details', auth, employeeController.createEmployee);

module.exports = router;
