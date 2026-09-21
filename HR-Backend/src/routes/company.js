const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const authenticateToken = require('../middleware/auth');
const { requireAdmin, requireRootAdmin, requireRootOrAdminRole } = require('../middleware/authorization');
const { requireApprovedDelete, requireApprovedEdit } = require('../services/deleteAuthorizationService');
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

const resumeUploadDir = path.join(__dirname, '..', '..', 'uploads', 'bench-candidates');
const resumeMimeTypes = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const candidateId = String(req.params.id || '');
    if (!/^\d+$/.test(candidateId)) return cb(new Error('Invalid Bench Candidate identifier.'));
    const dir = path.join(resumeUploadDir, candidateId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `resume_${Date.now()}_${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!resumeMimeTypes[ext] || !resumeMimeTypes[ext].includes(file.mimetype)) return cb(new Error('Only PDF, DOC, and DOCX resume files are allowed.'));
    cb(null, true);
  },
});
const uploadResume = (req, res, next) => resumeUpload.single('resume')(req, res, err => {
  if (!err) return next();
  const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
    ? 'Resume must be 20 MB or smaller.' : err.message || 'Resume upload failed.';
  return res.status(400).json({ error: message });
});

router.use(authenticateToken);
router.get('/', controller.getCompany);
router.get('/logo/file/:companyId/:filename', controller.getLogo);
router.get('/bench-candidates', requireAdmin, controller.listBenchCandidates);
router.get('/bench-candidates/:id/resume', requireAdmin, controller.previewBenchCandidateResume);
router.get('/bench-candidates/employees', requireRootOrAdminRole('recruitment'), controller.listBenchCandidateEmployees);
router.get('/bench-candidates/employees/:employeeId', requireRootOrAdminRole('recruitment'), controller.getBenchCandidateEmployee);
router.post('/bench-candidates', requireRootOrAdminRole('recruitment'), controller.createBenchCandidate);
router.post('/bench-candidates/:id/resume', requireRootOrAdminRole('recruitment'), uploadResume, controller.uploadBenchCandidateResume);
router.delete('/bench-candidates/:id', requireRootOrAdminRole('recruitment'), requireApprovedDelete('bench_candidate'), controller.deleteBenchCandidate);
router.put('/settings', requireRootAdmin, controller.updateSettings);
router.put('/:companyId', requireRootAdmin, controller.updateCompany);
router.post('/jobs', requireRootOrAdminRole('recruitment'), controller.createJob);
router.put('/jobs/:id', requireRootOrAdminRole('recruitment'), requireApprovedEdit('company_job'), controller.updateJob);
router.delete('/jobs/:id', requireRootOrAdminRole('recruitment'), requireApprovedDelete('company_job'), controller.deleteJob);
router.post('/logo', requireRootAdmin, upload.single('logo'), controller.uploadLogo);

module.exports = router;
