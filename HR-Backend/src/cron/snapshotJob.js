const cron = require('node-cron');
const Employee = require('../models/employee');
const CompanySnapshot = require('../models/companySnapshot');

async function takeSnapshot() {
  try {
    const employees = await Employee.findAll({
      attributes: ['profileStatus'],
    });

    const counts = { 'In Project': 0, 'In Training': 0, 'On Bench': 0 };
    for (const emp of employees) {
      const s = emp.profileStatus || 'On Bench';
      if (counts[s] !== undefined) counts[s]++;
      else counts['On Bench']++;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const existing = await CompanySnapshot.findOne({ where: { date: today } });
    if (existing) {
      await existing.update({
        in_project: counts['In Project'],
        in_training: counts['In Training'],
        on_bench: counts['On Bench'],
        total: employees.length,
      });
      console.log(`[snapshot] Updated snapshot for ${today}`);
    } else {
      await CompanySnapshot.create({
        date: today,
        in_project: counts['In Project'],
        in_training: counts['In Training'],
        on_bench: counts['On Bench'],
        total: employees.length,
      });
      console.log(`[snapshot] Created snapshot for ${today}`);
    }
  } catch (err) {
    console.error('[snapshot] Error:', err.message);
  }
}

// Run at midnight and noon every day
cron.schedule('0 0,12 * * *', takeSnapshot);

// Export so server.js can trigger an immediate snapshot on startup
module.exports = { takeSnapshot };
