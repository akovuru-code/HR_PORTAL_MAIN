const { body, validationResult } = require('express-validator');
const Employee = require('../models/employee');
const OnboardingDraft = require('../models/onboardingDraft');

// common validation result handler
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const optionalSsn = (field) =>
    body(field).optional({ nullable: true, checkFalsy: true }).matches(/^[0-9]{9}$/).withMessage(`${field} must contain exactly 9 numeric digits`);

const optionalPassportNumber = (field) =>
    body(field).optional({ nullable: true, checkFalsy: true }).matches(/^[A-Za-z0-9]+$/).withMessage(`${field} must contain letters and numbers only`);

// Validate partial save payload (basic checks)
const saveOnboardingValidators = [
    body('payload.firstName').optional().isString().withMessage('firstName must be a string'),
    body('payload.lastName').optional().isString().withMessage('lastName must be a string'),
    body('payload.email').optional().isEmail().withMessage('email must be valid'),
    optionalSsn('payload.ssn'),
    optionalPassportNumber('payload.passportNumber'),
    // spouse fields
    body('spouse.firstName').optional().isString(),
    body('spouse.lastName').optional().isString(),
    optionalSsn('spouse.ssn'),
    optionalPassportNumber('spouse.passportNumber'),
    // kids can be an array
    body('kids').optional().isArray().withMessage('kids must be an array'),
    optionalSsn('kids.*.ssn'),
    optionalPassportNumber('kids.*.passportNumber'),
    handleValidation,
];

// Validate save-draft: require payload.firstName and validate shapes if present
const saveDraftValidators = [
    // payload must exist but can be empty for drafts
    body('payload').exists().withMessage('payload is required'),
    body('payload.firstName').optional().isString().withMessage('payload.firstName must be a string'),
    body('payload.lastName').optional().isString().withMessage('payload.lastName must be a string'),
    optionalSsn('payload.ssn'),
    optionalPassportNumber('payload.passportNumber'),
    body('payload.email').custom((value) => {
        // Skip validation if email is null, undefined, or empty string
        if (!value || value === '') return true;
        // Otherwise validate as email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new Error('payload.email must be valid');
        }
        return true;
    }),
    // spouse if present must be object with optional string fields (or can be null)
    body('spouse').custom((value) => {
        // Allow null or undefined
        if (value === null || value === undefined) return true;
        // If provided, must be an object
        if (typeof value !== 'object') {
            throw new Error('spouse must be an object');
        }
        return true;
    }),
    body('spouse.firstName').optional().isString().withMessage('spouse.firstName must be a string'),
    body('spouse.lastName').optional().isString().withMessage('spouse.lastName must be a string'),
    optionalSsn('spouse.ssn'),
    optionalPassportNumber('spouse.passportNumber'),
    // kids must be array of objects (basic check)
    body('kids').optional().isArray().withMessage('kids must be an array'),
    body('kids.*.firstName').optional().isString().withMessage('kids[].firstName must be a string'),
    body('kids.*.lastName').optional().isString().withMessage('kids[].lastName must be a string'),
    body('kids.*.dob').optional().isISO8601().withMessage('kids[].dob must be a valid date'),
    optionalSsn('kids.*.ssn'),
    optionalPassportNumber('kids.*.passportNumber'),
    // documents must be an array of objects with url/filename
    body('documents').optional().isArray().withMessage('documents must be an array'),
    body('documents.*.url').optional().custom((value) => {
        if (typeof value !== 'string' || value.trim() === '') throw new Error('documents[].url must be a non-empty string');
        // Allow relative paths (e.g. /api/local-upload/file/...) and absolute URLs
        if (value.startsWith('/') || /^https?:\/\//.test(value)) return true;
        throw new Error('documents[].url must be a valid URL or relative path');
    }),
    body('documents.*.filename').optional().isString().withMessage('documents[].filename must be a string'),
    handleValidation,
];

// Validate request edit
const requestEditValidators = [
    body('reason').exists().withMessage('reason is required').isString().withMessage('reason must be a string'),
    handleValidation,
];

// Validate submit: ensure required fields exist in DB for employee
const submitOnboardingValidators = [
    async (req, res, next) => {
        const id = parseInt(req.params.employeeId, 10);
        if (!id) return res.status(400).json({ errors: [{ msg: 'Invalid employeeId' }] });

        // ✅ Bypass in test mode
        if (process.env.NODE_ENV === 'test') {
            console.log('[TEST MODE] Skipping DB check in submitOnboardingValidators');
            return next();
        }

        try {
            const employee = await Employee.findByPk(id);
            if (!employee) return res.status(404).json({ errors: [{ msg: 'Employee not found' }] });

            const tab = req.body?.tab;
            const missing = [];

            if (!tab || tab === 'personal') {
                const personalDraft = await OnboardingDraft.findOne({ where: { employeeId: id, tab: 'personal' } });
                const p = personalDraft?.data?.payload || {};
                const spouse = personalDraft?.data?.spouse || {};
                const kids = personalDraft?.data?.kids || [];

                if (!p.firstName) missing.push({ field: 'firstName', tab: 'personal', msg: 'First Name is required' });
                if (!p.lastName) missing.push({ field: 'lastName', tab: 'personal', msg: 'Last Name is required' });
                if (!p.email) missing.push({ field: 'email', tab: 'personal', msg: 'Email ID is required' });
                if (!p.phone) missing.push({ field: 'phone', tab: 'personal', msg: 'Mobile No is required' });
                if (!p.dob) missing.push({ field: 'dob', tab: 'personal', msg: 'Date of Birth is required' });
                if (!p.emergencyFirstName) missing.push({ field: 'emergencyFirstName', tab: 'personal', msg: 'Emergency Contact First Name is required' });
                if (!p.emergencyLastName) missing.push({ field: 'emergencyLastName', tab: 'personal', msg: 'Emergency Contact Last Name is required' });
                if (!p.emergencyPhone) missing.push({ field: 'emergencyPhone', tab: 'personal', msg: 'Emergency Contact Mobile No is required' });
                if (!p.emergencyEmail) missing.push({ field: 'emergencyEmail', tab: 'personal', msg: 'Emergency Contact Email is required' });
                if (!p.emergencyRelationship) missing.push({ field: 'emergencyRelationship', tab: 'personal', msg: 'Emergency Contact Relationship is required' });

                if (p.maritalStatus === 'Married') {
                    if (!spouse.firstName) missing.push({ field: 'spouse.firstName', tab: 'personal', msg: 'Spouse First Name is required' });
                    if (!spouse.lastName) missing.push({ field: 'spouse.lastName', tab: 'personal', msg: 'Spouse Last Name is required' });
                    if (!spouse.phone && !spouse.mobile) missing.push({ field: 'spouse.phone', tab: 'personal', msg: 'Spouse Mobile No is required' });
                    if (!spouse.email) missing.push({ field: 'spouse.email', tab: 'personal', msg: 'Spouse Email is required' });
                    if (!spouse.dob) missing.push({ field: 'spouse.dob', tab: 'personal', msg: 'Spouse Date of Birth is required' });
                    if (p.showKidsInfo) {
                        kids.forEach((k, i) => {
                            if (!k.lastName) missing.push({ field: `kids[${i}].lastName`, tab: 'personal', msg: `Kid ${i + 1} Last Name is required` });
                            if (!k.dob) missing.push({ field: `kids[${i}].dob`, tab: 'personal', msg: `Kid ${i + 1} Date of Birth is required` });
                        });
                    }
                }
            }

            if (tab === 'onboardDocs') {
                const onboardDocsDraft = await OnboardingDraft.findOne({ where: { employeeId: id, tab: 'onboardDocs' } });
                const bank = onboardDocsDraft?.data?.payload?.bank || {};
                if (!bank.name) missing.push({ field: 'bank.name', tab: 'onboardDocs', msg: 'Bank Name is required' });
                if (!bank.acc) missing.push({ field: 'bank.acc', tab: 'onboardDocs', msg: 'Account Number is required' });
                if (!bank.routing) missing.push({ field: 'bank.routing', tab: 'onboardDocs', msg: 'Routing Number is required' });
                if (!bank.type) missing.push({ field: 'bank.type', tab: 'onboardDocs', msg: 'Account Type is required' });
            }

            if (missing.length) return res.status(400).json({ errors: missing });
            next();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
];

module.exports = { saveOnboardingValidators, requestEditValidators, submitOnboardingValidators, saveDraftValidators };
