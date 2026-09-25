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
const { collectWorkClientDrafts, buildWorkClientRows } = require('../utils/workClientPersistence');
const { persistEducation } = require('../utils/educationPersistence');
const { visibleDocumentFiles, protectAdminDocumentFiles, preserveAdminDocuments, mapDraftDocuments } = require('../utils/workClientDocumentVisibility');
const { hideAdminUploadedFiles } = require('../utils/onboardingFileVisibility');
const { employeeUploadedDocument } = require('../utils/documentVisibility');
const { promoteStagedWorkInfoDrafts, rollbackPromotions } = require('../utils/workInfoDocumentLifecycle');
const { assertVarcharLengths, logVarcharLengthError, storageLengthResponse } = require('../utils/varcharLengthValidation');

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
    const role = String(user?.accountType || user?.role || '').toLowerCase();
    return ['admin', 'root_admin', 'hr'].includes(role);
}

function isRecruitingAdmin(user) {
    return String(user?.accountType || user?.role || '').toLowerCase() === 'admin' &&
        String(user?.adminRole || user?.admin_role || '').toLowerCase() === 'recruitment';
}

function hideWorkInfoDocuments(value) {
    if (Array.isArray(value)) return value.map(hideWorkInfoDocuments);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        /^(docFile|docFiles)$/i.test(key) ? null : hideWorkInfoDocuments(item),
    ]));
}

function isWorkInfoDocument(document) {
    return /^(work_|present_employer_|previous_employer_)/i.test(String(document?.document_type || ''));
}

function isSubmittedTab(value) {
    return value === true || (value && typeof value === 'object' && value.submitted === true);
}

function workClientDocumentKey(row, fallbackIndexes) {
    const meta = row.meta || {};
    const base = `${row.type}|${meta.employerType || 'standalone'}|${meta.employerIndex ?? -1}`;
    const detailIndex = meta.detailIndex ?? fallbackIndexes.get(base) ?? 0;
    fallbackIndexes.set(base, Number(detailIndex) + 1);
    return `${base}|${detailIndex}`;
}

function canManageVendorsFromWorkInfo(user) {
    const accountType = String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
    if (accountType === 'root_admin') return true;
    const isHrAdmin = accountType === 'admin' && String(user?.adminRole || user?.admin_role || '').toLowerCase() === 'hr';
    return isAdmin(user) && !isHrAdmin && Array.isArray(user?.permissions) && user.permissions.includes('operations:manage');
}

function normalizeWorkClientName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function workInfoAuditActor(user) {
    const email = String(user?.email || '').trim();
    if (!email) return 'Unknown User';
    const employee = await Employee.findOne({ where: { email }, attributes: ['name', 'firstName', 'lastName'] });
    const fullName = [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim();
    return fullName || employee?.name || email;
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
        const visibleWorkClientDetails = isAdmin(req.user) && !isRecruitingAdmin(req.user) ? workClientDetails : workClientDetails.map(row => ({
            ...row.toJSON(),
            doc_file: isRecruitingAdmin(req.user) ? null : visibleDocumentFiles(row.doc_file, req.user, id),
        }));
        if (isAdmin(req.user)) {
            const employeeForViewer = isRecruitingAdmin(req.user) && employee
                ? { ...employee.toJSON(), Documents: (employee.Documents || []).filter(document => !isWorkInfoDocument(document)) }
                : employee;
            const draftsForViewer = isRecruitingAdmin(req.user)
                ? Object.fromEntries(Object.entries(draftMap).map(([tab, draft]) => [tab, /^(profileWork|workClient)(?:-|$)/.test(tab) ? { ...draft.toJSON(), data: hideWorkInfoDocuments(draft.data) } : draft]))
                : draftMap;
            const workEmployersForViewer = isRecruitingAdmin(req.user)
                ? workEmployers.map(row => ({ ...row.toJSON(), doc_file: null }))
                : workEmployers;
            return res.json({ employee: employeeForViewer, draft: draftsForViewer.personal || null, drafts: draftsForViewer, roleSections, educations, evaluations, workEmployers: workEmployersForViewer, workClientDetails: visibleWorkClientDetails });
        }
        const visibleEmployee = employee ? employee.toJSON() : employee;
        if (visibleEmployee?.Documents) {
            visibleEmployee.Documents = visibleEmployee.Documents.filter(document => employeeUploadedDocument(document, id));
        }
        const visibleDraftMap = Object.fromEntries(Object.entries(draftMap).map(([tab, draft]) => [
            tab,
            { ...draft.toJSON(), data: hideAdminUploadedFiles(draft.data) },
        ]));
        res.json({
            employee: hideAdminUploadedFiles(visibleEmployee),
            draft: visibleDraftMap.personal || null,
            drafts: visibleDraftMap,
            roleSections: hideAdminUploadedFiles(roleSections.map(row => row.toJSON())),
            educations: hideAdminUploadedFiles(educations.map(row => row.toJSON())),
            evaluations: hideAdminUploadedFiles(evaluations.map(row => row.toJSON())),
            workEmployers: hideAdminUploadedFiles(workEmployers.map(row => row.toJSON())),
            workClientDetails: hideAdminUploadedFiles(visibleWorkClientDetails),
        });
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
                passportFile2: spouse.passportFile2 || null,
                visaFile: spouse.visaFile || null,
                visaFile2: spouse.visaFile2 || null,
                dlFile: spouse.dlFile || null,
                i9File: spouse.i9File || null,
                w4File: spouse.w4File || null,
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
                    passportFile: k.passportFile || null,
                    passportFile2: k.passportFile2 || null,
                    docFile: k.docFile || null,
                    docFile2: k.docFile2 || null,
                    i9File: k.i9File || null,
                    w4File: k.w4File || null,
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
    let promotedMoves = [];
    try {
        const sectionKey = req.body.sectionKey; // optional: mark only this tab's request as used
        const submittedTab = req.body?.tab;
        const includeOnboardDocs = submittedTab === 'personal' && req.body?.includeOnboardDocs === true;
        // A submission must persist only its own tab.  Re-saving every draft
        // made a valid Skills submit fail because of unrelated stale data from
        // Personal, Work Info, Education, or Onboard Docs.
        const shouldPersistTab = tab => !submittedTab || submittedTab === tab || (tab === 'onboardDocs' && includeOnboardDocs);

        // Load all per-tab drafts for this employee
        const allDrafts = await OnboardingDraft.findAll({ where: { employeeId: id }, transaction: t });
        let draftMap = {};
        for (const d of allDrafts) draftMap[d.tab] = d.data;

        // Work Info documents remain staged until the employee actually submits
        // this tab. Saving a draft (or an admin viewing/saving a record) never
        // creates final Document rows or commits the file into the Documents tab.
        if (submittedTab === 'profileWork' && !isAdmin(req.user)) {
            const promotion = promoteStagedWorkInfoDrafts(draftMap, id);
            draftMap = promotion.draftMap;
            promotedMoves = promotion.moves;
            for (const draft of allDrafts) {
                if (/^(profileWork|workClient)(?:-|$)/.test(draft.tab)) {
                    await draft.update({ data: draftMap[draft.tab] }, { transaction: t });
                }
            }
            for (const file of promotion.promoted) {
                const documentType = file.category || 'work_info_document';
                const values = {
                    employee_id: id,
                    name: file.documentName || file.originalName || file.filename,
                    url: file.url,
                    filename: file.filename,
                    originalName: file.originalName || file.filename,
                    document_type: documentType,
                    fileData: file,
                };
                const existing = await Document.findOne({ where: { employee_id: id, url: file.url }, transaction: t });
                if (existing) await existing.update(values, { transaction: t });
                else await Document.create(values, { transaction: t });
            }
        }

        // --- Personal Info (tab: 'personal') ---
        const personal = shouldPersistTab('personal') ? draftMap['personal'] : null;
        if (personal?.payload) {
            const employeeFields = Object.keys(Employee.rawAttributes);
            const filtered = {};
            for (const [key, val] of Object.entries(personal.payload)) {
                if (employeeFields.includes(key)) filtered[key] = val;
            }
            assertVarcharLengths(Employee, filtered);
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
                passportFile: s.passportFile || null,
                passportFile2: s.passportFile2 || null,
                visaFile: s.visaFile || null,
                visaFile2: s.visaFile2 || null,
                dlFile: s.dlFile || null,
                i9File: s.i9File || null,
                w4File: s.w4File || null,
            };
            assertVarcharLengths(Spouse, spouseData);
            const [inst] = await Spouse.findOrCreate({ where: { employee_id: id }, defaults: spouseData, transaction: t });
            await inst.update(spouseData, { transaction: t });
        }
        if (Array.isArray(personal?.kids)) {
            // Keep existing child IDs stable. Insurance rows may reference a
            // child, so replacing every row on each submit breaks that link.
            const existingKids = await Kid.findAll({ where: { employee_id: id }, transaction: t });
            const existingById = new Map(existingKids.map(kid => [kid.kid_id, kid]));
            const retainedIds = new Set();
            for (const k of personal.kids) {
                const kidData = {
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
                    address: k.address || null,
                    passportFile: k.passportFile || null,
                    passportFile2: k.passportFile2 || null,
                    docFile: k.docFile || null,
                    docFile2: k.docFile2 || null,
                    i9File: k.i9File || null,
                    w4File: k.w4File || null,
                };
                assertVarcharLengths(Kid, kidData);
                const kidId = Number(k.kidId || k.kid_id);
                // Older retained drafts predate kid IDs. Match those once by
                // their existing identifying details, then persist the ID.
                const existingKid = existingById.get(kidId) || (!kidId && existingKids.find(candidate => (
                    !retainedIds.has(candidate.kid_id)
                    && (candidate.first_name || '') === (kidData.first_name || '')
                    && (candidate.last_name || '') === (kidData.last_name || '')
                    && String(candidate.dob || '') === String(kidData.dob || '')
                )));
                if (existingKid) {
                    await existingKid.update(kidData, { transaction: t });
                    retainedIds.add(existingKid.kid_id);
                    k.kid_id = existingKid.kid_id;
                    k.kidId = existingKid.kid_id;
                } else {
                    const createdKid = await Kid.create(kidData, { transaction: t });
                    retainedIds.add(createdKid.kid_id);
                    // Keep the generated ID in the retained personal draft so
                    // a later Request Modify updates this same child record.
                    k.kid_id = createdKid.kid_id;
                    k.kidId = createdKid.kid_id;
                }
            }
            const removedIds = existingKids.map(kid => kid.kid_id).filter(kidId => !retainedIds.has(kidId));
            if (removedIds.length) await Kid.destroy({ where: { employee_id: id, kid_id: removedIds }, transaction: t });
            const personalDraftRow = allDrafts.find(draft => draft.tab === 'personal');
            if (personalDraftRow) await personalDraftRow.update({ data: personal }, { transaction: t });
        }

        // --- Documents (tab: 'documents') ---
        // Documents are registered by their originating tab using a stable
        // document_type. Do not replace the employee's whole document set here:
        // this draft also displays Personal and Work Info documents, and deleting
        // them loses their persisted file associations.

        // --- Resume & Skills (tab: 'skills') ---
        const skillsDraft = shouldPersistTab('skills') ? draftMap['skills'] : null;
        if (Array.isArray(skillsDraft?.payload?.roleSections)) {
            const oldSections = await RoleSection.findAll({ where: { employee_id: id }, attributes: ['role_section_id'], transaction: t });
            const oldIds = oldSections.map(s => s.role_section_id);
            if (oldIds.length) {
                await ResumeUpload.destroy({ where: { role_section_id: oldIds }, transaction: t });
                await CvUpload.destroy({ where: { role_section_id: oldIds }, transaction: t });
            }
            await RoleSection.destroy({ where: { employee_id: id }, transaction: t });
            for (const section of skillsDraft.payload.roleSections) {
                const roleValues = {
                    employee_id: id, role: section.role || '',
                    description: section.description || null, skills: section.skills || null,
                };
                assertVarcharLengths(RoleSection, roleValues);
                const rs = await RoleSection.create(roleValues, { transaction: t });
                const resumeFile = section.resumeFile || (Array.isArray(section.resumeFiles) && section.resumeFiles[0]) || null;
                if (resumeFile) {
                    const resumeValues = {
                        role_section_id: rs.role_section_id,
                        file_name: resumeFile.filename || resumeFile.originalName || resumeFile.name || null,
                        file_type: resumeFile.category || resumeFile.type || null,
                        file_size: resumeFile.size || null, file_url: resumeFile.url || null,
                    };
                    assertVarcharLengths(ResumeUpload, resumeValues);
                    await ResumeUpload.create(resumeValues, { transaction: t });
                }
                const cvFile = section.cvFile || (Array.isArray(section.cvFiles) && section.cvFiles[0]) || null;
                if (cvFile) {
                    const cvValues = {
                        role_section_id: rs.role_section_id,
                        file_name: cvFile.filename || cvFile.originalName || cvFile.name || null,
                        file_type: cvFile.category || cvFile.type || null,
                        file_size: cvFile.size || null, file_url: cvFile.url || null,
                    };
                    assertVarcharLengths(CvUpload, cvValues);
                    await CvUpload.create(cvValues, { transaction: t });
                }
            }
        }

        // --- Education (tab: 'education') ---
        const eduDraft = shouldPersistTab('education') ? draftMap['education'] : null;
        if (Array.isArray(eduDraft?.payload?.educationList) || Array.isArray(eduDraft?.payload?.certList)) {
            await persistEducation({ employeeId: id, payload: eduDraft.payload,
                Education: EducationModel, Upload: EducationUpload, Certification, transaction: t });
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
        const workDraft = shouldPersistTab('profileWork') ? draftMap['profileWork'] : null;
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
                    client: emp.client || null,
                    vendor: emp.vendor || null,
                    primeVendor: emp.primeVendor || null,
                    client_name: emp.client?.name || null,
                    client_start_date: emp.client?.startDate || null,
                    client_end_date: emp.client?.endDate || null,
                    vendor_name: emp.vendor?.name || null,
                    vendor_start_date: emp.vendor?.startDate || null,
                    vendor_end_date: emp.vendor?.endDate || null,
                    prime_vendor_name: emp.primeVendor?.name || null,
                    prime_vendor_start_date: emp.primeVendor?.startDate || null,
                    prime_vendor_end_date: emp.primeVendor?.endDate || null,
                }, { transaction: t });
            }
        }

        // --- Work Client Details ---
        // Detailed forms use one isolated draft per employer. The legacy
        // standalone form continues to use the exact "workClient" tab.
        const workClientDrafts = shouldPersistTab('profileWork') ? collectWorkClientDrafts(draftMap, workDraft) : [];

        if (workDraft?.payload || workClientDrafts.length > 0) {
            const existingWorkClientDetails = await WorkClientDetail.findAll({
                where: { employee_id: id }, order: [['id', 'ASC']], transaction: t,
            });
            const actor = await workInfoAuditActor(req.user);
            const vendorManager = canManageVendorsFromWorkInfo(req.user);
            const currentSource = isAdmin(req.user)
                ? (vendorManager ? 'admin_work_info' : 'admin_work_info_readonly')
                : 'employee_work_info';
            const workClientRows = buildWorkClientRows(workClientDrafts, id, { source: currentSource, actor });
            const existingDocs = new Map();
            const existingMeta = new Map();
            const oldIndexes = new Map();
            for (const detail of existingWorkClientDetails) {
                if (!['client', 'vendor', 'primeVendor', 'radioStates'].includes(detail.type)) continue;
                const key = workClientDocumentKey(detail, oldIndexes);
                if (detail.type !== 'radioStates') existingDocs.set(key, detail.doc_file);
                existingMeta.set(key, detail.meta || {});
            }
            const newIndexes = new Map();
            const existingMasters = await WorkClientDetail.findAll({ where: { employee_id: null, type: 'vendor' }, transaction: t });
            const mastersByName = new Map(existingMasters.map(master => [normalizeWorkClientName(master.name), master]));
            if (!isAdmin(req.user)) {
                for (const row of workClientRows) {
                    if (!['client', 'vendor', 'primeVendor'].includes(row.type)) continue;
                    row.doc_file = protectAdminDocumentFiles(existingDocs.get(workClientDocumentKey(row, newIndexes)), row.doc_file);
                }
            } else {
                for (const row of workClientRows) {
                    const key = workClientDocumentKey(row, newIndexes);
                    const previous = existingMeta.get(key);
                    if (previous?.source) {
                        // An admin editing employee-originated Work Info must
                        // not silently promote it into an admin-managed vendor.
                        row.meta = { ...row.meta, ...previous, updatedBy: actor };
                        continue;
                    }
                    if (previous) {
                        // Legacy rows have no trustworthy ownership evidence.
                        // Preserve their protected status instead of guessing.
                        row.meta = { ...row.meta, ...previous, source: 'legacy_work_info', updatedBy: actor };
                        continue;
                    }
                    if (!vendorManager || row.type !== 'vendor' || !normalizeWorkClientName(row.name)) continue;

                    const nameKey = normalizeWorkClientName(row.name);
                    let master = mastersByName.get(nameKey);
                    if (!master) {
                        master = await WorkClientDetail.create({
                            employee_id: null,
                            type: 'vendor',
                            name: row.name,
                            address: row.address || null,
                            start_date: row.start_date || null,
                            end_date: row.end_date || null,
                            phone: row.phone || null,
                            email: row.email || null,
                            contact_person: row.contact_person || null,
                            fein: row.fein || null,
                            meta: {
                                source: 'admin_work_info',
                                status: 'Active',
                                comment: '',
                                members: 0,
                                createdBy: actor,
                                updatedBy: actor,
                                vendor: { enabled: false, name: '', startDate: '', endDate: '' },
                                primeVendor: { enabled: false, name: '', startDate: '', endDate: '' },
                                client: { enabled: false, name: '', startDate: '', endDate: '' },
                                billingContactName: '', billingEmail: '', billingAddress: '',
                                billingAddressSameAsVendorAddress: false, paymentTerms: 'Net 30', currency: 'USD',
                            },
                        }, { transaction: t });
                        mastersByName.set(nameKey, master);
                    }
                    row.meta = { ...row.meta, source: 'admin_work_info', assignedByAdmin: true, vendorMasterId: master.id, createdBy: actor, updatedBy: actor };
                }
            }
            await WorkClientDetail.destroy({ where: { employee_id: id }, transaction: t });
            for (const row of workClientRows) {
                await WorkClientDetail.create(row, { transaction: t });
            }
        }

        // --- Onboard Docs (tab: 'onboardDocs') ---
        const obDocsDraft = shouldPersistTab('onboardDocs') ? draftMap['onboardDocs'] : null;
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
            if (ob.spouseDocs) {
                const [spouse] = await Spouse.findOrCreate({
                    where: { employee_id: id },
                    defaults: { employee_id: id },
                    transaction: t,
                });
                await spouse.update({
                    i9File: ob.spouseDocs.i9File || null,
                    w4File: ob.spouseDocs.w4File || null,
                }, { transaction: t });
            }
            if (Array.isArray(ob.kidDocs)) {
                const kids = await Kid.findAll({
                    where: { employee_id: id },
                    order: [['kid_id', 'ASC']],
                    transaction: t,
                });
                for (const [index, kidDocs] of ob.kidDocs.entries()) {
                    if (!kids[index]) continue;
                    await kids[index].update({
                        i9File: kidDocs.i9File || null,
                        w4File: kidDocs.w4File || null,
                    }, { transaction: t });
                }
            }
        }

        // Keep per-tab drafts after submission.  The employee portal uses them
        // to faithfully hydrate submitted onboarding forms after a refresh.
        // They are upserted on later edits, so retaining them does not create
        // duplicate records or change the submitted/approval workflow.
        const editWhere = { employeeId: id, status: 'approved' };
        if (sectionKey) editWhere.sectionKey = sectionKey;
        await EditRequest.update({ status: 'used' }, { where: editWhere, transaction: t });

        // Mark the submitted tab and check if all required tabs are done
        const REQUIRED_TABS = ['personal', 'onboardDocs', 'profileWork', 'education', 'skills', 'documents'];
        // Personal Info now owns the embedded Onboard Docs workflow. Preserve
        // the legacy onboardDocs completion flag for existing completion and
        // reporting logic, while keeping a single employee-facing submission.
        let submittedTabsForRequest = includeOnboardDocs
            ? ['personal', 'onboardDocs']
            : submittedTab ? [submittedTab] : [];
        // Admin saves must never lock an employee's Work Info fields. Employee
        // submission is the single event that marks this tab read-only.
        if (isAdmin(req.user) && submittedTab === 'profileWork') submittedTabsForRequest = [];
        const emp = await Employee.findByPk(id, { transaction: t });
        const currentTabs = emp?.submittedTabs || {};
        const updatedTabs = submittedTabsForRequest.length
            ? submittedTabsForRequest.reduce((tabs, tab) => ({
                ...tabs,
                [tab]: { submitted: true, submittedBy: isAdmin(req.user) ? 'admin' : 'employee' },
            }), { ...currentTabs })
            : currentTabs;
        const allDone = REQUIRED_TABS.every(tab => isSubmittedTab(updatedTabs[tab]));
        await Employee.update(
            {
                submittedTabs: updatedTabs,
                ...(allDone ? { onboardingStatus: 'submitted', onboardingSubmittedAt: new Date() } : {}),
            },
            { where: { employee_id: id }, transaction: t }
        );

        await AuditLog.create({ entity: 'Employee', entityId: id, action: 'submitted_onboarding', actorId: req.user.id, payload: { tab: submittedTab, includedTabs: submittedTabsForRequest } }, { transaction: t });
        await t.commit();
        res.json({ success: true });
    } catch (err) {
        await t.rollback();
        rollbackPromotions(promotedMoves);
        if (logVarcharLengthError(err, 'onboarding.submitOnboarding')) {
            return res.status(422).json(storageLengthResponse(err));
        }
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
        let data = { payload: payload || {}, spouse: spouse || null, kids: kids || [], documents: documents || [] };
        // Upsert by (employeeId, tab) — each tab has its own draft
        const existing = await OnboardingDraft.findOne({ where: { employeeId: id, tab: tabKey } });
        let stored;
        if (!isAdmin(req.user) && /^workClient(?:-|$)/.test(tabKey)) {
            data = preserveAdminDocuments(existing?.data, data);
        }
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
            if (!isAdmin(req.user)) {
                const data = /^workClient(?:-|$)/.test(tab)
                    ? mapDraftDocuments(draft.data, value => visibleDocumentFiles(value, req.user, id))
                    : draft.data;
                return res.json({ draft: { ...draft.toJSON(), data: hideAdminUploadedFiles(data) } });
            }
            return res.json({ draft: isRecruitingAdmin(req.user) && /^(profileWork|workClient)(?:-|$)/.test(tab) ? { ...draft.toJSON(), data: hideWorkInfoDocuments(draft.data) } : draft });
        }
        // Return all drafts for this employee
        const drafts = await OnboardingDraft.findAll({ where: { employeeId: id } });
        if (!drafts.length) return res.status(404).json({ error: 'Draft not found' });
        res.json({ drafts: isRecruitingAdmin(req.user) ? drafts.map(draft => /^(profileWork|workClient)(?:-|$)/.test(draft.tab) ? { ...draft.toJSON(), data: hideWorkInfoDocuments(draft.data) } : draft) : !isAdmin(req.user) ? drafts.map(draft => {
            const data = /^workClient(?:-|$)/.test(draft.tab)
                ? mapDraftDocuments(draft.data, value => visibleDocumentFiles(value, req.user, id))
                : draft.data;
            return { ...draft.toJSON(), data: hideAdminUploadedFiles(data) };
        }) : drafts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
