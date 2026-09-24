const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const { requireEmployeeSelfOrAnyPermission } = require('../middleware/authorization');
const Document = require('../models/document');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const employeeId = req.params.employeeId || 'unknown';
        const dir = path.join(UPLOAD_DIR, String(employeeId));
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

// Work Info and Company files are authenticated before download so role-based
// access cannot be bypassed by opening a copied file URL.
// GET /api/local-upload/file/:employeeId/:filename
router.get('/file/:employeeId/:filename', async (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.employeeId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    try {
        const url = `/api/local-upload/file/${req.params.employeeId}/${req.params.filename}`;
        const document = await Document.findOne({ where: { url } });
        const protectedDocument = (document && (isCompanyDocument(document) || isWorkInfoDocument(document))) ||
            isWorkInfoDocument(null, req.params.filename);
        if (!protectedDocument) return res.sendFile(filePath);
        return authenticateToken(req, res, () => {
            if ((document && isCompanyDocument(document)) && !canViewCompanyDocuments(req.user)) {
                return res.status(403).json({ error: 'Company documents are available only to Root Admin and HR Admin' });
            }
            if (isWorkInfoDocument(document, req.params.filename) && isRecruitingAdmin(req.user)) {
                return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
            }
            return res.sendFile(filePath);
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// All routes below require authentication
router.use(authenticateToken);

// Upload a file for an employee
// POST /api/local-upload/:employeeId
// Body (multipart): file, category (e.g. passport, visa, dl, marriage_cert, etc.)
router.post('/:employeeId', requireEmployeeSelfOrAnyPermission(['employee:update', 'payroll:upload', 'documents:manage']), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = `/api/local-upload/file/${req.params.employeeId}/${req.file.filename}`;
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
            uploadedBy,
        }
    });
});

module.exports = router;
