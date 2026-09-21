const express = require('express');
const authenticateToken = require('../middleware/auth');
const { requireRootAdmin } = require('../middleware/authorization');
const controller = require('../controllers/adminUsersController');

const router = express.Router();
router.use(authenticateToken, requireRootAdmin);
router.get('/', controller.listAdmins);
router.post('/', controller.createAdmin);
router.patch('/:id', controller.updateAdmin);
router.patch('/:id/status', controller.setAdminStatus);
router.delete('/:id', controller.deleteAdmin);
module.exports = router;