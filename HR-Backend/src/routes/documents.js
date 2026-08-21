const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const ctrl = require('../controllers/documentsController');

router.use(authenticateToken);

router.get('/employee/:employeeId', ctrl.getDocumentsForEmployee);
router.get('/', ctrl.getDocuments);
router.post('/register', ctrl.registerDocument);
router.post('/', ctrl.createDocument);
router.delete('/type/:documentType', ctrl.deleteByType);
router.delete('/:docId', ctrl.deleteDocument);

module.exports = router;
