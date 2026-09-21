// Employee controller for PostgreSQL using Sequelize
const Employee = require('../models/employee');
const Spouse = require('../models/spouse');
const Kid = require('../models/kid');
const Emergency = require('../models/emergency');
const Document = require('../models/document');

const validatePersonalIdentifiers = (employeeData, spouse, kids) => {
    const people = [
        { label: 'Employee', ssn: employeeData.ssn, passportNumber: employeeData.passportNumber || employeeData.passport_number },
        ...(spouse ? [{ label: 'Spouse', ssn: spouse.ssn, passportNumber: spouse.passportNumber || spouse.passport_number }] : []),
        ...(Array.isArray(kids) ? kids.map((kid, index) => ({
            label: `Kid ${index + 1}`,
            ssn: kid.ssn,
            passportNumber: kid.passportNumber || kid.passport_number,
        })) : []),
    ];

    for (const person of people) {
        if (person.ssn != null && person.ssn !== '' && !/^[0-9]{9}$/.test(String(person.ssn))) {
            return `${person.label} SSN must contain exactly 9 numeric digits.`;
        }
        if (person.passportNumber != null && person.passportNumber !== '' && !/^[A-Za-z0-9]+$/.test(String(person.passportNumber))) {
            return `${person.label} passport number must contain letters and numbers only.`;
        }
    }
    return '';
};

// Get employee by ID (with spouse, kids, documents)
exports.getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [Spouse, Kid, Document]
        });
        if (!employee) return res.status(404).json({ error: 'Not found' });
        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create new employee (with spouse, kids, documents)
exports.createEmployee = async (req, res) => {
    const { spouse, kids, documents, ...employeeData } = req.body;
    const validationError = validatePersonalIdentifiers(employeeData, spouse, kids);
    if (validationError) return res.status(400).json({ error: validationError });
    const t = await Employee.sequelize.transaction();
    try {
        const employee = await Employee.create(employeeData, { transaction: t });
        if (spouse) await Spouse.create({ ...spouse, employee_id: employee.employee_id }, { transaction: t });
        if (Array.isArray(kids)) {
            for (const kid of kids) {
                await Kid.create({ ...kid, employee_id: employee.employee_id }, { transaction: t });
            }
        }
        if (Array.isArray(documents)) {
            for (const doc of documents) {
                await Document.create({ ...doc, employee_id: employee.employee_id }, { transaction: t });
            }
        }
        await t.commit();
        const result = await Employee.findByPk(employee.employee_id, { include: [Spouse, Kid, Document] });
        res.status(201).json(result);
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
};

// Update employee (with spouse, kids, documents)
exports.updateEmployee = async (req, res) => {
    const { spouse, kids, documents, ...employeeData } = req.body;
    const validationError = validatePersonalIdentifiers(employeeData, spouse, kids);
    if (validationError) return res.status(400).json({ error: validationError });
    const t = await Employee.sequelize.transaction();
    try {
        const [updated] = await Employee.update(employeeData, { where: { employee_id: req.params.id }, transaction: t });
        if (!updated) {
            await t.rollback();
            return res.status(404).json({ error: 'Not found' });
        }
        // Upsert spouse
        if (spouse) {
            const [spouseInstance] = await Spouse.findOrCreate({ where: { employee_id: req.params.id }, defaults: { ...spouse, employee_id: req.params.id }, transaction: t });
            await spouseInstance.update(spouse, { transaction: t });
        }
        // Replace kids
        if (Array.isArray(kids)) {
            await Kid.destroy({ where: { employee_id: req.params.id }, transaction: t });
            for (const kid of kids) {
                await Kid.create({ ...kid, employee_id: req.params.id }, { transaction: t });
            }
        }
        // Replace documents
        if (Array.isArray(documents)) {
            await Document.destroy({ where: { employee_id: req.params.id }, transaction: t });
            for (const doc of documents) {
                await Document.create({ ...doc, employee_id: req.params.id }, { transaction: t });
            }
        }
        await t.commit();
        const result = await Employee.findByPk(req.params.id, { include: [Spouse, Kid, Document] });
        res.json(result);
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
    try {
        const deleted = await Employee.destroy({ where: { employee_id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
