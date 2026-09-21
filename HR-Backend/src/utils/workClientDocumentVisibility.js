function isAdminUploader(user) {
  return ['admin', 'root_admin', 'hr'].includes(String(user?.accountType || user?.role || '').toLowerCase());
}

function normalizeDocumentFiles(value) {
  if (!value) return { employee: null, admin: null };
  if (Object.prototype.hasOwnProperty.call(value, 'employee') || Object.prototype.hasOwnProperty.call(value, 'admin')) {
    return { employee: value.employee || null, admin: value.admin || null };
  }
  // Older records did not retain uploader identity. Keep them admin-only.
  return { employee: null, admin: value };
}

function visibleDocumentFiles(value, user, employeeId) {
  const files = normalizeDocumentFiles(value);
  if (isAdminUploader(user)) return files;
  const employeeFile = files.employee;
  const ownFile = employeeFile?.uploadedBy?.role === 'employee' &&
    String(employeeFile.uploadedBy.employeeId) === String(employeeId) ? employeeFile : null;
  return { employee: ownFile, admin: null };
}

function protectAdminDocumentFiles(existingValue, nextValue) {
  const existing = normalizeDocumentFiles(existingValue);
  const next = normalizeDocumentFiles(nextValue);
  return { employee: next.employee, admin: next.admin || existing.admin };
}

function mapDraftDocuments(data, mapper) {
  const next = JSON.parse(JSON.stringify(data || {}));
  const payload = next.payload || {};
  for (const key of ['clientInfo', 'vendorInfo', 'primeInfo']) {
    if (!Array.isArray(payload[key])) continue;
    payload[key] = payload[key].map((item, index) => ({
      ...item,
      docFiles: mapper(item.docFiles || item.docFile, key, index),
      docFile: undefined,
    }));
  }
  return next;
}

function preserveAdminDocuments(existingData, nextData) {
  const existing = existingData?.payload || {};
  return mapDraftDocuments(nextData, (nextFiles, key, index) => ({
    employee: normalizeDocumentFiles(nextFiles).employee,
    admin: normalizeDocumentFiles(existing[key]?.[index]?.docFiles || existing[key]?.[index]?.docFile).admin,
  }));
}

module.exports = {
  isAdminUploader, normalizeDocumentFiles, visibleDocumentFiles,
  protectAdminDocumentFiles, mapDraftDocuments, preserveAdminDocuments,
};
