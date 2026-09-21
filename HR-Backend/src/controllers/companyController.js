const path = require('path');
const fs = require('fs');
const Company = require('../models/company');
const CompanySettings = require('../models/companySettings');
const CompanyJob = require('../models/companyJob');
const Employee = require('../models/employee');
const BenchCandidate = require('../models/benchCandidate');
const { Op } = require('sequelize');
const { accountType } = require('../middleware/authorization');
const { consumeDeleteApproval, consumeEditApproval } = require('../services/deleteAuthorizationService');
const { createJobOpeningNotifications } = require('../services/adminNotificationService');

const defaultcompanieslogo = [
    {
        name: 'Siritek Inc',
        logoUrl: '/uploads/companylogo/siritek.png'
    },
    {
        name: 'Gannusoftware',
        logoUrl: '/uploads/companylogo/gannusoftware.png'
    },
    {
        name: 'Savvyinfosystems',
        logoUrl: '/uploads/companylogo/savvyinfosystems.png'
    },
    {
        name: 'Globalinfotech Inc',
        logoUrl: '/uploads/companylogo/globalinfotech.png'
    }
];
const defaultSettings = {
    description: 'We believe growth comes from embracing change with purpose. As technology evolves, so do we.\nThrough continuous learning and personalized training, we empower our people to innovate, grow, and shape the future.\n\nGuided by integrity, excellence, and strong partnerships,\nWe don\'t just adapt to change—we engineer it.',
    contactEmail: 'contact@company.com',
    contactPhone: '847-956-3381',
    headquarters: '120 W. Golf Road\nSuite 212\nSchaumburg, IL 60195\nCall: +1(847)-956-3381',
    canadaOffice: '7030 Woodbine Avenue\nSuite 500\nMarkham, Ontario\nL3R6G2, Canada\nCall:+1(905)-205-0872',
    indiaOffice: '1-182/44/173, Madhavnagar\nMiyapur, Hyderabad\nTelangana 500049, India\nCall: +91 9959933315',
};
const defaultJobs = [
    { role: 'AWS Cloud Engineer', technology: 'AWS, Cloud, API', experience: '3' },
    { role: 'Software Quality Assurance Engineer - II', technology: 'Selenium, Python', experience: '5' },
    { role: 'Senior Software Engineer', technology: 'Python, Java', experience: '7' },
];

function isAdmin(user) {
    return ['root_admin', 'admin'].includes(accountType(user));
}

function required(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function employeeName(employee) {
    return [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.name || 'Not Available';
}

function employeeLocation(employee) {
    const address = employee?.presentAddress && typeof employee.presentAddress === 'object' ? employee.presentAddress : {};
    return [address.city, address.country].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(', ') || 'Not Available';
}

function formatDob(value) {
    const dateOnly = value instanceof Date
        ? `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
        : String(value || '').slice(0, 10);
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[2]}/${match[3]}/${match[1]}` : 'Not Available';
}

function benchCandidateJson(candidate, employee) {
    return {
        id: candidate.id,
        employeeId: candidate.employee_id,
        employeeName: employeeName(employee),
        company: employee?.presentEmployer || 'Not Available',
        visaType: employee?.visaType || 'Not Available',
        location: employeeLocation(employee),
        dateOfBirth: formatDob(employee?.dob),
        contactNo: employee?.phone || 'Not Available',
        employeeEmail: employee?.email || null,
        resumeAvailable: Boolean(candidate.resume_filename),
        resumeOriginalName: candidate.resume_original_name || null,
        resumeUploadedAt: candidate.resume_uploaded_at || null,
    };
}

function removeUploadedResume(file) {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
}

exports.seedCompanyData = async () => {
    if (await Company.count() === 0) { await Company.bulkCreate(defaultcompanieslogo); }
    if (await CompanySettings.count() === 0) await CompanySettings.create(defaultSettings);
    if (await CompanyJob.count() === 0) await CompanyJob.bulkCreate(defaultJobs);
};

exports.getCompany = async (req, res) => {
    try {
        const enrichLogo = (c) => {
            const company = c.toJSON();
            if (!company.logoUrl) {
                const def = defaultcompanieslogo.find(
                    d => d.name === company.name
                );
                if (def) { company.logoUrl = def.logoUrl; }
            }
            return company;
        };

        let company;
        let companyList = [];
        if (isAdmin(req.user)) {
            const companies = await Company.findAll({ order: [['id', 'ASC']] });
            companyList = companies.map(enrichLogo);
            if (req.query.companyId) {
                company = companyList.find(c => c.id == req.query.companyId);
            }
            if (!company && companyList.length > 0) {
                company = companyList[0];
            }
        } else {
            if (!req.user.employeeId) return res.status(404).json({ error: 'Employee not found' });
            const employee = await Employee.findByPk(req.user.employeeId, { attributes: ['presentEmployer'] });
            if (!employee?.presentEmployer) return res.status(404).json({ error: 'Company not found' });
            company = await Company.findOne({ where: { name: employee.presentEmployer } });
            if (company) company = enrichLogo(company);
        }
        if (!company) return res.status(404).json({ error: 'Company not found' });
        const settings = await CompanySettings.findOne({ order: [['id', 'ASC']] });
        const jobs = await CompanyJob.findAll({ order: [['id', 'ASC']] });
        res.json({ company, settings, jobs, companyList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function requireAdmin(req, res) {
    if (!isAdmin(req.user)) {
        res.status(403).json({ error: 'Admin access required' });
        return false;
    }
    return true;
}

exports.updateSettings = async (req, res) => {
    const { description, contactEmail, contactPhone, headquarters, canadaOffice, indiaOffice } = req.body;
    if (![description, contactEmail, contactPhone, headquarters, canadaOffice, indiaOffice].every(required)) return res.status(400).json({ error: 'All company settings are required' });
    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) return res.status(400).json({ error: 'Invalid email' });
    try {
        const settings = await CompanySettings.findOne({ order: [['id', 'ASC']] });
        await settings.update({ description, contactEmail, contactPhone, headquarters, canadaOffice, indiaOffice });
        res.json({ settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCompany = async (req, res) => {
    if (!required(req.body.name)) return res.status(400).json({ error: 'Company name is required' });
    try {
        const company = await Company.findByPk(req.params.companyId);
        if (!company) return res.status(404).json({ error: 'Company not found' });
        const oldName = company.name;
        const newName = req.body.name.trim();
        await company.update({ name: newName, ...(req.body.logoUrl !== undefined ? { logoUrl: req.body.logoUrl } : {}) });
        if (oldName !== newName) await Employee.update({ presentEmployer: newName }, { where: { presentEmployer: oldName } });
        res.json({ company });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.createJob = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (![req.body.role, req.body.technology, req.body.experience].every(required)) return res.status(400).json({ error: 'Role, technology and experience are required' });
    try {
        const job = await CompanyJob.sequelize.transaction(async transaction => {
            const created = await CompanyJob.create(req.body, { transaction });
            // A notification is written only after the job row exists, and
            // the transaction prevents a persisted job without its HR alerts.
            await createJobOpeningNotifications({ job: created, creator: req.user, transaction });
            return created;
        });
        res.status(201).json({ job });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateJob = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (![req.body.role, req.body.technology, req.body.experience].every(required)) return res.status(400).json({ error: 'Role, technology and experience are required' });
    try {
        const job = await CompanyJob.findByPk(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        await job.update({ role: req.body.role, technology: req.body.technology, experience: req.body.experience });
        await consumeEditApproval(req, 'company_job', req.params.id);
        res.json({ job });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteJob = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const deleted = await CompanyJob.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Job not found' });
        await consumeDeleteApproval(req, 'company_job', req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.uploadLogo = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No logo uploaded' });
    try {
        const company = await Company.findByPk(req.body.companyId);
        if (!company) return res.status(404).json({ error: 'Company not found' });
        const logoUrl = `/api/company/logo/file/${company.id}/${req.file.filename}`;
        await company.update({ logoUrl });
        res.json({ company });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getLogo = (req, res) => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'company', req.params.companyId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.sendFile(filePath);
};

exports.listBenchCandidates = async (_req, res) => {
    try {
        const candidates = await BenchCandidate.findAll({ order: [['created_at', 'DESC'], ['id', 'DESC']] });
        const employeeIds = candidates.map(candidate => candidate.employee_id);
        const employees = employeeIds.length ? await Employee.findAll({
            where: { employee_id: { [Op.in]: employeeIds } },
            attributes: ['employee_id', 'firstName', 'lastName', 'name', 'email', 'presentEmployer', 'visaType', 'presentAddress', 'dob', 'phone'],
        }) : [];
        const employeeById = new Map(employees.map(employee => [employee.employee_id, employee]));
        res.json({ candidates: candidates.map(candidate => benchCandidateJson(candidate, employeeById.get(candidate.employee_id))) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.listBenchCandidateEmployees = async (req, res) => {
    try {
        const query = String(req.query.query || '').trim();
        const where = query ? {
            [Op.or]: [
                { firstName: { [Op.iLike]: `%${query}%` } },
                { lastName: { [Op.iLike]: `%${query}%` } },
                { name: { [Op.iLike]: `%${query}%` } },
            ],
        } : undefined;
        const employees = await Employee.findAll({ where, attributes: ['employee_id', 'firstName', 'lastName', 'name'], order: [['firstName', 'ASC'], ['lastName', 'ASC'], ['name', 'ASC']] });
        res.json({ employees: employees.map(employee => ({ id: employee.employee_id, name: employeeName(employee) })) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getBenchCandidateEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.employeeId);
        if (!Number.isInteger(employeeId)) return res.status(400).json({ error: 'A valid employee is required' });
        const employee = await Employee.findByPk(employeeId, { attributes: ['employee_id', 'firstName', 'lastName', 'name', 'email', 'presentEmployer', 'visaType', 'presentAddress', 'dob', 'phone'] });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json({ employee: { id: employee.employee_id, name: employeeName(employee), company: employee.presentEmployer || 'Not Available', visaType: employee.visaType || 'Not Available', location: employeeLocation(employee), dateOfBirth: formatDob(employee.dob), contactNo: employee.phone || 'Not Available' } });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBenchCandidate = async (req, res) => {
    try {
        const employeeId = Number(req.body?.employeeId);
        if (!Number.isInteger(employeeId)) return res.status(400).json({ error: 'Select an existing employee.' });
        const employee = await Employee.findByPk(employeeId, { attributes: ['employee_id', 'firstName', 'lastName', 'name', 'email', 'presentEmployer', 'visaType', 'presentAddress', 'dob', 'phone'] });
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });
        if (await BenchCandidate.findOne({ where: { employee_id: employeeId } })) return res.status(409).json({ error: 'Employee is already added to Bench Candidates.' });
        const candidate = await BenchCandidate.create({ employee_id: employeeId });
        res.status(201).json({ candidate: benchCandidateJson(candidate, employee) });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Employee is already added to Bench Candidates.' });
        res.status(500).json({ error: err.message });
    }
};

exports.deleteBenchCandidate = async (req, res) => {
    try {
        const candidate = await BenchCandidate.findByPk(req.params.id);
        if (!candidate) return res.status(404).json({ error: 'Bench Candidate not found.' });
        await candidate.destroy();
        await consumeDeleteApproval(req, 'bench_candidate', req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.uploadBenchCandidateResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Select a PDF, DOC, or DOCX resume to upload.' });
        const candidate = await BenchCandidate.findByPk(req.params.id);
        if (!candidate) {
            removeUploadedResume(req.file);
            return res.status(404).json({ error: 'Bench Candidate not found.' });
        }
        try {
            await candidate.update({
                resume_filename: req.file.filename,
                resume_original_name: req.file.originalname,
                resume_mime_type: req.file.mimetype,
                resume_uploaded_at: new Date(),
            });
        } catch (err) {
            removeUploadedResume(req.file);
            throw err;
        }
        res.json({
            resumeAvailable: true,
            resumeOriginalName: candidate.resume_original_name,
            resumeUploadedAt: candidate.resume_uploaded_at,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.previewBenchCandidateResume = async (req, res) => {
    try {
        const candidate = await BenchCandidate.findByPk(req.params.id);
        if (!candidate) return res.status(404).json({ error: 'Bench Candidate not found.' });
        if (!candidate.resume_filename) return res.status(404).json({ error: 'No resume has been uploaded for this Bench Candidate.' });
        const filename = path.basename(candidate.resume_filename);
        if (filename !== candidate.resume_filename) return res.status(404).json({ error: 'Resume file not found.' });
        const filePath = path.join(__dirname, '..', '..', 'uploads', 'bench-candidates', String(candidate.id), filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Resume file not found.' });
        res.setHeader('Content-Type', candidate.resume_mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${String(candidate.resume_original_name || filename).replace(/["\\r\\n]/g, '_')}"`);
        res.sendFile(filePath);
    } catch (err) { res.status(500).json({ error: err.message }); }
};
