const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/payrollController');

router.use(authenticateToken);

router.get('/', controller.getPayrolls);
router.post('/', controller.createPayroll);
router.patch('/:id', controller.updatePayroll);
router.put('/:id', controller.updatePayroll);
router.delete('/:id', controller.deletePayroll);
router.get('/file/:id', controller.getFile);

module.exports = router;
