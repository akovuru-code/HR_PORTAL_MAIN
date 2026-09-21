function isAdminUploadedFile(value) {
  const role = String(value?.uploadedBy?.role || '').toLowerCase();
  return ['admin', 'root_admin', 'hr'].includes(role);
}

function hideAdminUploadedFiles(value) {
  if (Array.isArray(value)) return value.map(hideAdminUploadedFiles);
  if (!value || typeof value !== 'object') return value;
  if (isAdminUploadedFile(value)) return null;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, hideAdminUploadedFiles(child)]));
}

module.exports = { isAdminUploadedFile, hideAdminUploadedFiles };
