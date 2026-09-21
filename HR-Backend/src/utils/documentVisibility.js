function isAdmin(user) {
  const role = String(user?.accountType || user?.role || '').toLowerCase();
  return ['admin', 'root_admin', 'hr'].includes(role);
}

function employeeUploadedDocument(document, employeeId) {
  const uploadedBy = document?.fileData?.uploadedBy;
  return uploadedBy?.role === 'employee' && String(uploadedBy.employeeId) === String(employeeId);
}

function visibleDocuments(documents, user, employeeId) {
  return isAdmin(user) ? documents : documents.filter(document => employeeUploadedDocument(document, employeeId));
}

module.exports = { isAdmin, employeeUploadedDocument, visibleDocuments };
