const { Op } = require('sequelize');
const sequelize = require('../models/db');
const TimesheetEntry = require('../models/timesheetEntry');
const TimesheetWeeklySummary = require('../models/timesheetWeeklySummary');
const Employee = require('../models/employee');
const WorkClientDetail = require('../models/workClientDetail');

const MAX_HOURS_PER_DAY = 24;
const EDITABLE_STATUSES = new Set(['Pending', 'Rejected']);

async function resolveEmployee(userId) {
  const userModel = require('../models/user');
  const user = await userModel.getUserById(userId);
  if (!user) { const error = new Error('User not found'); error.status = 404; throw error; }
  const [employee] = await Employee.findOrCreate({ where: { email: user.email }, defaults: { email: user.email } });
  return employee;
}

function dateKeyFromUtcDate(date) { return date.toISOString().slice(0, 10); }
function parseWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const offset = date.getUTCDay() === 0 ? -6 : 1 - date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + offset);
  return dateKeyFromUtcDate(date);
}
function weekDateKeys(weekStart) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + index); return dateKeyFromUtcDate(date); });
}
function parseHours(value, { allowZero = false } = {}) {
  if (value === '' || value === null || value === undefined) return allowZero ? 0 : null;
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 0 && hours <= MAX_HOURS_PER_DAY && (allowZero || hours > 0) ? hours : null;
}
function periodStatus(entries) {
  const approvalEntries = entries.filter(entry => !(entry.entrySource === 'weekly_quick' && Number(entry.hours) === 0));
  if (!approvalEntries.length) return 'None';
  const statuses = approvalEntries.map(entry => entry.status);
  if (statuses.some(status => status === 'Rejected')) return 'Rejected';
  if (statuses.some(status => status === 'Pending')) return 'Pending';
  if (statuses.some(status => status === 'Submitted')) return 'Submitted';
  return 'Approved';
}
function ensureEditable(entries) {
  if (entries.some(entry => ['Submitted', 'Approved'].includes(entry.status))) { const error = new Error('Submitted or approved timesheets cannot be changed.'); error.status = 409; throw error; }
}
function serializeSummary(summary) {
  return summary ? { id: summary.id, weekStart: summary.weekStart, statusReport: summary.statusReport || '', projectId: summary.projectId || null, projectName: summary.projectName || null, createdAt: summary.createdAt, updatedAt: summary.updatedAt } : null;
}

function clientDateIsActive(client, today) {
  const start = client.start_date ? new Date(`${client.start_date}T00:00:00.000Z`) : null;
  const end = client.end_date ? new Date(`${client.end_date}T23:59:59.999Z`) : null;
  return (!start || start <= today) && (!end || end >= today);
}

async function resolveTimesheetClient(employee) {
  const clients = await WorkClientDetail.findAll({
    where: { employee_id: employee.employee_id, type: 'client' },
    attributes: ['id', 'name', 'start_date', 'end_date'],
    order: [['start_date', 'DESC'], ['id', 'DESC']],
  });
  const active = clients.filter(client => client.name?.trim() && clientDateIsActive(client, new Date()));
  const uniqueNames = [...new Set(active.map(client => client.name.trim()))];
  if (uniqueNames.length === 1) return { state: 'assigned', name: uniqueNames[0] };
  if (uniqueNames.length > 1) return { state: 'multiple', name: null };
  // Preserve compatibility for older employee records created before detailed
  // Work Info client rows existed, without overriding an ambiguous Work Info set.
  if (!clients.length && employee.clientName?.trim()) return { state: 'assigned', name: employee.clientName.trim(), legacy: true };
  return { state: 'missing', name: null };
}

function requireTimesheetClient(context) {
  if (context.state === 'assigned') return context.name;
  const error = new Error(context.state === 'multiple'
    ? 'Multiple active clients are assigned in Work Info. Please contact HR to set one active client before submitting a timesheet.'
    : 'No client is currently assigned in Work Info. Please contact HR before submitting a timesheet.');
  error.status = 400;
  throw error;
}
async function employeeProject(employeeId, projectId) {
  const project = await WorkClientDetail.findOne({ where: { id: projectId, employee_id: employeeId, type: 'project' } });
  if (!project) { const error = new Error('Selected project is not available to this employee.'); error.status = 400; throw error; }
  return project;
}
async function loadWeek(employeeId, weekStart, transaction) {
  const keys = weekDateKeys(weekStart);
  const [entries, weeklySummary] = await Promise.all([
    TimesheetEntry.findAll({ where: { employee_id: employeeId, dateKey: { [Op.in]: keys } }, order: [['dateKey', 'ASC'], ['id', 'ASC']], transaction }),
    TimesheetWeeklySummary.findOne({ where: { employeeId, weekStart }, transaction }),
  ]);
  return { entries, weeklySummary, keys };
}

// GET /api/timesheet/entries
exports.getEntries = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    const entries = await TimesheetEntry.findAll({ where: { employee_id: employee.employee_id }, order: [['dateKey', 'ASC'], ['id', 'ASC']] });
    res.json({ entries });
  } catch (err) { console.error('[getEntries]', err.message); res.status(err.status || 500).json({ error: err.message }); }
};

// GET /api/timesheet/context
// The client is resolved from the authenticated employee's Work Info and is
// never accepted from a browser payload.
exports.getContext = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    const client = await resolveTimesheetClient(employee);
    res.json({ client });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

exports.getProjects = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    const projects = await WorkClientDetail.findAll({ where: { employee_id: employee.employee_id, type: 'project' }, attributes: ['id', 'name'], order: [['name', 'ASC']] });
    res.json({ projects: projects.map(project => ({ id: project.id, name: project.name })) });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// GET /api/timesheet/weeks/:weekStart
exports.getWeek = async (req, res) => {
  try {
    const weekStart = parseWeekStart(req.params.weekStart);
    if (!weekStart) return res.status(400).json({ error: 'A valid week start date is required.' });
    const employee = await resolveEmployee(req.user.id);
    const { entries, weeklySummary, keys } = await loadWeek(employee.employee_id, weekStart);
    res.json({ weekStart, weekDates: keys, entries, weeklySummary: serializeSummary(weeklySummary), approvalStatus: periodStatus(entries) });
  } catch (err) { console.error('[getWeek]', err.message); res.status(err.status || 500).json({ error: err.message }); }
};

// PUT /api/timesheet/weeks/:weekStart/quick-entry
// totalHours is the desired all-entry total for the supplied day.
exports.saveQuickEntry = async (req, res) => {
  try {
    const weekStart = parseWeekStart(req.params.weekStart);
    const { dateKey, totalHours } = req.body || {};
    if (!weekStart || !weekDateKeys(weekStart).includes(dateKey)) return res.status(400).json({ error: 'dateKey must belong to the selected week.' });
    const requestedHours = parseHours(totalHours, { allowZero: true });
    if (requestedHours === null) return res.status(400).json({ error: `Hours must be a number between 0 and ${MAX_HOURS_PER_DAY}.` });
    const employee = await resolveEmployee(req.user.id);
    const result = await sequelize.transaction(async transaction => {
      const weeklySummary = await TimesheetWeeklySummary.findOne({ where: { employeeId: employee.employee_id, weekStart }, transaction });
      const projectName = String(weeklySummary?.projectName || '').trim();
      if (!projectName) { const error = new Error('Please enter a Project Name before saving weekly hours.'); error.status = 400; throw error; }
      const clientName = requireTimesheetClient(await resolveTimesheetClient(employee));
      const dayEntries = await TimesheetEntry.findAll({ where: { employee_id: employee.employee_id, dateKey }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      ensureEditable(dayEntries);
      const quickEntry = dayEntries.find(entry => entry.entrySource === 'weekly_quick');
      const detailedHours = dayEntries.filter(entry => entry.entrySource !== 'weekly_quick').reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
      if (requestedHours < detailedHours - 0.000001) { const error = new Error(`Daily Total cannot be lower than the existing detailed-entry total of ${detailedHours.toFixed(2)} hours.`); error.status = 400; throw error; }
      const quickHours = Number((requestedHours - detailedHours).toFixed(2));
      let savedQuickEntry = quickEntry || null;
      if (quickEntry) await quickEntry.update({ hours: quickHours, project: projectName, projectId: null, client: clientName, status: quickEntry.status === 'Rejected' ? 'Pending' : quickEntry.status }, { transaction });
      // A quick entry represents the employee's remaining daily total, not a
      // project assignment. entrySource preserves the submission method.
      else if (quickHours > 0) savedQuickEntry = await TimesheetEntry.create({ employee_id: employee.employee_id, dateKey, hours: quickHours, project: projectName, projectId: null, client: clientName, type: 'Project Time', notes: 'Weekly quick entry', entrySource: 'weekly_quick', status: 'Pending' }, { transaction });
      return { entry: savedQuickEntry, detailedHours, dailyTotal: requestedHours };
    });
    res.json(result);
  } catch (err) { console.error('[saveQuickEntry]', err.message); res.status(err.status || 500).json({ error: err.message }); }
};

exports.saveWeeklyDetails = async (req, res) => {
  try {
    const weekStart = parseWeekStart(req.params.weekStart);
    const projectName = String(req.body?.projectName || '').trim();
    if (!weekStart || !projectName) return res.status(400).json({ error: 'Project Name is required.' });
    const employee = await resolveEmployee(req.user.id);
    const clientName = requireTimesheetClient(await resolveTimesheetClient(employee));
    const summary = await sequelize.transaction(async transaction => {
      const { entries, weeklySummary } = await loadWeek(employee.employee_id, weekStart, transaction);
      ensureEditable(entries);
      const values = { projectName, projectId: null };
      const saved = weeklySummary ? await weeklySummary.update(values, { transaction }) : await TimesheetWeeklySummary.create({ employeeId: employee.employee_id, weekStart, ...values }, { transaction });
      await TimesheetEntry.update({ project: projectName, projectId: null, client: clientName }, { where: { employee_id: employee.employee_id, dateKey: { [Op.in]: weekDateKeys(weekStart) }, entrySource: 'weekly_quick' }, transaction });
      return saved;
    });
    res.json({ weeklySummary: serializeSummary(summary), clientName });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

exports.saveWeeklyProject = async (req, res) => {
  try {
    const weekStart = parseWeekStart(req.params.weekStart);
    const projectId = Number(req.body?.projectId);
    if (!weekStart || !Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ error: 'A valid project is required.' });
    const employee = await resolveEmployee(req.user.id);
    const project = await employeeProject(employee.employee_id, projectId);
    const summary = await sequelize.transaction(async transaction => {
      const { entries, weeklySummary } = await loadWeek(employee.employee_id, weekStart, transaction);
      ensureEditable(entries);
      const saved = weeklySummary ? await weeklySummary.update({ projectId }, { transaction }) : await TimesheetWeeklySummary.create({ employeeId: employee.employee_id, weekStart, projectId }, { transaction });
      await TimesheetEntry.update({ project: project.name, projectId }, { where: { employee_id: employee.employee_id, dateKey: { [Op.in]: weekDateKeys(weekStart) }, entrySource: 'weekly_quick' }, transaction });
      return saved;
    });
    res.json({ weeklySummary: serializeSummary(summary), project: { id: project.id, name: project.name } });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// PUT /api/timesheet/weeks/:weekStart/status-report
exports.saveWeeklyStatusReport = async (req, res) => {
  try {
    const weekStart = parseWeekStart(req.params.weekStart);
    if (!weekStart) return res.status(400).json({ error: 'A valid week start date is required.' });
    const statusReport = String(req.body?.statusReport || '').trim();
    const employee = await resolveEmployee(req.user.id);
    const summary = await sequelize.transaction(async transaction => {
      const { entries, weeklySummary } = await loadWeek(employee.employee_id, weekStart, transaction);
      ensureEditable(entries);
      if (weeklySummary) { await weeklySummary.update({ statusReport: statusReport || null }, { transaction }); return weeklySummary; }
      return TimesheetWeeklySummary.create({ employeeId: employee.employee_id, weekStart, statusReport: statusReport || null }, { transaction });
    });
    res.json({ weeklySummary: serializeSummary(summary) });
  } catch (err) { console.error('[saveWeeklyStatusReport]', err.message); res.status(err.status || 500).json({ error: err.message }); }
};

// POST /api/timesheet/entries/submit
// Body: { entries: [{ dbId?, dateKey, hours, project, client, role, type, notes, entrySource? }], weekStart? }
exports.submitEntries = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    const { entries, weekStart: suppliedWeekStart } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'No entries provided' });
    const weekStart = suppliedWeekStart ? parseWeekStart(suppliedWeekStart) : null;
    const permittedDates = weekStart ? new Set(weekDateKeys(weekStart)) : null;
    const clientName = requireTimesheetClient(await resolveTimesheetClient(employee));
    const saved = await sequelize.transaction(async transaction => {
      const seenDbIds = new Set();
      const normalized = entries.map(entry => {
        const hours = parseHours(entry.hours);
        if (!entry.dateKey || hours === null) { const error = new Error(`Each entry must contain valid hours between 0 and ${MAX_HOURS_PER_DAY}.`); error.status = 400; throw error; }
        if (permittedDates && !permittedDates.has(entry.dateKey)) { const error = new Error('An entry does not belong to the selected week.'); error.status = 400; throw error; }
        if (entry.dbId && seenDbIds.has(String(entry.dbId))) { const error = new Error('Duplicate timesheet entry submitted.'); error.status = 400; throw error; }
        if (entry.dbId) seenDbIds.add(String(entry.dbId));
        const type = entry.type || 'Project Time';
        const project = type === 'Time Off' ? (entry.project || null) : String(entry.project || '').trim();
        if (type !== 'Time Off' && !project) { const error = new Error('Project Name is required for Project Time entries.'); error.status = 400; throw error; }
        return { ...entry, hours, type, project };
      });
      const submittedWeekStarts = [...new Set(normalized.map(entry => parseWeekStart(entry.dateKey)))];
      const summaries = await TimesheetWeeklySummary.findAll({ where: { employeeId: employee.employee_id, weekStart: { [Op.in]: submittedWeekStarts } }, transaction, lock: transaction.LOCK.UPDATE });
      const summaryByWeek = new Map(summaries.map(summary => [summary.weekStart, summary]));
      for (const submittedWeekStart of submittedWeekStarts) {
        if (!summaryByWeek.get(submittedWeekStart)?.statusReport?.trim()) { const error = new Error('Weekly Status Report is required before submitting the timesheet for approval.'); error.status = 400; throw error; }
      }
      const existing = await TimesheetEntry.findAll({ where: { employee_id: employee.employee_id, dateKey: { [Op.in]: [...new Set(normalized.map(entry => entry.dateKey))] } }, transaction, lock: transaction.LOCK.UPDATE });
      const existingById = new Map(existing.map(entry => [String(entry.id), entry]));
      for (const entry of normalized) {
        if (entry.dbId) {
          const stored = existingById.get(String(entry.dbId));
          if (!stored || !EDITABLE_STATUSES.has(stored.status)) { const error = new Error('Only pending or rejected timesheet entries can be submitted.'); error.status = 409; throw error; }
        }
      }
      for (const dateKey of new Set(normalized.map(entry => entry.dateKey))) {
        const submittedIds = new Set(normalized.filter(entry => entry.dateKey === dateKey && entry.dbId).map(entry => String(entry.dbId)));
        const submittedHours = normalized.filter(entry => entry.dateKey === dateKey).reduce((sum, entry) => sum + entry.hours, 0);
        const retainedHours = existing.filter(entry => entry.dateKey === dateKey && !submittedIds.has(String(entry.id))).reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
        if (submittedHours + retainedHours > MAX_HOURS_PER_DAY + 0.000001) { const error = new Error(`Maximum ${MAX_HOURS_PER_DAY} hours allowed for ${dateKey}.`); error.status = 400; throw error; }
      }
      const persisted = [];
      for (const entry of normalized) {
        if (entry.dbId) {
          const stored = existingById.get(String(entry.dbId));
          await stored.update({ status: 'Submitted', project: entry.project || stored.project, client: clientName }, { transaction });
          persisted.push(stored);
        } else {
          persisted.push(await TimesheetEntry.create({ employee_id: employee.employee_id, dateKey: entry.dateKey, hours: entry.hours, project: entry.project || null, client: clientName, role: entry.role || null, type: entry.type || null, notes: entry.notes || null, entrySource: entry.entrySource === 'weekly_quick' ? 'weekly_quick' : 'detailed', status: 'Submitted' }, { transaction }));
        }
      }
      return persisted;
    });
    res.json({ saved });
  } catch (err) { console.error('[submitEntries]', err.message); res.status(err.status || 500).json({ error: err.message }); }
};
