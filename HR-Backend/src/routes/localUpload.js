const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const { requireEmployeeSelfOrAnyPermission } = require('../middleware/authorization');
const Document = require('../models/document');
const { UPLOAD_DIR, STAGING_DIR } = require('../utils/workInfoDocumentLifecycle');


// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const employeeId = req.params.employeeId || 'unknown';
        const root = req.query.stage === 'work-info' ? STAGING_DIR : UPLOAD_DIR;
        const dir = path.join(root, String(employeeId));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const category = req.body.category || 'doc';
        const ext = path.extname(file.originalname);
        const safeName = `${category}_${Date.now()}${ext}`;
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('File type not allowed'));
    }
});

function canViewCompanyDocuments(user) {
    const accountType = String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
    const adminRole = String(user?.adminRole || user?.admin_role || '').toLowerCase();
    return accountType === 'root_admin' || (accountType === 'admin' && adminRole === 'hr');
}

function isCompanyDocument(document) {
  return String(document?.fileData?.categoryType || '').toLowerCase() === 'company' ||
    String(document?.document_type || '').toLowerCase().startsWith('admin_company_');
}

function isRecruitingAdmin(user) {
    const accountType = String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
    const adminRole = String(user?.adminRole || user?.admin_role || '').toLowerCase();
    return accountType === 'admin' && adminRole === 'recruitment';
}

function isWorkInfoDocument(document, filename = '') {
    return /^(work_|present_employer_|previous_employer_)/i.test(String(document?.document_type || filename || ''));
}

function safeFilePath(root, employeeId, filename) {
    if (!filename || path.basename(filename) !== filename) return null;
    return path.join(root, String(employeeId), filename);
}

async function canAccessEmployeeFile(user, employeeId) {
    const accountType = String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
    if (accountType === 'employee') {
        if (String(user?.employeeId) === String(employeeId)) return true;
        // Some older login tokens do not carry employeeId. Resolve ownership
        // from the authenticated account rather than denying its own document.
        const Employee = require('../models/employee');
        const employee = await Employee.findOne({ where: { email: user?.email } });
        return String(employee?.employee_id) === String(employeeId);
    }
    // File previews are available to authenticated administrators. Individual
    // category rules below still restrict Company and Work Info documents.
    return ['admin', 'root_admin', 'hr'].includes(accountType);
}

function sendProtectedFile(filePath, req, res) {
    if (req.query.download === '1') return res.download(filePath);
    return res.sendFile(filePath);
}

// Every local document is authenticated. Browser navigation cannot supply the
// Authorization header, so the frontend opens these URLs through Axios blobs.
// GET /api/local-upload/file/:employeeId/:filename
router.get('/file/:employeeId/:filename', authenticateToken, async (req, res) => {
    if (!await canAccessEmployeeFile(req.user, req.params.employeeId)) return res.status(403).json({ error: 'Forbidden' });
    const filePath = safeFilePath(UPLOAD_DIR, req.params.employeeId, req.params.filename);
    if (!filePath) return res.status(400).json({ error: 'Invalid filename' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    try {
        const url = `/api/local-upload/file/${req.params.employeeId}/${req.params.filename}`;
        const document = await Document.findOne({ where: { url } });
        if ((document && isCompanyDocument(document)) && !canViewCompanyDocuments(req.user)) {
            return res.status(403).json({ error: 'Company documents are available only to Root Admin and HR Admin' });
        }
        if (isWorkInfoDocument(document, req.params.filename) && isRecruitingAdmin(req.user)) {
            return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
        }
        return sendProtectedFile(filePath, req, res);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/staged/:employeeId/:filename', authenticateToken, async (req, res) => {
    if (!await canAccessEmployeeFile(req.user, req.params.employeeId)) return res.status(403).json({ error: 'Forbidden' });
    const filePath = safeFilePath(STAGING_DIR, req.params.employeeId, req.params.filename);
    if (!filePath) return res.status(400).json({ error: 'Invalid filename' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    if (isRecruitingAdmin(req.user)) return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    return sendProtectedFile(filePath, req, res);
});

// All routes below require authentication
router.use(authenticateToken);

// Upload a file for an employee
// POST /api/local-upload/:employeeId
// Body (multipart): file, category (e.g. passport, visa, dl, marriage_cert, etc.)
router.post('/:employeeId', requireEmployeeSelfOrAnyPermission(['employee:update', 'payroll:upload', 'documents:manage']), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const staged = req.query.stage === 'work-info';
    const filePath = staged
        ? `/api/local-upload/staged/${req.params.employeeId}/${req.file.filename}`
        : `/api/local-upload/file/${req.params.employeeId}/${req.file.filename}`;
    const role = String(req.user.accountType || req.user.role || '').toLowerCase();
    const uploadedBy = {
        userId: req.user.id,
        employeeId: req.user.employeeId || null,
        role: ['admin', 'root_admin', 'hr'].includes(role) ? 'admin' : 'employee',
    };
    res.json({
        success: true,
        file: {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            url: filePath,
            category: req.body.category || 'doc',
            documentName: req.body.documentName || null,
            staged,
            uploadedBy,
        }
    });
});

module.exports = router;
