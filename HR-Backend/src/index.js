require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');

// Eagerly load all models so sequelize knows about them before sync() in server.js
require('./models/employee');
require('./models/spouse');
require('./models/kid');
require('./models/emergency');
require('./models/address');
require('./models/document');
require('./models/payroll');
require('./models/timesheetEntry');
require('./models/timesheet');
require('./models/education');
require('./models/certification');
require('./models/editRequest');
require('./models/action_item');
require('./models/auditLog');
require('./models/dashboard_shortcut');
require('./models/employee_project');
require('./models/personalDetails');
require('./models/project');
require('./models/training_progress');
require('./models/onboardingDraft');
require('./models/roleSection');
require('./models/resumeUpload');
require('./models/cvUpload');
require('./models/educationUpload');
require('./models/evaluation');
require('./models/workEmployer');
require('./models/workClientDetail');
require('./models/adminNote');
require('./models/companySnapshot');
require('./models/announcement');
require('./models/invoice');
require('./models/payment');
require('./models/recruiting');
require('./models/company');
require('./models/companySettings');
require('./models/companyJob');

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const quotesRoute = require('./routes/quotes');
const gitaRoutes = require('./routes/gita');
const newsRoutes = require('./routes/news');
const onboardingRoutes = require('./routes/onboarding');
const documentsRoutes = require('./routes/documents');
const uploadRoutes = require('./routes/upload');
const localUploadRoutes = require('./routes/localUpload');
const timesheetRoutes = require('./routes/timesheet');
const timesheetAutoRoutes = require('./routes/timesheetAuto');
const payrollRoutes = require('./routes/payroll');
const adminRoutes = require('./routes/admin');
const recruitingRoutes = require('./routes/recruiting');
const invoiceRoutes = require('./routes/invoice');
const paymentRoutes = require('./routes/payments');
const companyRoutes = require('./routes/company');

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Sequelize test route
const { User } = require('./models/user');
app.get('/api/test-db', async (req, res) => {
  try {
    await User.sync();
    const user = await User.findOne();
    res.json({ message: 'DB connection OK', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public announcements endpoint (used by both admin + employee dashboards)
app.get('/api/announcements', async (req, res) => {
  try {
    const Announcement = require('./models/announcement');
    const { Op } = require('sequelize');
    // Activate scheduled ones first
    await Announcement.update(
      { status: 'Posted' },
      { where: { status: 'Scheduled', scheduledAt: { [Op.lte]: new Date() } } }
    );
    const role = (req.query.role || '').toLowerCase(); // 'admin' or 'employee'
    const all = await Announcement.findAll({
      where: { status: 'Posted' },
      order: [['createdAt', 'DESC']],
    });
    const filtered = all.filter(a => {
      const aud = (a.audience || '').toLowerCase();
      if (aud.includes('all users')) return true;
      if (role === 'admin' && aud.includes('only admin')) return true;
      if (role !== 'admin' && aud.includes('only employees')) return true;
      return false;
    });
    res.json({ announcements: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/quotes', quotesRoute);
app.use('/api/gita', gitaRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/local-upload', localUploadRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/timesheet', timesheetAutoRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recruiting', recruitingRoutes);
app.use('/api/company', companyRoutes);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'HR Backend API is running.' });
});

// 404 JSON fallback for API routes
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

// Generic error handler for API routes (returns JSON)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && (err.stack || err));
  if (req.path && req.path.startsWith('/api')) {
    return res.status(500).json({ success: false, message: err && err.message ? err.message : 'Internal Server Error' });
  }
  res.status(500).send('Internal Server Error');
});

//app.listen(port, () => {
// console.log(`Server running on port ${port}`);
//});

module.exports = app;
