const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const authenticateToken = require('../middleware/auth');
const { accountType, requireRootAdmin, requireRootOrAdminRole } = require('../middleware/authorization');
const controller = require('../controllers/performanceReportsController');
const { TEMPLATE_ROOT } = require('../services/performanceReviewTemplateSeed');

const router = express.Router();
const tempDir = path.join(TEMPLATE_ROOT, 'tmp');
fs.mkdirSync(tempDir, { recursive: true });
const PDF_MIME = 'application/pdf';

function requireEmployee(req, res, next) {
  if (accountType(req.user) !== 'employee') return res.status(403).json({ error: 'Employee access required' });
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
    filename: (_req, file, cb) => cb(null, `upload_${Date.now()}_${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.pdf' || file.mimetype !== PDF_MIME) return cb(new Error('Only PDF files are allowed for completed Performance Review uploads.'));
    cb(null, true);
  },
});

function hasPdfSignature(filePath) {
  try {
    const descriptor = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(5);
      const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
      return bytesRead === header.length && header.toString('ascii') === '%PDF-';
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return false;
  }
}

function uploadCompletedDocument(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) {
      if (!req.file || !hasPdfSignature(req.file.path)) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Only PDF files are allowed for completed Performance Review uploads.' });
      }
      if (req.file) req.file.storageKey = path.posix.join('tmp', req.file.filename);
      return next();
    }
    const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? 'Performance review document must be 20 MB or smaller.'
      : err.message || 'Performance review upload failed.';
    return res.status(400).json({ error: message });
  });
}

router.use(authenticateToken);
router.get('/me', requireEmployee, controller.getMyReports);
router.get('/me/templates/:templateId/download', requireEmployee, controller.downloadMyTemplate);
router.post('/me/submissions/upload', requireEmployee, uploadCompletedDocument, controller.uploadMyDraft);
router.post('/me/submissions/:reportId/submit', requireEmployee, controller.submitMyReport);
router.post('/me/submissions/:reportId/replacement-requests', requireEmployee, controller.requestReplacement);
router.get('/me/submissions/:submissionId/download', requireEmployee, controller.downloadMySubmission);
router.get('/admin', requireRootOrAdminRole('hr'), controller.listForRootAdmin);
router.get('/admin/submissions/:submissionId/download', requireRootOrAdminRole('hr'), controller.downloadForRootAdmin);
router.get('/admin/submissions/:submissionId/preview', requireRootOrAdminRole('hr'), controller.previewForRootAdmin);
router.patch('/admin/replacement-requests/:requestId/approve', requireRootAdmin, controller.approveReplacementRequest);
router.patch('/admin/replacement-requests/:requestId/reject', requireRootAdmin, controller.rejectReplacementRequest);

module.exports = router;
