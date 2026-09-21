const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const timesheetController = require('../controllers/timesheetController');
const timesheetEntryController = require('../controllers/timesheetEntryController');
const authenticateToken = require('../middleware/auth');
const { requireEmployeeOrPermission } = require('../middleware/authorization');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'timesheet');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Run multer first so req.file is populated; then small debug middleware; then auth, then controller
router.post('/upload', upload.single('timesheet'), (req, res, next) => {
  try {
    console.debug('[timesheet-route] after multer - authorization:', req.headers && req.headers.authorization);
    console.debug('[timesheet-route] after multer - file present?', !!req.file);
  } catch (e) { console.debug('[timesheet-route] debug middleware error', e && e.message); }
  next();
}, authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetController.uploadTimesheet);

router.get('/entries', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.getEntries);
router.get('/context', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.getContext);
router.get('/projects', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.getProjects);
router.get('/weeks/:weekStart', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.getWeek);
router.put('/weeks/:weekStart/project', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.saveWeeklyProject);
router.put('/weeks/:weekStart/details', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.saveWeeklyDetails);
router.put('/weeks/:weekStart/quick-entry', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.saveQuickEntry);
router.put('/weeks/:weekStart/status-report', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.saveWeeklyStatusReport);
router.post('/entries/submit', authenticateToken, requireEmployeeOrPermission('timesheet:view'), timesheetEntryController.submitEntries);

module.exports = router;
