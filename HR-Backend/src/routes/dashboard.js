const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');


const dashboardController = require('../controllers/dashboardController');
// GET /api/dashboard - employee dashboard data
router.get('/', authenticateToken, dashboardController.getDashboard);

// Test route for frontend fetch
router.get('/userData', (req, res) => {
  res.json({
    message: 'Test user data',
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'employee'
    },
    dashboard: {
      shortcuts: ['Timesheet', 'Payroll', 'Projects'],
      training: [
        { module: 'Module 1', percent_complete: 80 },
        { module: 'Module 2', percent_complete: 60 }
      ],
      actionItems: [
        { id: 1, message: 'EAD expiring soon' },
        { id: 2, message: 'Project ending soon.' },
        { id: 3, message: 'Upload resume' }
      ],
      activeProjects: [
        { id: 1, name: 'Project Alpha' },
        { id: 2, name: 'Project Beta' }
      ]
    }
  });
});

module.exports = router;
