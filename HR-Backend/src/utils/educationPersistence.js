const LEVELS = new Set(['masters', 'degree', 'bachelors', 'class12', 'highSchool']);
const hasValue = value => typeof value === 'string' && value.trim().length > 0;

function educationValues(edu, employeeId) {
  const address = edu.address || {};
  return {
    employee_id: employeeId,
    degree: edu.degree || null, university: edu.university || null, major: edu.major || null,
    start_date: edu.startDate || null, end_date: edu.endDate || null,
    street: address.street || null, city: address.city || null,
    state: address.state || null, zip_code: address.zipCode || null,
  };
}

// Called inside the onboarding transaction. Never replace the employee's entire
// education collection: old drafts can omit qualifications and extra attachments.
async function persistEducation({ employeeId, payload, Education, Upload, Certification, transaction }) {
  const options = { transaction };
  const existing = await Education.findAll({
    where: { employee_id: employeeId }, order: [['education_id', 'ASC']], ...options,
  });
  const used = new Set();
  for (const edu of payload.educationList || []) {
    if (!edu || typeof edu !== 'object') continue;
    const values = educationValues(edu, employeeId);
    const level = edu.educationLevel ?? edu.education_level;
    if (level != null && !LEVELS.has(level)) throw new Error('Invalid education level');
    let record = existing.find(row => String(row.education_id) === String(edu.id));
    const populated = Object.entries(values).some(([key, value]) => key !== 'employee_id' && hasValue(value)) || edu.docFile?.url;
    // Empty UI placeholders must never claim an older row with empty text but
    // existing documents, or clear a record omitted by an older draft.
    if (!record && !populated) continue;
    if (!record && level && !edu.legacy) {
      record = existing.find(row => row.education_level === level && !used.has(row.education_id));
    }
    // Older clients used temporary timestamp IDs; identical saved records must
    // not be duplicated when such a draft is resubmitted.
    if (!record && !level) {
      record = existing.find(row => !row.education_level && !used.has(row.education_id) &&
        Object.entries(values).every(([key, value]) => (row[key] ?? null) === value));
    }
    if (record && used.has(record.education_id)) throw new Error('Duplicate education record');
    if (level) values.education_level = level;
    if (record) await record.update(values, options);
    else {
      record = await Education.create(values, options);
      existing.push(record);
    }
    used.add(record.education_id);

    if (Object.prototype.hasOwnProperty.call(edu, 'docFile')) {
      const uploads = await Upload.findAll({
        where: { education_id: record.education_id }, order: [['id', 'ASC']], ...options,
      });
      const selected = Object.prototype.hasOwnProperty.call(edu, 'primaryUploadId')
        ? uploads.find(upload => upload.id === edu.primaryUploadId)
        : uploads.find(upload => upload.id === edu.docFile?.id) || uploads[0];
      const current = selected || (edu.docFile?.url && uploads.find(upload => upload.file_url === edu.docFile.url));
      if (edu.docFile?.url) {
        const file = { file_name: edu.docFile.filename || edu.docFile.originalName || null, file_url: edu.docFile.url };
        if (current) await current.update(file, options);
        else await Upload.create({ education_id: record.education_id, ...file }, options);
      } else if (current) {
        // Only the document represented by the single upload control is removed.
        await current.destroy(options);
      }
    }
  }

  if (Array.isArray(payload.certList)) {
    const educationIds = existing.map(row => row.education_id);
    const certificates = educationIds.length ? await Certification.findAll({
      where: { education_id: educationIds }, ...options,
    }) : [];
    const retained = new Set();
    for (const cert of payload.certList) {
      if (!cert || typeof cert !== 'object') continue;
      const values = {
        name: cert.name || null, org: cert.org || null,
        start_date: cert.startDate || null, end_date: cert.endDate || null,
        description: cert.description || null,
        file_name: cert.certFile?.filename || cert.certFile?.originalName || null,
        file_url: cert.certFile?.url || null,
      };
      let record = certificates.find(row => String(row.certification_id) === String(cert.id));
      if (!record) record = certificates.find(row => !retained.has(row.certification_id) &&
        Object.entries(values).every(([key, value]) => (row[key] ?? null) === value));
      if (!record && !Object.values(values).some(hasValue)) continue;
      if (record) await record.update(values, options);
      else if (educationIds.length) record = await Certification.create({ education_id: educationIds[0], ...values }, options);
      if (record) retained.add(record.certification_id);
    }
    // Explicit removals avoid dropping certificates absent from older drafts.
    for (const record of certificates) {
      if ((payload.deletedCertificationIds || []).some(id => String(id) === String(record.certification_id))) {
        await record.destroy(options);
      }
    }
  }
}

module.exports = { persistEducation };
