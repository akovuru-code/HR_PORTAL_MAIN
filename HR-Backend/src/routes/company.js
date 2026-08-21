const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/companyController');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'company');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, String(req.body.companyId || 'unknown'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `logo_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  cb(null, ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase()));
} });

router.use(authenticateToken);
router.get('/', controller.getCompany);
router.get('/logo/file/:companyId/:filename', controller.getLogo);
router.put('/settings', controller.updateSettings);
router.put('/:companyId', controller.updateCompany);
router.post('/jobs', controller.createJob);
router.put('/jobs/:id', controller.updateJob);
router.delete('/jobs/:id', controller.deleteJob);
router.post('/logo', upload.single('logo'), controller.uploadLogo);

module.exports = router;