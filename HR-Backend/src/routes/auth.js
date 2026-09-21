const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const authenticateToken = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');

// Admin login
router.post('/login', authController.login);
// Admin registration (optional, for initial setup)
router.post('/register', authenticateToken, requirePermission('employee:create'), authController.register);

router.get('/me', authenticateToken, authController.getMe);
router.patch('/profile', authenticateToken, authController.updateProfile);
router.patch('/email', authenticateToken, authController.changeEmail);
router.patch('/password', authenticateToken, authController.changePassword);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/request-password-reset', passwordResetController.submit);
router.post('/reset-password/validate', passwordResetController.validateToken);
router.post('/reset-password', passwordResetController.resetPassword);

module.exports = router;
