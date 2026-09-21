const {
  visibleDocumentFiles,
  preserveAdminDocuments,
  protectAdminDocumentFiles,
} = require('../src/utils/workClientDocumentVisibility');

const employee = { id: 10, employeeId: 42, accountType: 'employee' };
const admin = { id: 1, accountType: 'admin' };
const employeeFile = { url: '/employee.pdf', uploadedBy: { role: 'employee', employeeId: 42 } };
const otherEmployeeFile = { url: '/other.pdf', uploadedBy: { role: 'employee', employeeId: 99 } };
const adminFile = { url: '/admin.pdf', uploadedBy: { role: 'admin', userId: 1 } };

test('employees receive only their own employer document', () => {
  expect(visibleDocumentFiles({ employee: employeeFile, admin: adminFile }, employee, 42))
    .toEqual({ employee: employeeFile, admin: null });
  expect(visibleDocumentFiles({ employee: otherEmployeeFile, admin: adminFile }, employee, 42))
    .toEqual({ employee: null, admin: null });
});

test('admins retain visibility of both employee and admin employer documents', () => {
  expect(visibleDocumentFiles({ employee: employeeFile, admin: adminFile }, admin, 42))
    .toEqual({ employee: employeeFile, admin: adminFile });
});

test('employee draft saves preserve an existing admin document', () => {
  const existing = { payload: { vendorInfo: [{ docFiles: { employee: null, admin: adminFile } }] } };
  const next = { payload: { vendorInfo: [{ docFiles: { employee: employeeFile, admin: adminFile } }] } };
  expect(preserveAdminDocuments(existing, next).payload.vendorInfo[0].docFiles)
    .toEqual({ employee: employeeFile, admin: adminFile });
});

test('submission merges an older admin document with an employee document', () => {
  expect(protectAdminDocumentFiles({ employee: null, admin: adminFile }, { employee: employeeFile, admin: null }))
    .toEqual({ employee: employeeFile, admin: adminFile });
});

test('an admin document can be intentionally removed without affecting the employee document', () => {
  const next = { employee: employeeFile, admin: null };
  expect(next).toEqual({ employee: employeeFile, admin: null });
});
