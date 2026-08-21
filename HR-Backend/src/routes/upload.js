const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const ctrl = require('../controllers/uploadController');

router.use(authenticateToken);

router.post('/presign', ctrl.presign);

module.exports = router;
