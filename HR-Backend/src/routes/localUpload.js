const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');

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

// Serve uploaded files for download (no auth required — files are accessed via direct URL)
// GET /api/local-upload/file/:employeeId/:filename
router.get('/file/:employeeId/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.employeeId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.sendFile(filePath);
});

// All routes below require authentication
router.use(authenticateToken);

// Upload a file for an employee
// POST /api/local-upload/:employeeId
// Body (multipart): file, category (e.g. passport, visa, dl, marriage_cert, etc.)
router.post('/:employeeId', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = `/api/local-upload/file/${req.params.employeeId}/${req.file.filename}`;
    res.json({
        success: true,
        file: {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            url: filePath,
            category: req.body.category || 'doc',
        }
    });
});

module.exports = router;
