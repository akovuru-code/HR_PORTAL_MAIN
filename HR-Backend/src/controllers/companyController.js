const path = require('path');
const fs = require('fs');
const Company = require('../models/company');
const CompanySettings = require('../models/companySettings');
const CompanyJob = require('../models/companyJob');
const Employee = require('../models/employee');

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
    return user?.role?.toLowerCase() === 'admin';
}

function required(value) {
    return typeof value === 'string' && value.trim().length > 0;
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
    if (!requireAdmin(req, res)) return;
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
    if (!requireAdmin(req, res)) return;
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
    try { res.status(201).json({ job: await CompanyJob.create(req.body) }); } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateJob = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (![req.body.role, req.body.technology, req.body.experience].every(required)) return res.status(400).json({ error: 'Role, technology and experience are required' });
    try {
        const job = await CompanyJob.findByPk(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        await job.update({ role: req.body.role, technology: req.body.technology, experience: req.body.experience });
        res.json({ job });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteJob = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const deleted = await CompanyJob.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Job not found' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.uploadLogo = async (req, res) => {
    if (!requireAdmin(req, res)) return;
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