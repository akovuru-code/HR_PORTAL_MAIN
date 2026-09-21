const { Op } = require('sequelize');
const Employee = require('../models/employee');
const EditRequest = require('../models/editRequest');
const TimesheetEntry = require('../models/timesheetEntry');
const Payroll = require('../models/payroll');
const Certification = require('../models/certification');
const Education = require('../models/education');
const PerformanceReportReplacementRequest = require('../models/performanceReportReplacementRequest');

async function resolveEmployee(userId) {
  const userModel = require('../models/user');
  const user = await userModel.getUserById(userId);
  if (!user) return null;
  const [employee] = await Employee.findOrCreate({
    where: { email: user.email },
    defaults: { email: user.email },
  });
  return employee;
}

exports.getDashboard = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const employeeId = employee.employee_id;
    const today = new Date();
    const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

    // ── Action Items ──────────────────────────────────────────────
    const actionItems = [];

    // Expiring / expired documents
    const expiryFields = [
      { field: 'passportExpiry', label: 'Passport' },
      { field: 'visaExpiry', label: 'Visa' },
      { field: 'dlExpiry', label: 'Driving License' },
    ];
    for (const { field, label } of expiryFields) {
      const expiry = employee[field];
      if (expiry) {
        const expiryDate = new Date(expiry);
        if (expiryDate < today) {
          actionItems.push({ id: `expired-${field}`, type: 'expired', message: `${label} has expired` });
        } else if (expiryDate <= in60Days) {
          const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          actionItems.push({ id: `expiry-${field}`, type: 'expiry', message: `${label} expiring in ${daysLeft} day(s)` });
        }
      }
    }

    // Missing key documents
    if (!employee.passportFile) actionItems.push({ id: 'missing-passport', type: 'missing', message: 'Passport document not uploaded' });
    if (!employee.visaFile) actionItems.push({ id: 'missing-visa', type: 'missing', message: 'Visa document not uploaded' });

    // Pending/denied edit requests
    try {
      const editRequests = await EditRequest.findAll({
        where: { employeeId, status: { [Op.in]: ['pending', 'denied'] } },
        order: [['createdAt', 'DESC']],
      });
      for (const r of editRequests) {
        if (r.status === 'pending') {
          actionItems.push({ id: `edit-${r.id}`, type: 'approval', message: `Edit request for "${r.sectionKey}" is pending for admin approval` });
        } else {
          actionItems.push({ id: `edit-denied-${r.id}`, type: 'rejection', message: `Edit request for "${r.sectionKey}" was denied by Admin` });
        }
      }
    } catch (e) { console.error('[dashboard] editRequests error:', e.message); }

    // Timesheet submissions and rejections
    try {
      const timesheets = await TimesheetEntry.findAll({
        where: { employee_id: employeeId, status: { [Op.in]: ['Submitted', 'Rejected'] } },
        attributes: ['dateKey', 'status'],
      });
      const submitted = timesheets.filter(t => t.status === 'Submitted');
      const rejected = timesheets.filter(t => t.status === 'Rejected');
      if (submitted.length > 0) {
        const dates = [...new Set(submitted.map(t => t.dateKey))].slice(0, 3).join(', ');
        actionItems.push({ id: 'timesheet-pending', type: 'timesheet', message: `Timesheet entries (${dates}) awaiting approval` });
      }
      if (rejected.length > 0) {
        const dates = [...new Set(rejected.map(t => t.dateKey))].slice(0, 3).join(', ');
        actionItems.push({ id: 'timesheet-rejected', type: 'rejection', message: `Timesheet entries (${dates}) were rejected by Admin` });
      }
    } catch (e) { console.error('[dashboard] timesheets error:', e.message); }

    // Performance Report replacement decisions. Pending requests remain visible
    // on the Performance Report page; this dashboard only shows final outcomes.
    try {
      const replacementRequests = await PerformanceReportReplacementRequest.findAll({
        where: {
          employeeId,
          status: { [Op.in]: ['approved', 'rejected', 'consumed'] },
        },
        order: [['created_at', 'DESC']],
      });

      for (const request of replacementRequests) {
        const reviewLabel = request.reviewType === 'MID_YEAR'
          ? 'Mid-Year'
          : request.reviewType === 'YEAR_END'
            ? 'Year-End'
            : 'Performance';
        // A consumed request was previously approved and must retain that
        // historical decision after the employee uploads its replacement.
        const isApproved = request.status === 'approved' || request.status === 'consumed';
        const decision = isApproved ? 'approved' : 'rejected';

        actionItems.push({
          id: `performance-replacement-${decision}-${request.id}`,
          type: isApproved ? 'approval' : 'rejection',
          message: `${reviewLabel} ${request.reviewYear} Performance Report replacement request was ${decision}.`,
        });
      }
    } catch (e) { console.error('[dashboard] performance replacement requests error:', e.message); }

    // New payroll available (within last 2 days)
    try {
      const recentPayroll = await Payroll.findOne({
        where: { employee_id: employeeId, createdAt: { [Op.gte]: twoDaysAgo } },
        order: [['createdAt', 'DESC']],
      });
      if (recentPayroll) {
        actionItems.push({ id: 'payroll-new', type: 'payroll', message: 'New payroll is available — download now' });
      }
    } catch (e) { console.error('[dashboard] payroll error:', e.message); }

    // ── Active Items — driven by profileStatus from Settings ─────
    const profileStatus = employee.profileStatus || 'On Bench';
    const statusDetails = employee.statusDetails || {};
    let activeItems = [];

    if (profileStatus === 'In Project') {
      activeItems.push({
        id: 'status-project',
        type: 'project',
        name: statusDetails.role || 'In Project',
        role: statusDetails.jobDesc || '',
      });
    } else if (profileStatus === 'In Training') {
      if (statusDetails.trainingModules) {
        activeItems.push({ id: 'status-training', type: 'certification', name: statusDetails.trainingModules, org: 'Ongoing Training' });
      }
      if (statusDetails.certifications) {
        activeItems.push({ id: 'status-certs', type: 'certification', name: statusDetails.certifications, org: 'Certifications Completed' });
      }
      if (activeItems.length === 0) {
        activeItems.push({ id: 'status-training-empty', type: 'certification', name: 'In Training' });
      }
    } else {
      // On Bench
      activeItems.push({
        id: 'bench',
        type: 'bench',
        name: 'On Bench',
        role: statusDetails.prevRole || '',
      });
    }

    // ── Training Progress — date-based completion per Education & Certification ──
    // For each record: progress = (today - start_date) / (end_date - start_date), capped 0–1
    // If already past end_date → 1.0 (done). No dates → 0.
    function calcProgress(start, end) {
      if (!start) return 0;
      const s = new Date(start).getTime();
      const e = end ? new Date(end).getTime() : null;
      const now = today.getTime();
      if (!e) return now >= s ? 0.5 : 0; // started but no end date → 50%
      if (now >= e) return 1;             // past end date → fully done
      if (now <= s) return 0;             // not started yet
      return (now - s) / (e - s);
    }

    let eduDonePoints = 0, eduTotalPoints = 0;
    let certDonePoints = 0, certTotalPoints = 0;
    let eduCount = 0, certCount = 0;

    try {
      const educations = await Education.findAll({ where: { employee_id: employeeId } });
      eduCount = educations.length;
      for (const e of educations) {
        const p = calcProgress(e.start_date, e.end_date);
        eduDonePoints += p;
        eduTotalPoints += 1;
      }

      const educationIds = educations.map(e => e.education_id);
      if (educationIds.length > 0) {
        const allCerts = await Certification.findAll({ where: { education_id: { [Op.in]: educationIds } } });
        certCount = allCerts.length;
        for (const c of allCerts) {
          const p = calcProgress(c.start_date, c.end_date);
          certDonePoints += p;
          certTotalPoints += 1;
        }
      }
    } catch (e) { console.error('[dashboard] training progress error:', e.message); }

    const totalItems = eduTotalPoints + certTotalPoints;

    let training;
    if (totalItems === 0) {
      training = [{ label: 'No education or certifications yet', percent: 100, color: '#e0e0e0' }];
    } else {
      // Overall done vs remaining across all items
      // Break down the "done" portion into edu vs cert
      const eduDonePct = Math.round((eduDonePoints / totalItems) * 100);
      const certDonePct = Math.round((certDonePoints / totalItems) * 100);
      const remainingPct = 100 - eduDonePct - certDonePct;

      training = [];
      if (eduDonePct > 0) training.push({ label: `Education Progress (${eduCount})`, percent: eduDonePct, color: '#4CAF50' });
      if (certDonePct > 0) training.push({ label: `Certifications Progress (${certCount})`, percent: certDonePct, color: '#2196F3' });
      if (remainingPct > 0) training.push({ label: 'Remaining', percent: remainingPct, color: '#e0e0e0' });
      // Fix rounding
      const sum = training.reduce((a, t) => a + t.percent, 0);
      if (sum !== 100 && training.length > 0) training[0].percent += (100 - sum);
    }

    res.json({ actionItems, activeItems, training });
  } catch (err) {
    console.error('[getDashboard] fatal:', err.message);
    res.status(500).json({ error: err.message });
  }
};
