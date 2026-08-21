const TimesheetEntry = require('../models/timesheetEntry');
const Employee = require('../models/employee');

// GET /api/timesheet/entries
exports.getEntries = async (req, res) => {
  try {
    const userModel = require('../models/user');
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [employee] = await Employee.findOrCreate({
      where: { email: user.email },
      defaults: { email: user.email },
    });

    const entries = await TimesheetEntry.findAll({
      where: { employee_id: employee.employee_id },
      order: [['dateKey', 'ASC']],
    });

    res.json({ entries });
  } catch (err) {
    console.error('[getEntries]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheet/entries/submit
// Body: { entries: [{ id?, dateKey, hours, project, client, role, type, notes }] }
exports.submitEntries = async (req, res) => {
  try {
    const userModel = require('../models/user');
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [employee] = await Employee.findOrCreate({
      where: { email: user.email },
      defaults: { email: user.email },
    });

    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided' });
    }

    const saved = [];
    for (const e of entries) {
      // If entry has a numeric DB id, update it; otherwise create new
      if (e.dbId) {
        const existing = await TimesheetEntry.findOne({
          where: { id: e.dbId, employee_id: employee.employee_id },
        });
        if (existing) {
          await existing.update({ status: 'Submitted' });
          saved.push(existing);
          continue;
        }
      }
      // Create new entry with Submitted status
      const created = await TimesheetEntry.create({
        employee_id: employee.employee_id,
        dateKey: e.dateKey,
        hours: e.hours,
        project: e.project || null,
        client: e.client || null,
        role: e.role || null,
        type: e.type || null,
        notes: e.notes || null,
        status: 'Submitted',
      });
      saved.push(created);
    }

    console.log(`[submitEntries] Saved ${saved.length} entries for employee_id=${employee.employee_id}`);
    res.json({ saved });
  } catch (err) {
    console.error('[submitEntries]', err.message);
    res.status(500).json({ error: err.message });
  }
};
