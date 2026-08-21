const Employee = require('../models/employee');
const Spouse = require('../models/spouse');
const Kid = require('../models/kid');
const Document = require('../models/document');
const Emergency = require('../models/emergency');
const EditRequest = require('../models/editRequest');
const AuditLog = require('../models/auditLog');
const OnboardingDraft = require('../models/onboardingDraft');
const RoleSection = require('../models/roleSection');
const ResumeUpload = require('../models/resumeUpload');
const CvUpload = require('../models/cvUpload');
const EducationModel = require('../models/education');
const EducationUpload = require('../models/educationUpload');
const Certification = require('../models/certification');
const Evaluation = require('../models/evaluation');
const WorkEmployer = require('../models/workEmployer');
const WorkClientDetail = require('../models/workClientDetail');

// Associations for role sections
RoleSection.hasMany(ResumeUpload, { foreignKey: 'role_section_id', as: 'resumeUploads' });
RoleSection.hasMany(CvUpload, { foreignKey: 'role_section_id', as: 'cvUploads' });
ResumeUpload.belongsTo(RoleSection, { foreignKey: 'role_section_id' });
CvUpload.belongsTo(RoleSection, { foreignKey: 'role_section_id' });

// Associations for education
EducationModel.hasMany(EducationUpload, { foreignKey: 'education_id', as: 'uploads' });
EducationModel.hasMany(Certification, { foreignKey: 'education_id', as: 'certifications' });
EducationUpload.belongsTo(EducationModel, { foreignKey: 'education_id' });
Certification.belongsTo(EducationModel, { foreignKey: 'education_id' });

// Associations for evaluations
Employee.hasMany(Evaluation, { foreignKey: 'employee_id', as: 'evaluations' });
Evaluation.belongsTo(Employee, { foreignKey: 'employee_id' });

// Set up associations
Employee.hasOne(Spouse, { foreignKey: 'employee_id' });
Employee.hasMany(Kid, { foreignKey: 'employee_id' });
Employee.hasMany(Document, { foreignKey: 'employee_id' });
Spouse.belongsTo(Employee, { foreignKey: 'employee_id' });
Kid.belongsTo(Employee, { foreignKey: 'employee_id' });
Document.belongsTo(Employee, { foreignKey: 'employee_id' });

// Helpers
function isAdmin(user) {
    return user && (user.role === 'admin' || user.role === 'hr');
}

// GET /api/onboarding/:employeeId
exports.getOnboarding = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10); // Parse as integer
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Access control: employees can only view their own
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const employee = await Employee.findByPk(id, { include: [Spouse, Kid, Document] });
        const drafts = await OnboardingDraft.findAll({ where: { employeeId: id } });
        const roleSections = await RoleSection.findAll({
            where: { employee_id: id },
            include: [
                { model: ResumeUpload, as: 'resumeUploads' },
                { model: CvUpload, as: 'cvUploads' },
            ],
            order: [['role_section_id', 'ASC']],
        });
        const educations = await EducationModel.findAll({
            where: { employee_id: id },
            include: [
                { model: EducationUpload, as: 'uploads' },
                { model: Certification, as: 'certifications' },
            ],
            order: [['education_id', 'ASC']],
        });
        const evaluations = await Evaluation.findAll({
            where: { employee_id: id },
            order: [['evaluation_id', 'ASC']],
        });
        const workEmployers = await WorkEmployer.findAll({
            where: { employee_id: id },
            order: [['id', 'ASC']],
        });
        const workClientDetails = await WorkClientDetail.findAll({
            where: { employee_id: id },
            order: [['id', 'ASC']],
        });
        if (!employee && !drafts.length) return res.status(404).json({ error: 'Not found' });
        // Build draft map by tab for backward compat
        const draftMap = {};
        for (const d of drafts) draftMap[d.tab] = d;
        res.json({ employee, draft: draftMap['personal'] || null, drafts: draftMap, roleSections, educations, evaluations, workEmployers, workClientDetails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/onboarding/:employeeId  (partial save)
// Sample body: { tab: 'personal', payload: { firstName: 'A', lastName: 'B' }, spouse: {...}, kids: [...] }
exports.saveOnboarding = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    const { spouse, kids, documents, payload } = req.body;
    const t = await Employee.sequelize.transaction();
    try {
        if (payload && Object.keys(payload).length) {
            console.log('[saveOnboarding] file fields in payload:', {
                passportFile: payload.passportFile || null,
                visaFile: payload.visaFile || null,
                dlFile: payload.dlFile || null,
                marriageCertFile: payload.marriageCertFile || null,
            });
            const [emp, created] = await Employee.findOrCreate({ where: { employee_id: id }, defaults: { ...payload, employee_id: id }, transaction: t });
            if (!created) await emp.update(payload, { transaction: t });
        }
        if (spouse) {
            const spouseData = {
                employee_id: id,
                first_name: spouse.firstName || null,
                middle_name: spouse.middleName || null,
                last_name: spouse.lastName || null,
                email: spouse.email || null,
                phone: spouse.phone || null,
                dob: spouse.dob || null,
                is_spouse_address_same: spouse.isSpouseAddressSame || false,
                nationality: spouse.nationality || null,
                passport_number: spouse.passportNumber || null,
                passport_expiry: spouse.passportExpiry || null,
                occupation: spouse.occupation || null,
                ssn: spouse.ssn || null,
                sin: spouse.sin || null,
                ni: spouse.ni || null,
                tfn: spouse.tfn || null,
                pan: spouse.pan || null,
                aadhaar: spouse.aadhaar || null,
                spouse_visa_type: spouse.visaType || null,
                visa_expiry: spouse.visaExpiry || null,
                driving_license: spouse.drivingLicense || null,
                dl_state: spouse.dlState || null,
                dl_expiry: spouse.dlExpiry || null,
                address: spouse.address || null,
                passportFile: spouse.passportFile || null,
                visaFile: spouse.visaFile || null,
                dlFile: spouse.dlFile || null,
            };
            const [inst] = await Spouse.findOrCreate({ where: { employee_id: id }, defaults: spouseData, transaction: t });
            await inst.update(spouseData, { transaction: t });
        }
        if (Array.isArray(kids) && kids.length) {
            await Kid.destroy({ where: { employee_id: id }, transaction: t });
            for (const k of kids) {
                const kidData = {
                    employee_id: id,
                    first_name: k.firstName || null,
                    middle_name: k.middleName || null,
                    last_name: k.lastName || null,
                    dob: k.dob || null,
                    nationality: k.nationality || null,
                    passport_number: k.passportNumber || null,
                    passport_expiry: k.passportExpiry || null,
                    ssn: k.ssn || null,
                    sin: k.sin || null,
                    ni: k.ni || null,
                    tfn: k.tfn || null,
                    pan: k.pan || null,
                    aadhaar: k.aadhaar || null,
                    visa_type: k.visaType || null,
                    custom_visa_type: k.customVisaType || null,
                    visa_expiry: k.visaExpiry || null,
                    address_same: k.addressSame || false,
                    address: k.address || null,
                    docFile: k.docFile || null,
                };
                await Kid.create(kidData, { transaction: t });
            }
        }
        if (Array.isArray(documents) && documents.length) {
            for (const d of documents) {
                await Document.create({ ...d, employee_id: id }, { transaction: t });
            }
        }
        await t.commit();
        const employee = await Employee.findByPk(id, { include: [Spouse, Kid, Document] });
        res.json({ success: true, employee });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
};

// POST /api/onboarding/:employeeId/submit
// Marks onboarding as submitted
exports.submitOnboarding = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    const t = await Employee.sequelize.transaction();
    try {
        const sectionKey = req.body.sectionKey; // optional: mark only this tab's request as used

        // Load all per-tab drafts for this employee
        const allDrafts = await OnboardingDraft.findAll({ where: { employeeId: id }, transaction: t });
        const draftMap = {};
        for (const d of allDrafts) draftMap[d.tab] = d.data;

        // --- Personal Info (tab: 'personal') ---
        const personal = draftMap['personal'];
        if (personal?.payload) {
            const employeeFields = Object.keys(Employee.rawAttributes);
            const filtered = {};
            for (const [key, val] of Object.entries(personal.payload)) {
                if (employeeFields.includes(key)) filtered[key] = val;
            }
            await Employee.update({ ...filtered }, { where: { employee_id: id }, transaction: t });
        } else {
            // no-op: status update handled after submittedTabs check below
        }
        if (personal?.spouse) {
            const s = personal.spouse;
            const spouseData = {
                employee_id: id,
                first_name: s.firstName || s.first_name || null,
                middle_name: s.middleName || s.middle_name || null,
                last_name: s.lastName || s.last_name || null,
                email: s.email || null, phone: s.phone || null, dob: s.dob || null,
                nationality: s.nationality || null,
                passport_number: s.passportNumber || s.passport_number || null,
                passport_expiry: s.passportExpiry || s.passport_expiry || null,
                occupation: s.occupation || null, ssn: s.ssn || null,
                sin: s.sin || s.sin || null,
                ni: s.ni || s.ni || null,
                tfn: s.tfn || s.tfn || null,
                pan: s.pan || s.pan || null,
                aadhaar: s.aadhaar || s.aadhaar || null,
                spouse_visa_type: s.visaType || s.spouse_visa_type || null,
                visa_expiry: s.visaExpiry || s.visa_expiry || null,
                driving_license: s.drivingLicense || s.driving_license || null,
                dl_state: s.dlState || s.dl_state || null,
                dl_expiry: s.dlExpiry || s.dl_expiry || null,
                is_spouse_address_same: s.isSpouseAddressSame || s.is_spouse_address_same || false,
                address: s.address || null,
                passportFile: s.passportFile || null, visaFile: s.visaFile || null, dlFile: s.dlFile || null,
            };
            const [inst] = await Spouse.findOrCreate({ where: { employee_id: id }, defaults: spouseData, transaction: t });
            await inst.update(spouseData, { transaction: t });
        }
        if (Array.isArray(personal?.kids) && personal.kids.length) {
            await Kid.destroy({ where: { employee_id: id }, transaction: t });
            for (const k of personal.kids) {
                await Kid.create({
                    employee_id: id,
                    first_name: k.firstName || k.first_name || null,
                    middle_name: k.middleName || k.middle_name || null,
                    last_name: k.lastName || k.last_name || null,
                    dob: k.dob || null, nationality: k.nationality || null,
                    passport_number: k.passportNumber || k.passport_number || null,
                    passport_expiry: k.passportExpiry || k.passport_expiry || null,
                    ssn: k.ssn || null, sin: k.sin || null, ni: k.ni || null,
                    tfn: k.tfn || null, pan: k.pan || null,
                    aadhaar: k.aadhaar || null,
                    visa_type: k.visaType || k.visa_type || null,
                    custom_visa_type: k.customVisaType || k.custom_visa_type || null,
                    visa_expiry: k.visaExpiry || k.visa_expiry || null,
                    address_same: k.addressSame || k.address_same || false,
                    address: k.address || null, docFile: k.docFile || null,
                }, { transaction: t });
            }
        }

        // --- Documents (tab: 'documents') ---
        const docsDraft = draftMap['documents'];
        if (Array.isArray(docsDraft?.payload?.docs)) {
            await Document.destroy({ where: { employee_id: id }, transaction: t });
            for (const doc of docsDraft.payload.docs) {
                if (doc.source === 'personal-info') continue;
                await Document.create({
                    employee_id: id,
                    name: doc.name || null, url: doc.file?.url || null,
                    filename: doc.file?.filename || null, originalName: doc.file?.originalName || null,
                    document_type: doc.file?.category || 'document',
                    expiry: doc.expiry || null, modifiedBy: doc.modifiedBy || null,
                    fileData: doc.file || null,
                }, { transaction: t });
            }
        }

        // --- Resume & Skills (tab: 'skills') ---
        const skillsDraft = draftMap['skills'];
        if (Array.isArray(skillsDraft?.payload?.roleSections)) {
            const oldSections = await RoleSection.findAll({ where: { employee_id: id }, attributes: ['role_section_id'], transaction: t });
            const oldIds = oldSections.map(s => s.role_section_id);
            if (oldIds.length) {
                await ResumeUpload.destroy({ where: { role_section_id: oldIds }, transaction: t });
                await CvUpload.destroy({ where: { role_section_id: oldIds }, transaction: t });
            }
            await RoleSection.destroy({ where: { employee_id: id }, transaction: t });
            for (const section of skillsDraft.payload.roleSections) {
                const rs = await RoleSection.create({
                    employee_id: id, role: section.role || '',
                    description: section.description || null, skills: section.skills || null,
                }, { transaction: t });
                const resumeFile = section.resumeFile || (Array.isArray(section.resumeFiles) && section.resumeFiles[0]) || null;
                if (resumeFile) {
                    await ResumeUpload.create({
                        role_section_id: rs.role_section_id,
                        file_name: resumeFile.filename || resumeFile.originalName || resumeFile.name || null,
                        file_type: resumeFile.category || resumeFile.type || null,
                        file_size: resumeFile.size || null, file_url: resumeFile.url || null,
                    }, { transaction: t });
                }
                const cvFile = section.cvFile || (Array.isArray(section.cvFiles) && section.cvFiles[0]) || null;
                if (cvFile) {
                    await CvUpload.create({
                        role_section_id: rs.role_section_id,
                        file_name: cvFile.filename || cvFile.originalName || cvFile.name || null,
                        file_type: cvFile.category || cvFile.type || null,
                        file_size: cvFile.size || null, file_url: cvFile.url || null,
                    }, { transaction: t });
                }
            }
        }

        // --- Education (tab: 'education') ---
        const eduDraft = draftMap['education'];
        if (Array.isArray(eduDraft?.payload?.educationList)) {
            const oldEdus = await EducationModel.findAll({ where: { employee_id: id }, attributes: ['education_id'], transaction: t });
            const oldEduIds = oldEdus.map(e => e.education_id);
            if (oldEduIds.length) {
                await EducationUpload.destroy({ where: { education_id: oldEduIds }, transaction: t });
                await Certification.destroy({ where: { education_id: oldEduIds }, transaction: t });
            }
            await EducationModel.destroy({ where: { employee_id: id }, transaction: t });
            for (const edu of eduDraft.payload.educationList) {
                const addr = edu.address || {};
                const edRecord = await EducationModel.create({
                    employee_id: id, degree: edu.degree || null,
                    university: edu.university || null, major: edu.major || null,
                    start_date: edu.startDate || null, end_date: edu.endDate || null,
                    street: addr.street || null, city: addr.city || null,
                    state: addr.state || null, zip_code: addr.zipCode || null,
                }, { transaction: t });
                if (edu.docFile && edu.docFile.url) {
                    await EducationUpload.create({
                        education_id: edRecord.education_id,
                        file_name: edu.docFile.filename || edu.docFile.originalName || null,
                        file_url: edu.docFile.url || null,
                    }, { transaction: t });
                }
            }
        }
        if (Array.isArray(eduDraft?.payload?.certList)) {
            for (const cert of eduDraft.payload.certList) {
                const firstEdu = await EducationModel.findOne({ where: { employee_id: id }, transaction: t });
                await Certification.create({
                    education_id: firstEdu ? firstEdu.education_id : null,
                    name: cert.name || null, org: cert.org || null,
                    start_date: cert.startDate || null, end_date: cert.endDate || null,
                    description: cert.description || null,
                    file_name: cert.certFile?.filename || cert.certFile?.originalName || null,
                    file_url: cert.certFile?.url || null,
                }, { transaction: t });
            }
        }

        // --- Evaluations (inside education tab draft) ---
        if (Array.isArray(eduDraft?.payload?.evaluationList)) {
            await Evaluation.destroy({ where: { employee_id: id }, transaction: t });
            for (const ev of eduDraft.payload.evaluationList) {
                await Evaluation.create({
                    employee_id: id,
                    description: ev.description || null,
                    file_name: ev.evalFile?.filename || ev.evalFile?.originalName || null,
                    file_url: ev.evalFile?.url || null,
                }, { transaction: t });
            }
        }

        // --- Work Info (tab: 'profileWork') ---
        const workDraft = draftMap['profileWork'];
        if (workDraft?.payload) {
            const wp = workDraft.payload;
            // Persist employers
            await WorkEmployer.destroy({ where: { employee_id: id }, transaction: t });
            const allEmployers = [
                ...(Array.isArray(wp.presentEmployers) ? wp.presentEmployers.map(e => ({ ...e, type: 'present' })) : []),
                ...(Array.isArray(wp.previousEmployers) ? wp.previousEmployers.map(e => ({ ...e, type: 'previous' })) : []),
            ];
            for (const emp of allEmployers) {
                await WorkEmployer.create({
                    employee_id: id,
                    type: emp.type,
                    name: emp.name || null,
                    designation: emp.designation || null,
                    start_date: emp.startDate || null,
                    end_date: emp.endDate || null,
                    doc_file: emp.docFile || null,
                }, { transaction: t });
            }
            // Persist client/vendor/prime vendor from profileWork summary fields
            await WorkClientDetail.destroy({ where: { employee_id: id }, transaction: t });
            // ProfileWork stores client/vendor/primeVendor as single objects
            if (wp.client && wp.client.name) {
                await WorkClientDetail.create({
                    employee_id: id, type: 'client',
                    name: wp.client.name || null,
                    start_date: wp.client.startDate || null, end_date: wp.client.endDate || null,
                }, { transaction: t });
            }
            if (wp.vendor && wp.vendor.name) {
                await WorkClientDetail.create({
                    employee_id: id, type: 'vendor',
                    name: wp.vendor.name || null,
                    start_date: wp.vendor.startDate || null, end_date: wp.vendor.endDate || null,
                }, { transaction: t });
            }
            if (wp.primeVendor && wp.primeVendor.name) {
                await WorkClientDetail.create({
                    employee_id: id, type: 'primeVendor',
                    name: wp.primeVendor.name || null,
                    start_date: wp.primeVendor.startDate || null, end_date: wp.primeVendor.endDate || null,
                }, { transaction: t });
            }
        }

        // --- Work Client Details (tab: 'workClient') — detailed client/vendor/prime info ---
        const wcDraft = draftMap['workClient'];
        if (wcDraft?.payload) {
            const wc = wcDraft.payload;
            // If workClient draft exists, it has the detailed data — overwrite what profileWork wrote
            await WorkClientDetail.destroy({ where: { employee_id: id }, transaction: t });
            if (Array.isArray(wc.clientInfo)) {
                for (const c of wc.clientInfo) {
                    await WorkClientDetail.create({
                        employee_id: id, type: 'client',
                        name: c.name || null, address: c.address || null,
                        start_date: c.startDate || null, end_date: c.endDate || null,
                        work_email: c.workEmail || null, manager_email: c.managerEmail || null,
                        manager_phone: c.managerPhone || null, remote_work_location: c.remoteWorkLocation || null,
                        doc_file: c.docFile || null,
                    }, { transaction: t });
                }
            }
            if (Array.isArray(wc.vendorInfo)) {
                for (const v of wc.vendorInfo) {
                    await WorkClientDetail.create({
                        employee_id: id, type: 'vendor',
                        name: v.name || null, address: v.address || null,
                        start_date: v.startDate || null, end_date: v.endDate || null,
                        contact_person: v.parentName || null,
                        email: v.email || null, phone: v.phone || null, fein: v.finc || null,
                        doc_file: v.docFile || null,
                    }, { transaction: t });
                }
            }
            if (Array.isArray(wc.primeInfo)) {
                for (const p of wc.primeInfo) {
                    await WorkClientDetail.create({
                        employee_id: id, type: 'primeVendor',
                        name: p.name || null, address: p.address || null,
                        start_date: p.startDate || null, end_date: p.endDate || null,
                        email: p.email || null, phone: p.phone || null,
                        doc_file: p.docFile || null,
                    }, { transaction: t });
                }
            }
            // Persist radio/conditional states as a special metadata record
            if (wc.clientVendorRadio !== undefined || wc.vendorRadios) {
                await WorkClientDetail.create({
                    employee_id: id, type: 'radioStates',
                    name: JSON.stringify({
                        clientVendorRadio: wc.clientVendorRadio,
                        clientPrimeRadio: wc.clientPrimeRadio,
                        clientVendorName: wc.clientVendorName,
                        clientPrimeVendorName: wc.clientPrimeVendorName,
                        vendorRadios: wc.vendorRadios,
                        vendorClientNames: wc.vendorClientNames,
                        vendorPrimeNames: wc.vendorPrimeNames,
                        primeClientNames: wc.primeClientNames,
                        primeVendorNames: wc.primeVendorNames,
                    }),
                }, { transaction: t });
            }
        }

        // --- Onboard Docs (tab: 'onboardDocs') ---
        const obDocsDraft = draftMap['onboardDocs'];
        console.log('[submit] onboardDocs draft found:', !!obDocsDraft, 'has payload:', !!obDocsDraft?.payload);
        if (obDocsDraft?.payload) {
            const ob = obDocsDraft.payload;
            const updateFields = {};
            if (ob.bank) updateFields.bankDetails = ob.bank;
            if (ob.insuranceRows) updateFields.insuranceData = ob.insuranceRows;
            if (ob.files) updateFields.onboardDocsFiles = ob.files;
            console.log('[submit] onboardDocs updateFields keys:', Object.keys(updateFields));
            if (Object.keys(updateFields).length > 0) {
                await Employee.update(updateFields, { where: { employee_id: id }, transaction: t });
            }
        }

        // Delete all drafts for this employee
        await OnboardingDraft.destroy({ where: { employeeId: id }, transaction: t });
        const editWhere = { employeeId: id, status: 'approved' };
        if (sectionKey) editWhere.sectionKey = sectionKey;
        await EditRequest.update({ status: 'used' }, { where: editWhere, transaction: t });

        // Mark the submitted tab and check if all required tabs are done
        const REQUIRED_TABS = ['personal', 'onboardDocs', 'profileWork', 'education', 'skills', 'documents'];
        const submittedTab = req.body?.tab;
        const emp = await Employee.findByPk(id, { transaction: t });
        const currentTabs = emp?.submittedTabs || {};
        const updatedTabs = submittedTab ? { ...currentTabs, [submittedTab]: true } : currentTabs;
        const allDone = REQUIRED_TABS.every(tab => updatedTabs[tab]);
        await Employee.update(
            {
                submittedTabs: updatedTabs,
                ...(allDone ? { onboardingStatus: 'submitted', onboardingSubmittedAt: new Date() } : {}),
            },
            { where: { employee_id: id }, transaction: t }
        );

        await AuditLog.create({ entity: 'Employee', entityId: id, action: 'submitted_onboarding', actorId: req.user.id, payload: { tab: submittedTab } }, { transaction: t });
        await t.commit();
        res.json({ success: true });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

// POST /api/onboarding/:employeeId/request-edit
// Body: { reason, sectionKey }
exports.requestEdit = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    const reason = req.body.reason || '';
    const sectionKey = req.body.sectionKey;
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!sectionKey) return res.status(400).json({ error: 'sectionKey is required' });
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    try {
        // Prevent duplicate pending requests for the same tab
        const existing = await EditRequest.findOne({ where: { employeeId: id, sectionKey, status: 'pending' } });
        if (existing) return res.status(409).json({ error: 'A pending edit request already exists for this section' });

        const reqItem = await EditRequest.create({ employeeId: id, requesterId: req.user.id, sectionKey, reason, status: 'pending' });
        await AuditLog.create({ entity: 'EditRequest', entityId: reqItem.id, action: 'request_edit', actorId: req.user.id, payload: { reason, sectionKey } });
        res.status(201).json({ success: true, request: reqItem });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/onboarding/:employeeId/edit-requests?sectionKey=personal  (admin or self)
exports.listEditRequests = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const where = { employeeId: id };
        if (req.query.sectionKey) where.sectionKey = req.query.sectionKey;
        const requests = await EditRequest.findAll({ where });
        res.json({ requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin approve/reject
exports.approve = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    try {
        await Employee.update({ onboardingStatus: 'approved' }, { where: { employee_id: id } });
        await AuditLog.create({ entity: 'Employee', entityId: id, action: 'approved', actorId: req.user.id, payload: {} });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.reject = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    const reason = req.body.reason || '';
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    try {
        await Employee.update({ onboardingStatus: 'rejected', onboardingRejectedReason: reason }, { where: { employee_id: id } });
        await AuditLog.create({ entity: 'Employee', entityId: id, action: 'rejected', actorId: req.user.id, payload: { reason } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/onboarding/:employeeId/save-draft
// Body: { tab, payload, spouse, kids, documents }
// Each tab gets its own draft row keyed by (employeeId, tab)
exports.saveDraft = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const { payload, spouse, kids, documents, tab } = req.body || {};
        const tabKey = tab || 'personal';
        const data = { payload: payload || {}, spouse: spouse || null, kids: kids || [], documents: documents || [] };
        // Upsert by (employeeId, tab) — each tab has its own draft
        const existing = await OnboardingDraft.findOne({ where: { employeeId: id, tab: tabKey } });
        let stored;
        if (existing) {
            await OnboardingDraft.update({ data }, { where: { id: existing.id } });
            stored = await OnboardingDraft.findOne({ where: { id: existing.id } });
        } else {
            stored = await OnboardingDraft.create({ employeeId: id, tab: tabKey, data });
        }
        await AuditLog.create({ entity: 'OnboardingDraft', entityId: stored.id, action: 'draft_saved', actorId: req.user.id, payload: { tab: tabKey } });
        res.status(200).json({ success: true, draft: stored });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/onboarding/:employeeId/draft?tab=personal
// Returns draft for a specific tab, or all drafts if no tab specified
exports.getDraft = async (req, res) => {
    const id = parseInt(req.params.employeeId, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!isAdmin(req.user) && parseInt(req.user.employeeId, 10) !== id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const tab = req.query.tab;
        if (tab) {
            const draft = await OnboardingDraft.findOne({ where: { employeeId: id, tab } });
            if (!draft) return res.status(404).json({ error: 'Draft not found' });
            return res.json({ draft });
        }
        // Return all drafts for this employee
        const drafts = await OnboardingDraft.findAll({ where: { employeeId: id } });
        if (!drafts.length) return res.status(404).json({ error: 'Draft not found' });
        res.json({ drafts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
