const { employeeUploadedDocument, visibleDocuments } = require('../src/utils/documentVisibility');

const employeeDocument = {
  document_id: 1,
  fileData: { uploadedBy: { role: 'employee', employeeId: 8 } },
};
const adminDocument = {
  document_id: 2,
  fileData: { uploadedBy: { role: 'admin', employeeId: null } },
};

test('identifies only the employee upload for that employee', () => {
  expect(employeeUploadedDocument(employeeDocument, 8)).toBe(true);
  expect(employeeUploadedDocument(employeeDocument, 9)).toBe(false);
  expect(employeeUploadedDocument(adminDocument, 8)).toBe(false);
});

test('hides admin uploads from employees while retaining them for admins', () => {
  expect(visibleDocuments([employeeDocument, adminDocument], { role: 'employee' }, 8))
    .toEqual([employeeDocument]);
  expect(visibleDocuments([employeeDocument, adminDocument], { role: 'admin' }, 8))
    .toEqual([employeeDocument, adminDocument]);
});
